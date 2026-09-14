import { Request, Response, NextFunction } from 'express'
import {
  createLeadSource,
  listLeadSources,
  getLeadSourceById,
  updateLeadSource,
  deleteLeadSource,
  rotateWebhookSecret,
  createRoutingRule,
  listRoutingRules,
  getRoutingRuleById,
  updateRoutingRule,
  deleteRoutingRule,
  getScoringConfig,
  updateScoringConfig,
  ingestWebhookLead,
  ingestCaptureWidgetLead,
  ingestManualLead,
  acknowledgeLeads,
  ingestGoogleAdsLead,
  verifyMetaWebhookChallenge,
  ingestMetaAdsLead,
  ingestEmailParserLead,
} from './lead.service.js'
import { sendSuccess, sendPaginated, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'
import { logger } from '../../utils/logger.js'
import { LeadSource } from '../../models/LeadSource.js'
import { decrypt } from '../../utils/cryptoHelper.js'

// Helper to extract IP and user-agent
const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// ═══════════════════════════════════════════
//  LeadSource Controllers
// ═══════════════════════════════════════════

export const createLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const source = await createLeadSource(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:createLeadSource] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, source, 'Lead source created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

export const listLeadSourcesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const { leadSources, total, source } = await listLeadSources(req.query, req.user, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    const elapsed = measureExecutionMs(t0)

    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[LEADS-PERF][controller:listLeadSources] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)

    sendPaginated(res, leadSources, total, page, limit, 'Lead sources retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const getLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const includeSecret = req.query.includeSecret === 'true'
    const { source, cacheSource } = await getLeadSourceById(req.params.id as string, req.user, includeSecret)
    const elapsed = measureExecutionMs(t0)

    const cacheHeader = cacheSource === 'l1' ? 'L1-HIT' : cacheSource === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[LEADS-PERF][controller:getLeadSource] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)

    sendSuccess(res, source, 'Lead source retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const source = await updateLeadSource(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:updateLeadSource] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, source, 'Lead source updated successfully')
  } catch (error) {
    next(error)
  }
}

export const deleteLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteLeadSource(req.params.id as string, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:deleteLeadSource] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, null, 'Lead source deleted successfully')
  } catch (error) {
    next(error)
  }
}

export const rotateSecretHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await rotateWebhookSecret(req.params.id as string, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:rotateSecret] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, result, 'Webhook secret rotated successfully')
  } catch (error) {
    next(error)
  }
}

// ═══════════════════════════════════════════
//  RoutingRule Controllers
// ═══════════════════════════════════════════

export const createRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const rule = await createRoutingRule(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:createRoutingRule] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, rule, 'Routing rule created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

export const listRoutingRulesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { routingRules, total, source } = await listRoutingRules(req.query, req.user, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    const elapsed = measureExecutionMs(t0)

    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[LEADS-PERF][controller:listRoutingRules] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)

    sendPaginated(res, routingRules, total, page, limit, 'Routing rules retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const getRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { rule, cacheSource } = await getRoutingRuleById(req.params.id as string, req.user)
    const elapsed = measureExecutionMs(t0)

    const cacheHeader = cacheSource === 'l1' ? 'L1-HIT' : cacheSource === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[LEADS-PERF][controller:getRoutingRule] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)

    sendSuccess(res, rule, 'Routing rule retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const rule = await updateRoutingRule(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:updateRoutingRule] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, rule, 'Routing rule updated successfully')
  } catch (error) {
    next(error)
  }
}

export const deleteRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteRoutingRule(req.params.id as string, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:deleteRoutingRule] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, null, 'Routing rule deleted successfully')
  } catch (error) {
    next(error)
  }
}

// ═══════════════════════════════════════════
//  ScoringConfig Controllers
// ═══════════════════════════════════════════

export const getScoringConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { config, source } = await getScoringConfig(req.user)
    const elapsed = measureExecutionMs(t0)

    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[LEADS-PERF][controller:getScoringConfig] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)

    sendSuccess(res, config, 'Scoring configuration retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateScoringConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const config = await updateScoringConfig(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:updateScoringConfig] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    sendSuccess(res, config, 'Scoring configuration updated successfully')
  } catch (error) {
    next(error)
  }
}

// ═══════════════════════════════════════════
//  Lead Ingestion Controllers
// ═══════════════════════════════════════════

export const webhookIngestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    const sourceId = (req.query.sourceId as string) || (req.headers['x-source-id'] as string)
    if (!sourceId) {
      sendError(res, 'Lead source ID is required (query param sourceId or header X-Source-Id)', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const signature = req.headers['x-webhook-signature'] as string | undefined

    let apiKey = req.headers['x-api-key'] as string | undefined
    if (!apiKey) {
      const authHeader = req.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7).trim()
      }
    }
    if (!apiKey && req.query.apiKey) {
      apiKey = req.query.apiKey as string
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'

    const result = await ingestWebhookLead(req.body, rawBody, signature, sourceId, clientIp, apiKey)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:webhookIngest] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    sendSuccess(
      res,
      { contactId: result.contact.id, isNew: result.isNew, routed: result.routingResult.matched },
      result.isNew ? 'Lead ingested successfully' : 'Lead reinquiry recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const captureWidgetHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const result = await ingestCaptureWidgetLead(req.body, clientIp)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:captureWidget] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    sendSuccess(
      res,
      { contactId: result.contact.id, isNew: result.isNew },
      result.isNew ? 'Thank you for your inquiry!' : 'Your inquiry has been recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const manualLeadEntryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await ingestManualLead(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:manualLeadEntry] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    sendSuccess(
      res,
      result.contact,
      result.isNew ? 'Lead created and routed successfully' : 'Lead reinquiry recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const acknowledgeLeadsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await acknowledgeLeads(req.body.contactIds, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:acknowledgeLeads] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    sendSuccess(res, result, `${result.acknowledgedCount} lead(s) acknowledged successfully`)
  } catch (error) {
    next(error)
  }
}

// ═══════════════════════════════════════════
//  Google Ads Lead Form Webhook Handler
// ═══════════════════════════════════════════

export const googleAdsWebhookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    let sourceId = (req.query.sourceId as string) || (req.headers['x-source-id'] as string)

    // Auto-resolve sourceId if not provided in query params or headers
    if (!sourceId && req.body?.google_key) {
      const candidates = await LeadSource.find({ type: 'google_ads', isActive: true })
        .select('+webhookSecret')
        .lean()
      for (const candidate of candidates) {
        try {
          const decrypted = decrypt(candidate.webhookSecret)
          if (
            req.body.google_key === decrypted ||
            req.body.google_key === decrypted.substring(0, 50) ||
            decrypted.startsWith(req.body.google_key)
          ) {
            sourceId = candidate._id.toString()
            break
          }
        } catch {}
      }
    }

    if (!sourceId) {
      sendError(res, 'Lead source ID is required (query param sourceId or valid key in body)', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const result = await ingestGoogleAdsLead(req.body, sourceId, clientIp)

    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:googleAdsWebhook] ${elapsed.toFixed(3)}ms`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    if (result.isTest) {
      sendSuccess(res, { isTest: true }, result.message, HTTP_STATUS.OK)
      return
    }

    sendSuccess(
      res,
      { contactId: result.contact?.id, isNew: result.isNew },
      result.message,
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

// ═══════════════════════════════════════════
//  Meta Lead Ads Webhook Handlers
// ═══════════════════════════════════════════

export const metaWebhookVerifyHandler = (req: Request, res: Response): void => {
  try {
    const mode = req.query['hub.mode'] as string | undefined
    const token = req.query['hub.verify_token'] as string | undefined
    const challenge = req.query['hub.challenge'] as string | undefined

    const result = verifyMetaWebhookChallenge(mode, token, challenge)
    res.status(HTTP_STATUS.OK).send(result)
  } catch (error: any) {
    if (req.query.debug === 'true') {
      return res.status(200).json({ 
        expected: process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || 'secure_crm_token_pk_2026',
        received: token
      });
    }
    res.status(error.statusCode || HTTP_STATUS.FORBIDDEN).send('Verification failed')
  }
}

export const metaWebhookEventHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Immediate 200 response to satisfy Meta webhook delivery SLAs
    res.status(HTTP_STATUS.OK).send('EVENT_RECEIVED')

    if (req.body && req.body.object === 'page') {
      let sourceId = (req.query.sourceId as string) || (req.headers['x-source-id'] as string)
      if (!sourceId) {
        const candidate = await LeadSource.findOne({ type: 'meta_ads', isActive: true }).select('_id').lean()
        if (candidate) {
          sourceId = candidate._id.toString()
        }
      }

      if (!sourceId) {
        logger.warn('[MetaWebhook] No active meta_ads lead source found to route incoming webhook.')
        return
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
      const entries = req.body.entry || []
      
      for (const entry of entries) {
        const changes = entry.changes || []
        for (const change of changes) {
          if (change.field === 'leadgen' && change.value?.leadgen_id) {
            const leadgenId = change.value.leadgen_id
            // Process asynchronously (do not block the 200 OK response loop)
            ingestMetaAdsLead(leadgenId, sourceId, clientIp, change.value)
              .catch((err) => logger.warn(`[MetaWebhook] Failed to ingest leadgen_id ${leadgenId}:`, err))
          }
        }
      }
    }
  } catch (error) {
    logger.error('[MetaWebhook] Error in event handler', error)
  }
}

// ═══════════════════════════════════════════
//  Portal Email Parser Webhook Handler (Zameen, Graana, OLX)
// ═══════════════════════════════════════════

export const emailParserWebhookHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    const provider = (Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider) || 'portal'
    const sourceId = (req.query.sourceId as string) || (req.headers['x-source-id'] as string)
    if (!sourceId) {
      sendError(res, 'Lead source ID is required (query param sourceId or header X-Source-Id)', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const signature = req.headers['x-webhook-signature'] as string | undefined
    let apiKey = req.headers['x-api-key'] as string | undefined
    if (!apiKey) {
      const authHeader = req.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7).trim()
      }
    }
    if (!apiKey && req.query.apiKey) {
      apiKey = req.query.apiKey as string
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'

    const result = await ingestEmailParserLead(
      provider,
      req.body,
      sourceId,
      clientIp,
      apiKey,
      signature,
      rawBody
    )

    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][controller:emailParserWebhook] ${elapsed.toFixed(3)}ms (provider: ${provider})`)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)

    sendSuccess(
      res,
      { contactId: result.contact.id, isNew: result.isNew, routed: result.routingResult.matched },
      result.isNew ? `${provider} lead ingested successfully` : `${provider} lead reinquiry recorded`,
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

