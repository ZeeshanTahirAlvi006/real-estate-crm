import { Request, Response, NextFunction } from 'express'
import { redisClient } from '../config/redis.js'
import { env } from '../config/env.js'
import { sendError } from '../utils/apiResponse.js'
import { HTTP_STATUS, COOKIE_NAMES } from '../utils/constants.js'
import { verifyAccessToken } from '../utils/tokenHelper.js'
import { AppError } from './errorHandler.js'

export type QuotaType = 'requests' | 'ai_tokens' | 'sms'

// In-memory fallback map for daily quotas
const inMemoryQuotas = new Map<string, { count: number; expiresAt: number }>()

/**
 * Returns the current date string (YYYY-MM-DD) formatted for Asia/Karachi timezone
 */
export const getKarachiDateString = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date()) // Format: YYYY-MM-DD
}

/**
 * Calculates remaining seconds until next midnight in Asia/Karachi (+ 1 hour buffer)
 */
export const getSecondsUntilKarachiMidnight = (): number => {
  const now = new Date()
  const karachiTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' })
  const karachiDate = new Date(karachiTimeStr)

  const midnight = new Date(karachiDate)
  midnight.setHours(24, 0, 0, 0)

  const diffMs = midnight.getTime() - karachiDate.getTime()
  return Math.max(60, Math.floor(diffMs / 1000) + 3600) // seconds + 1h buffer
}

/**
 * Atomic Check & Increment Quota for specific units (Requests, AI Tokens, SMS)
 * Strict Dual-Tier Enforcement: Checks both User and Brokerage Cumulative quotas.
 */
export const checkAndConsumeQuota = async (
  brokerageId: string,
  userId: string,
  quotaType: QuotaType,
  units: number = 1
): Promise<{ allowed: boolean; userRemaining: number; brokerageRemaining: number; reason?: string }> => {
  const now = Date.now()
  let windowKeySuffix: string
  let ttlSeconds: number
  let windowUnitText: string
  let resetIntervalText: string

  let userLimit = env.QUOTA_DAILY_USER_REQUESTS
  let brokerageLimit = env.QUOTA_DAILY_BROKERAGE_REQUESTS

  if (quotaType === 'requests') {
    // 1-minute sliding window (requests/min) — resets every minute
    const windowBlock = Math.floor(now / (60 * 1000))
    windowKeySuffix = `min:${windowBlock}`
    ttlSeconds = 65 // 65s covers the 1-minute window
    windowUnitText = 'requests/min'
    resetIntervalText = 'Resets every minute.'
  } else if (quotaType === 'ai_tokens') {
    const dateStr = getKarachiDateString()
    windowKeySuffix = `day:${dateStr}`
    ttlSeconds = getSecondsUntilKarachiMidnight()
    windowUnitText = 'ai_tokens/day'
    resetIntervalText = 'Resets at midnight PKT.'
    userLimit = env.QUOTA_DAILY_USER_AI_TOKENS
    brokerageLimit = env.QUOTA_DAILY_BROKERAGE_AI_TOKENS
  } else if (quotaType === 'sms') {
    const dateStr = getKarachiDateString()
    windowKeySuffix = `day:${dateStr}`
    ttlSeconds = getSecondsUntilKarachiMidnight()
    windowUnitText = 'sms/day'
    resetIntervalText = 'Resets at midnight PKT.'
    userLimit = env.QUOTA_DAILY_USER_SMS
    brokerageLimit = env.QUOTA_DAILY_BROKERAGE_SMS
  } else {
    const dateStr = getKarachiDateString()
    windowKeySuffix = `day:${dateStr}`
    ttlSeconds = getSecondsUntilKarachiMidnight()
    windowUnitText = `${quotaType}/day`
    resetIntervalText = 'Resets at midnight PKT.'
  }

  const userKey = `quota:user:${userId}:${quotaType}:${windowKeySuffix}`
  const brokerageKey = `quota:brokerage:${brokerageId}:${quotaType}:${windowKeySuffix}`

  let currentUserCount = 0
  let currentBrokerageCount = 0

  if (redisClient && redisClient.status === 'ready') {
    try {
      // Atomic pipeline increment
      const pipeline = redisClient.pipeline()
      pipeline.incrby(userKey, units)
      pipeline.expire(userKey, ttlSeconds)
      pipeline.incrby(brokerageKey, units)
      pipeline.expire(brokerageKey, ttlSeconds)

      const results = await pipeline.exec()
      if (results) {
        currentUserCount = (results[0]?.[1] as number) || units
        currentBrokerageCount = (results[2]?.[1] as number) || units
      }
    } catch {
      // In-memory fallback
      currentUserCount = consumeInMemory(userKey, units, ttlSeconds)
      currentBrokerageCount = consumeInMemory(brokerageKey, units, ttlSeconds)
    }
  } else {
    currentUserCount = consumeInMemory(userKey, units, ttlSeconds)
    currentBrokerageCount = consumeInMemory(brokerageKey, units, ttlSeconds)
  }

  // Strict enforcement checks
  if (currentUserCount > userLimit) {
    return {
      allowed: false,
      userRemaining: 0,
      brokerageRemaining: Math.max(0, brokerageLimit - currentBrokerageCount),
      reason: `Per-user ${quotaType} quota limit reached (${userLimit} ${windowUnitText}). ${resetIntervalText}`,
    }
  }

  if (currentBrokerageCount > brokerageLimit) {
    return {
      allowed: false,
      userRemaining: Math.max(0, userLimit - currentUserCount),
      brokerageRemaining: 0,
      reason: `Cumulative brokerage ${quotaType} quota limit reached (${brokerageLimit} ${windowUnitText}). ${resetIntervalText}`,
    }
  }

  return {
    allowed: true,
    userRemaining: Math.max(0, userLimit - currentUserCount),
    brokerageRemaining: Math.max(0, brokerageLimit - currentBrokerageCount),
  }
}

// In-Memory quota counter fallback
const consumeInMemory = (key: string, units: number, ttlSeconds: number): number => {
  const now = Date.now()
  const existing = inMemoryQuotas.get(key)

  if (!existing || now > existing.expiresAt) {
    inMemoryQuotas.set(key, { count: units, expiresAt: now + ttlSeconds * 1000 })
    return units
  }

  existing.count += units
  return existing.count
}

/**
 * Express Middleware: Strict Daily Request Quota Guard
 */
export const quotaGuard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Exclude health checks, audit logs, and activity requests from daily quota limits
  const path = req.path.toLowerCase()
  if (
    path === '/health' ||
    path === '/api/health' ||
    path.startsWith('/api/audit-logs') ||
    path.startsWith('/audit-logs') ||
    path.includes('/activities') ||
    path.includes('/activity-feed')
  ) {
    return next()
  }

  // Extract user and brokerage identity from req.user or accessToken cookie
  let brokerageId = req.user?.brokerageId?.toString()
  let userId = req.user?._id?.toString()

  if (!userId && req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
    try {
      const decoded = verifyAccessToken(req.cookies[COOKIE_NAMES.ACCESS_TOKEN])
      if (decoded) {
        userId = decoded.userId
        brokerageId = decoded.brokerageId
      }
    } catch {
      // Unauthenticated
    }
  }

  if (!userId || !brokerageId) {
    return next()
  }

  const result = await checkAndConsumeQuota(brokerageId, userId, 'requests', 1)

  if (!result.allowed) {
    sendError(
      res,
      result.reason || 'Daily request quota exceeded.',
      HTTP_STATUS.TOO_MANY_REQUESTS,
      {
        quotaType: 'requests',
        userRemaining: result.userRemaining,
        brokerageRemaining: result.brokerageRemaining,
      }
    )
    return
  }

  next()
}

/**
 * Service Helper: Throws error if AI Token or SMS quota is exceeded
 */
export const enforceCostQuota = async (
  brokerageId: string,
  userId: string,
  type: 'ai_tokens' | 'sms',
  units: number
): Promise<void> => {
  const result = await checkAndConsumeQuota(brokerageId, userId, type, units)
  if (!result.allowed) {
    throw new AppError(
      result.reason || `Daily ${type} quota exceeded.`,
      HTTP_STATUS.TOO_MANY_REQUESTS
    )
  }
}
