// integrations/whatsapp/service.ts
import mongoose from 'mongoose'
import {
  transition,
  getLegalEvents,
  LOCKED_STATES,
  WAState,
  WAEvent,
  IllegalTransitionError,
} from './fsm.js'
import { WhatsAppIntegration } from '../../models/WhatsAppIntegration.js'
import { Brokerage } from '../../models/Brokerage.js'
import { getRedisClient } from '../../config/redis.js'
import { encrypt, decrypt } from '../../utils/cryptoHelper.js'
import { logger } from '../../utils/logger.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { recordDbMetric } from '../../utils/cacheHelper.js'
import {
  CodeReceivedPayload,
  FlowCancelledPayload,
  FlowErrorReportedPayload,
  WhatsAppIntegrationStatusDto,
  MetaOAuthTokenResponse,
  MetaSubscribedAppsResponse,
  MetaPhoneRegisterResponse,
} from './types.js'

// In-memory fallback mutex locks (DI-003: Redis read/write must not be a single point of failure)
const inMemoryLocks = new Map<string, number>()

/**
 * Concurrency guard using Redis key with 15s TTL.
 * If acquisition fails, rejects with 409 Conflict.
 */
export async function withLock<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const key = `waintegration:lock:${tenantId}`
  const redis = getRedisClient()
  let acquired = false
  let isRedisLock = false

  if (redis) {
    try {
      const res = await redis.set(key, '1', 'PX', 15000, 'NX')
      acquired = res === 'OK'
      isRedisLock = true
    } catch (err: any) {
      logger.warn(`Redis lock acquisition error (${err.message}). Falling back to in-memory lock.`)
      // Fallback to in-memory
      const now = Date.now()
      const expiry = inMemoryLocks.get(key)
      if (!expiry || expiry < now) {
        inMemoryLocks.set(key, now + 15000)
        acquired = true
        isRedisLock = false
      }
    }
  } else {
    // In-memory mutex fallback
    const now = Date.now()
    const expiry = inMemoryLocks.get(key)
    if (!expiry || expiry < now) {
      inMemoryLocks.set(key, now + 15000)
      acquired = true
      isRedisLock = false
    }
  }

  if (!acquired) {
    logger.warn(`WhatsApp integration lock contention for tenant ${tenantId}`)
    throw new AppError('Integration busy, try again shortly', HTTP_STATUS.CONFLICT)
  }

  try {
    return await fn()
  } finally {
    if (isRedisLock && redis) {
      try {
        await redis.del(key)
      } catch (err: any) {
        logger.warn(`Failed to release Redis lock for ${key}: ${err.message}`)
      }
    }
    inMemoryLocks.delete(key)
  }
}

/**
 * Checks if tenant is currently locked.
 */
export async function isTenantLocked(tenantId: string): Promise<boolean> {
  const key = `waintegration:lock:${tenantId}`
  const redis = getRedisClient()
  if (redis) {
    try {
      const val = await redis.get(key)
      if (val === '1') return true
    } catch {
      // Fall through to in-memory check
    }
  }
  const expiry = inMemoryLocks.get(key)
  return Boolean(expiry && expiry > Date.now())
}

/**
 * Normalizes and validates tenant ObjectId (DI-001)
 */
export function toTenantObjectId(tenantId: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
  if (tenantId instanceof mongoose.Types.ObjectId) return tenantId
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw new AppError(`Invalid tenant ID format: ${tenantId}`, HTTP_STATUS.BAD_REQUEST)
  }
  return new mongoose.Types.ObjectId(tenantId)
}

/**
 * Applies an event to the tenant's WhatsApp state machine, enforcing locking and atomic updates.
 */
export async function applyEvent(
  tenantId: string | mongoose.Types.ObjectId,
  event: WAEvent,
  payload?: Record<string, unknown>,
  updates?: Record<string, any>
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  const tenantIdStr = targetTenantId.toString()

  // 1. Fetch current status
  const startDb = process.hrtime.bigint()
  const doc = await WhatsAppIntegration.findOne({ tenantId: targetTenantId })
    .select('+businessTokenEncrypted')
    .lean()
  recordDbMetric('WhatsAppIntegration.findOne', startDb, 10)

  const current: WAState = doc?.status ?? 'NOT_CONNECTED'

  // 2. Validate transition against strict state machine
  const next = transition(tenantIdStr, current, event)

  const requiresLock = LOCKED_STATES.has(next) || LOCKED_STATES.has(current)
  const runWithLockIfNeeded = requiresLock
    ? withLock
    : (_id: string, fn: () => Promise<WAState>) => fn()

  return runWithLockIfNeeded(tenantIdStr, async () => {
    const updatePayload: Record<string, any> = {
      status: next,
      updatedAt: new Date(),
      ...(updates || {}),
    }

    const startUpdate = process.hrtime.bigint()
    await WhatsAppIntegration.findOneAndUpdate(
      { tenantId: targetTenantId },
      {
        $set: updatePayload,
        $push: {
          history: {
            state: next,
            event,
            at: new Date(),
            meta: payload ?? {},
          },
        },
      },
      { upsert: true, new: true }
    )
    recordDbMetric('WhatsAppIntegration.findOneAndUpdate', startUpdate, 10)

    // Synchronize Brokerage status for backwards compatibility
    try {
      if (next === 'ACTIVE') {
        await Brokerage.findByIdAndUpdate(targetTenantId, {
          'whatsappConfig.status': 'connected',
          ...(updates?.phoneNumberId ? { 'whatsappConfig.phoneNumberId': updates.phoneNumberId } : {}),
          ...(updates?.wabaId ? { 'whatsappConfig.wabaId': updates.wabaId } : {}),
        })
      } else if (next === 'DISCONNECTED' || next === 'TOKEN_REVOKED') {
        await Brokerage.findByIdAndUpdate(targetTenantId, {
          'whatsappConfig.status': 'disconnected',
        })
      }
    } catch (e: any) {
      logger.warn(`Failed to sync Brokerage model for tenant ${tenantIdStr}: ${e.message}`)
    }

    // Audit logging for terminal or critical lifecycle events
    logAuditEvent({
      brokerageId: targetTenantId,
      action: `whatsapp_${event.toLowerCase()}`,
      resource: 'whatsapp_integration',
      resourceId: tenantIdStr,
      details: {
        previousState: current,
        newState: next,
        event,
        payload: payload ?? {},
      },
      status: 'success',
    }).catch(() => {})

    return next
  })
}

/**
 * Retrieves the current integration status, bounded history (PERF-M-002), and legal events.
 */
export async function getIntegrationStatus(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WhatsAppIntegrationStatusDto> {
  const targetTenantId = toTenantObjectId(tenantId)
  const tenantIdStr = targetTenantId.toString()

  const startDb = process.hrtime.bigint()
  const doc = await WhatsAppIntegration.findOne({ tenantId: targetTenantId })
    .select('+businessTokenEncrypted')
    .slice('history', -20)
    .lean()
  recordDbMetric('WhatsAppIntegration.getStatus', startDb, 10)

  const status: WAState = doc?.status ?? 'NOT_CONNECTED'
  const isLocked = await isTenantLocked(tenantIdStr)
  const legalEvents = getLegalEvents(status)

  return {
    status,
    wabaId: doc?.wabaId,
    phoneNumberId: doc?.phoneNumberId,
    hasToken: Boolean(doc?.businessTokenEncrypted),
    launchedAt: doc?.launchedAt ? doc.launchedAt.toISOString() : undefined,
    updatedAt: doc?.updatedAt ? doc.updatedAt.toISOString() : undefined,
    isLocked,
    legalEvents,
    history: doc?.history || [],
    appId: process.env.META_APP_ID || '',
    configId: process.env.META_CONFIG_ID || '',
  }
}

/**
 * Initiates signup flow:
 * Moves from NOT_CONNECTED / DISCONNECTED -> AWAITING_CALLBACK (or REAUTH_LAUNCHED if TOKEN_REVOKED).
 */
export async function launchSignup(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  const startDb = process.hrtime.bigint()
  const doc = await WhatsAppIntegration.findOne({ tenantId: targetTenantId }).lean()
  recordDbMetric('WhatsAppIntegration.findOne', startDb, 10)
  const current: WAState = doc?.status ?? 'NOT_CONNECTED'

  let event: WAEvent = 'SIGNUP_LAUNCHED'
  if (current === 'TOKEN_REVOKED') {
    event = 'REAUTH_LAUNCHED'
  }

  const now = new Date()
  return applyEvent(targetTenantId, event, { launchedAt: now }, { launchedAt: now })
}

/**
 * Handles incoming Meta OAuth code and drives the atomic onboarding pipeline under lock:
 * CODE_RECEIVED -> EXCHANGING_TOKEN -> SUBSCRIBING_WEBHOOKS -> REGISTERING_PHONE -> PENDING_PAYMENT
 */
export async function handleCodeReceived(
  tenantId: string | mongoose.Types.ObjectId,
  payload: CodeReceivedPayload
): Promise<{ status: WAState; error?: string }> {
  const targetTenantId = toTenantObjectId(tenantId)
  const tenantIdStr = targetTenantId.toString()

  const startFind = process.hrtime.bigint()
  const doc = await WhatsAppIntegration.findOne({ tenantId: targetTenantId }).lean()
  recordDbMetric('WhatsAppIntegration.findOne', startFind, 10)
  const current: WAState = doc?.status ?? 'NOT_CONNECTED'

  if (current !== 'AWAITING_CALLBACK') {
    throw new IllegalTransitionError(tenantIdStr, current, 'CODE_RECEIVED')
  }

  // Treat receiving the code and starting exchange as ONE atomic step under the lock
  return withLock(tenantIdStr, async () => {
    // 1. Immediately enter EXCHANGING_TOKEN under the lock
    const startExchangeAt = new Date()
    const startStep1 = process.hrtime.bigint()
    await WhatsAppIntegration.findOneAndUpdate(
      { tenantId: targetTenantId },
      {
        $set: {
          status: 'EXCHANGING_TOKEN',
          wabaId: payload.wabaId.trim(),
          phoneNumberId: payload.phoneNumberId.trim(),
          updatedAt: startExchangeAt,
        },
        $push: {
          history: {
            state: 'EXCHANGING_TOKEN',
            event: 'CODE_RECEIVED',
            at: startExchangeAt,
            meta: { wabaId: payload.wabaId, phoneNumberId: payload.phoneNumberId },
          },
        },
      },
      { upsert: true }
    )
    recordDbMetric('WhatsAppIntegration.step1ExchangingToken', startStep1, 10)

    // 2. Call Graph API to exchange code for business token
    let businessToken: string | undefined
    try {
      businessToken = await exchangeCodeForToken(payload.code)
    } catch (err: any) {
      const errorCode = err?.code || err?.statusCode || 'TOKEN_EXCHANGE_ERROR'
      logger.error(`Token exchange failed for tenant ${tenantIdStr}: ${err.message}`)

      // Fire TOKEN_EXCHANGE_FAILURE -> TOKEN_EXCHANGE_FAILED (no retry, 30s TTL expired)
      const startFail = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'TOKEN_EXCHANGE_FAILED', updatedAt: new Date() },
          $push: {
            history: {
              state: 'TOKEN_EXCHANGE_FAILED',
              event: 'TOKEN_EXCHANGE_FAILURE',
              at: new Date(),
              meta: { errorCode, message: err.message },
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.tokenExchangeFailed', startFail, 10)
      return { status: 'TOKEN_EXCHANGE_FAILED', error: err.message }
    }

    // 3. Token exchange succeeded -> enter SUBSCRIBING_WEBHOOKS & store encrypted token
    const encryptedToken = encrypt(businessToken)
    const startStep3 = process.hrtime.bigint()
    await WhatsAppIntegration.findOneAndUpdate(
      { tenantId: targetTenantId },
      {
        $set: {
          status: 'SUBSCRIBING_WEBHOOKS',
          businessTokenEncrypted: encryptedToken,
          updatedAt: new Date(),
        },
        $push: {
          history: {
            state: 'SUBSCRIBING_WEBHOOKS',
            event: 'TOKEN_EXCHANGE_SUCCESS',
            at: new Date(),
          },
        },
      }
    )
    recordDbMetric('WhatsAppIntegration.step3SubscribingWebhooks', startStep3, 10)

    // 4. Call POST /{waba_id}/subscribed_apps
    try {
      await subscribeWabaWebhooks(payload.wabaId, businessToken)
    } catch (err: any) {
      const errorCode = err?.code || 'WEBHOOK_SUBSCRIBE_ERROR'
      logger.error(`Webhook subscription failed for tenant ${tenantIdStr}: ${err.message}`)

      const startSubFail = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'WEBHOOK_SUBSCRIBE_FAILED', updatedAt: new Date() },
          $push: {
            history: {
              state: 'WEBHOOK_SUBSCRIBE_FAILED',
              event: 'WEBHOOK_SUBSCRIBE_FAILURE',
              at: new Date(),
              meta: { errorCode, message: err.message },
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.webhookSubscribeFailed', startSubFail, 10)
      return { status: 'WEBHOOK_SUBSCRIBE_FAILED', error: err.message }
    }

    // 5. Webhook subscribe succeeded -> enter REGISTERING_PHONE
    const startStep5 = process.hrtime.bigint()
    await WhatsAppIntegration.findOneAndUpdate(
      { tenantId: targetTenantId },
      {
        $set: { status: 'REGISTERING_PHONE', updatedAt: new Date() },
        $push: {
          history: {
            state: 'REGISTERING_PHONE',
            event: 'WEBHOOK_SUBSCRIBE_SUCCESS',
            at: new Date(),
          },
        },
      }
    )
    recordDbMetric('WhatsAppIntegration.step5RegisteringPhone', startStep5, 10)

    // 6. Call POST /{phone_number_id}/register
    try {
      await registerPhoneNumber(payload.phoneNumberId, businessToken)
    } catch (err: any) {
      const errorCode = err?.code || 'PHONE_REGISTER_ERROR'
      logger.error(`Phone registration failed for tenant ${tenantIdStr}: ${err.message}`)

      const startPhoneFail = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'PHONE_REGISTER_FAILED', updatedAt: new Date() },
          $push: {
            history: {
              state: 'PHONE_REGISTER_FAILED',
              event: 'PHONE_REGISTER_FAILURE',
              at: new Date(),
              meta: { errorCode, message: err.message },
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.phoneRegisterFailed', startPhoneFail, 10)
      return { status: 'PHONE_REGISTER_FAILED', error: err.message }
    }

    // 7. Phone registration succeeded -> enter PENDING_PAYMENT
    const startStep7 = process.hrtime.bigint()
    await WhatsAppIntegration.findOneAndUpdate(
      { tenantId: targetTenantId },
      {
        $set: { status: 'PENDING_PAYMENT', updatedAt: new Date() },
        $push: {
          history: {
            state: 'PENDING_PAYMENT',
            event: 'PHONE_REGISTER_SUCCESS',
            at: new Date(),
          },
        },
      }
    )
    recordDbMetric('WhatsAppIntegration.step7PendingPayment', startStep7, 10)

    return { status: 'PENDING_PAYMENT' }
  })
}

/**
 * Retries a failed retryable step (WEBHOOK_SUBSCRIBE_FAILED or PHONE_REGISTER_FAILED).
 */
export async function retryStep(
  tenantId: string | mongoose.Types.ObjectId
): Promise<{ status: WAState; error?: string }> {
  const targetTenantId = toTenantObjectId(tenantId)
  const tenantIdStr = targetTenantId.toString()

  const startFind = process.hrtime.bigint()
  const doc = await WhatsAppIntegration.findOne({ tenantId: targetTenantId })
    .select('+businessTokenEncrypted')
    .lean()
  recordDbMetric('WhatsAppIntegration.findOne', startFind, 10)
  const current: WAState = doc?.status ?? 'NOT_CONNECTED'

  if (current !== 'WEBHOOK_SUBSCRIBE_FAILED' && current !== 'PHONE_REGISTER_FAILED') {
    throw new IllegalTransitionError(tenantIdStr, current, 'RETRY')
  }

  if (!doc?.businessTokenEncrypted || !doc?.wabaId || !doc?.phoneNumberId) {
    throw new AppError('Missing required integration credentials to retry', HTTP_STATUS.BAD_REQUEST)
  }

  const businessToken = decrypt(doc.businessTokenEncrypted)

  return withLock(tenantIdStr, async () => {
    if (current === 'WEBHOOK_SUBSCRIBE_FAILED') {
      // Transition to SUBSCRIBING_WEBHOOKS via RETRY
      const startSubRetry = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'SUBSCRIBING_WEBHOOKS', updatedAt: new Date() },
          $push: {
            history: { state: 'SUBSCRIBING_WEBHOOKS', event: 'RETRY', at: new Date() },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.retrySubscribingWebhooks', startSubRetry, 10)

      // Re-run subscribe
      try {
        await subscribeWabaWebhooks(doc.wabaId!, businessToken)
      } catch (err: any) {
        const startSubFail = process.hrtime.bigint()
        await WhatsAppIntegration.findOneAndUpdate(
          { tenantId: targetTenantId },
          {
            $set: { status: 'WEBHOOK_SUBSCRIBE_FAILED', updatedAt: new Date() },
            $push: {
              history: {
                state: 'WEBHOOK_SUBSCRIBE_FAILED',
                event: 'WEBHOOK_SUBSCRIBE_FAILURE',
                at: new Date(),
                meta: { error: err.message },
              },
            },
          }
        )
        recordDbMetric('WhatsAppIntegration.retryWebhookFailed', startSubFail, 10)
        return { status: 'WEBHOOK_SUBSCRIBE_FAILED', error: err.message }
      }

      // Succeeded -> move to REGISTERING_PHONE
      const startRegPhone = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'REGISTERING_PHONE', updatedAt: new Date() },
          $push: {
            history: {
              state: 'REGISTERING_PHONE',
              event: 'WEBHOOK_SUBSCRIBE_SUCCESS',
              at: new Date(),
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.retryRegisteringPhone', startRegPhone, 10)

      // Register phone
      try {
        await registerPhoneNumber(doc.phoneNumberId!, businessToken)
      } catch (err: any) {
        const startRegFail = process.hrtime.bigint()
        await WhatsAppIntegration.findOneAndUpdate(
          { tenantId: targetTenantId },
          {
            $set: { status: 'PHONE_REGISTER_FAILED', updatedAt: new Date() },
            $push: {
              history: {
                state: 'PHONE_REGISTER_FAILED',
                event: 'PHONE_REGISTER_FAILURE',
                at: new Date(),
                meta: { error: err.message },
              },
            },
          }
        )
        recordDbMetric('WhatsAppIntegration.retryPhoneFailed', startRegFail, 10)
        return { status: 'PHONE_REGISTER_FAILED', error: err.message }
      }

      const startPendingPay = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'PENDING_PAYMENT', updatedAt: new Date() },
          $push: {
            history: {
              state: 'PENDING_PAYMENT',
              event: 'PHONE_REGISTER_SUCCESS',
              at: new Date(),
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.retryPendingPayment', startPendingPay, 10)
      return { status: 'PENDING_PAYMENT' }
    } else {
      // current === 'PHONE_REGISTER_FAILED'
      const startRetryReg = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'REGISTERING_PHONE', updatedAt: new Date() },
          $push: {
            history: { state: 'REGISTERING_PHONE', event: 'RETRY', at: new Date() },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.retryRegisteringPhoneOnly', startRetryReg, 10)

      try {
        await registerPhoneNumber(doc.phoneNumberId!, businessToken)
      } catch (err: any) {
        const startRegFailOnly = process.hrtime.bigint()
        await WhatsAppIntegration.findOneAndUpdate(
          { tenantId: targetTenantId },
          {
            $set: { status: 'PHONE_REGISTER_FAILED', updatedAt: new Date() },
            $push: {
              history: {
                state: 'PHONE_REGISTER_FAILED',
                event: 'PHONE_REGISTER_FAILURE',
                at: new Date(),
                meta: { error: err.message },
              },
            },
          }
        )
        recordDbMetric('WhatsAppIntegration.retryPhoneFailedOnly', startRegFailOnly, 10)
        return { status: 'PHONE_REGISTER_FAILED', error: err.message }
      }

      const startPendingPayOnly = process.hrtime.bigint()
      await WhatsAppIntegration.findOneAndUpdate(
        { tenantId: targetTenantId },
        {
          $set: { status: 'PENDING_PAYMENT', updatedAt: new Date() },
          $push: {
            history: {
              state: 'PENDING_PAYMENT',
              event: 'PHONE_REGISTER_SUCCESS',
              at: new Date(),
            },
          },
        }
      )
      recordDbMetric('WhatsAppIntegration.retryPendingPaymentOnly', startPendingPayOnly, 10)
      return { status: 'PENDING_PAYMENT' }
    }
  })
}

/**
 * Restarts onboarding by discarding failed attempts and stored tokens.
 * Legal from: TOKEN_EXCHANGE_FAILED, WEBHOOK_SUBSCRIBE_FAILED, PHONE_REGISTER_FAILED.
 */
export async function restartSignup(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(
    targetTenantId,
    'RESTART',
    {},
    {
      businessTokenEncrypted: undefined,
      wabaId: undefined,
      phoneNumberId: undefined,
      launchedAt: undefined,
    }
  )
}

/**
 * Handles frontend session cancel event.
 */
export async function handleFlowCancelled(
  tenantId: string | mongoose.Types.ObjectId,
  payload?: FlowCancelledPayload
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'FLOW_CANCELLED', {
    step: payload?.currentStep || 'unknown',
  })
}

/**
 * Handles frontend session error event.
 */
export async function handleFlowError(
  tenantId: string | mongoose.Types.ObjectId,
  payload?: FlowErrorReportedPayload
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'FLOW_ERROR_REPORTED', {
    errorCode: payload?.errorCode,
    errorMessage: payload?.errorMessage,
    sessionId: payload?.sessionId,
  })
}

/**
 * Handles signup callback timeout.
 */
export async function handleCallbackTimeout(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'CALLBACK_TIMEOUT', { reason: '30s_timeout_exceeded' })
}

/**
 * Confirms payment method added (manual check or webhook).
 */
export async function confirmPaymentMethod(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'PAYMENT_METHOD_CONFIRMED', {
    confirmedAt: new Date().toISOString(),
  })
}

/**
 * Manually disconnects integration.
 */
export async function manualDisconnect(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'MANUAL_DISCONNECT', {
    disconnectedAt: new Date().toISOString(),
  })
}

/**
 * Webhook handler for account restriction.
 */
export async function handleAccountRestricted(
  tenantId: string | mongoose.Types.ObjectId,
  reason: string
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'ACCOUNT_RESTRICTED', { reason })
}

/**
 * Webhook handler for account reinstatement.
 */
export async function handleAccountReinstated(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'ACCOUNT_REINSTATED', {})
}

/**
 * Token invalidated handler (triggered on 401/OAuthException or webhook signal).
 */
export async function handleTokenInvalidated(
  tenantId: string | mongoose.Types.ObjectId
): Promise<WAState> {
  const targetTenantId = toTenantObjectId(tenantId)
  return applyEvent(targetTenantId, 'TOKEN_INVALIDATED', {
    invalidatedAt: new Date().toISOString(),
  })
}

// ──────────────────────────────────────────────────────────
// Meta Graph API Client Helpers
// ──────────────────────────────────────────────────────────

export async function exchangeCodeForToken(code: string): Promise<string> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  // Simulated exchange mode for development or test environments if app credentials not provided
  if ((!appId || !appSecret) && process.env.NODE_ENV !== 'production') {
    logger.info('[WhatsApp FSM] Running in test/simulated token exchange mode.')
    if (code.startsWith('invalid_') || code === 'force_fail') {
      const err = new Error('Simulated token exchange failure')
      ;(err as any).code = 190
      throw err
    }
    return `EAAB_simulated_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  if (!appId || !appSecret) {
    throw new AppError(
      'Meta App ID and App Secret (META_APP_ID, META_APP_SECRET) must be configured in environment.',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }

  const url = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(
    code
  )}`

  const res = await fetch(url, { method: 'GET' })
  const data = (await res.json()) as MetaOAuthTokenResponse

  if (data.error || !data.access_token) {
    const errorMsg = data.error?.message || 'Meta OAuth token exchange failed'
    const err = new Error(errorMsg)
    ;(err as any).code = data.error?.code || 400
    throw err
  }

  return data.access_token
}

export async function subscribeWabaWebhooks(wabaId: string, token: string): Promise<boolean> {
  if (token.startsWith('EAAB_simulated_token_') && process.env.NODE_ENV !== 'production') {
    if (wabaId.includes('fail_subscribe')) {
      throw new Error('Simulated webhook subscription failure')
    }
    return true
  }

  const url = `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  const data = (await res.json()) as MetaSubscribedAppsResponse
  if (data.error || !data.success) {
    const errorMsg = data.error?.message || 'Failed to subscribe WABA to webhook application'
    const err = new Error(errorMsg)
    ;(err as any).code = data.error?.code || 400
    throw err
  }

  return true
}

export async function registerPhoneNumber(phoneNumberId: string, token: string): Promise<boolean> {
  if (token.startsWith('EAAB_simulated_token_') && process.env.NODE_ENV !== 'production') {
    if (phoneNumberId.includes('fail_register')) {
      throw new Error('Simulated phone register failure')
    }
    return true
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/register`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      pin: '123456', // Standard Meta 6-digit PIN handshake requirement
    }),
  })

  const data = (await res.json()) as MetaPhoneRegisterResponse
  if (data.error || !data.success) {
    const errorMsg = data.error?.message || 'Failed to register WhatsApp Phone Number'
    const err = new Error(errorMsg)
    ;(err as any).code = data.error?.code || 400
    throw err
  }

  return true
}
