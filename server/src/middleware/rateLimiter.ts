import { Request, Response, NextFunction } from 'express'
import { redisClient } from '../config/redis.js'
import { env } from '../config/env.js'
import { USER_ROLES, COOKIE_NAMES } from '../utils/constants.js'
import { verifyAccessToken } from '../utils/tokenHelper.js'
import { sendError } from '../utils/apiResponse.js'
import { HTTP_STATUS } from '../utils/constants.js'

export type RouteCategory = 'writes' | 'reads' | 'polling'

export interface RoleRpmMatrix {
  total: number
  writes: number
  reads: number
  polling: number
}

/**
 * Dynamically computes category budgets directly from .env variables:
 * - Writes: ~25% of Total RPM (Transactional POST, PUT, PATCH, DELETE)
 * - Reads: ~60% of Total RPM (Dashboard, Lists, Filters, Profile GETs)
 * - Polling: ~15% of Total RPM (Notifications, Unread Checks, Live Tickers)
 */
export const getMatrixForRole = (role?: string): RoleRpmMatrix => {
  let totalRpm = env.RATE_LIMIT_UNAUTHENTICATED || 60

  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      totalRpm = env.RATE_LIMIT_SUPER_ADMIN || 300
      break
    case USER_ROLES.BROKERAGE_OWNER:
      totalRpm = env.RATE_LIMIT_BROKERAGE_OWNER || 120
      break
    case USER_ROLES.TEAM_LEAD:
      totalRpm = env.RATE_LIMIT_TEAM_LEAD || 100
      break
    case USER_ROLES.AGENT:
      totalRpm = env.RATE_LIMIT_AGENT || 90
      break
    case USER_ROLES.LEAD:
      totalRpm = env.RATE_LIMIT_LEAD || 30
      break
    default:
      totalRpm = env.RATE_LIMIT_UNAUTHENTICATED || 60
      break
  }

  // Calculate proportional category limits driven strictly by .env
  const writes = Math.max(2, Math.round(totalRpm * 0.25))
  const reads = Math.max(5, Math.round(totalRpm * 0.60))
  const polling = Math.max(2, totalRpm - writes - reads)

  return {
    total: totalRpm,
    writes,
    reads,
    polling,
  }
}

/**
 * Classifies any incoming HTTP request into one of the three matrix categories:
 * 1. 'polling'  — background checks, unread notifications, live ticker
 * 2. 'writes'   — transactional database mutations (POST, PUT, PATCH, DELETE)
 * 3. 'reads'    — dashboard queries, lists, filters, profiles (GET)
 */
export const classifyRouteCategory = (method: string, path: string): RouteCategory => {
  const normalizedPath = path.toLowerCase()

  // 1. Real-time / Polling checks
  if (
    normalizedPath.includes('/notifications') ||
    normalizedPath.includes('/unread') ||
    normalizedPath.includes('/live') ||
    normalizedPath.includes('/ticker') ||
    normalizedPath.includes('/speed-to-lead')
  ) {
    return 'polling'
  }

  // 2. Transactional / Write Actions
  if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
    return 'writes'
  }

  // 3. Dashboard / Read Actions (GET)
  return 'reads'
}

// In-memory fallback map when Redis is offline
const inMemoryRateLimit = new Map<string, { count: number; resetTime: number }>()

// Helper to extract clean client IP
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress as string
}

/**
 * High-Performance Categorized Sliding-Window Rate Limiter Middleware
 * Automatically partitions RPM quota across Writes, Reads, and Polling categories
 * directly driven by .env configurations.
 */
export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Allow health checks, audit logs, activity requests, and external webhooks without rate-limiting
  const path = req.path.toLowerCase()
  if (
    path === '/health' ||
    path === '/api/health' ||
    path.startsWith('/api/audit-logs') ||
    path.startsWith('/audit-logs') ||
    path.includes('/activities') ||
    path.includes('/activity-feed') ||
    path.includes('/webhook')
  ) {
    return next()
  }

  // Extract user identity and role from req.user or accessToken cookie
  let role = req.user?.role
  let userId = req.user?._id?.toString()

  if (!role && req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
    try {
      const decoded = verifyAccessToken(req.cookies[COOKIE_NAMES.ACCESS_TOKEN])
      if (decoded) {
        role = decoded.role
        userId = decoded.userId
      }
    } catch {
      // Unauthenticated or expired token
    }
  }

  const matrix = getMatrixForRole(role)
  const category = classifyRouteCategory(req.method, req.path)
  const categoryLimit = matrix[category]

  const identifier = userId
    ? `usr:${userId}`
    : `ip:${getClientIp(req)}`

  const now = Date.now()
  const windowSeconds = 60
  const windowBlock = Math.floor(now / (windowSeconds * 1000))
  const redisKey = `ratelimit:${identifier}:${category}:${windowBlock}`
  const resetEpoch = (windowBlock + 1) * windowSeconds

  let currentCount = 0

  if (redisClient && redisClient.status === 'ready') {
    try {
      currentCount = await redisClient.incr(redisKey)
      if (currentCount === 1) {
        // Set TTL slightly higher than the window to prevent premature eviction
        await redisClient.expire(redisKey, windowSeconds + 5)
      }
    } catch {
      currentCount = handleInMemoryFallback(`${identifier}:${category}`, now, windowSeconds)
    }
  } else {
    currentCount = handleInMemoryFallback(`${identifier}:${category}`, now, windowSeconds)
  }

  // Set standard RateLimit headers with Category Context
  const remaining = Math.max(0, categoryLimit - currentCount)
  res.setHeader('X-RateLimit-Limit', categoryLimit)
  res.setHeader('X-RateLimit-Remaining', remaining)
  res.setHeader('X-RateLimit-Reset', resetEpoch)
  res.setHeader('X-RateLimit-Category', category)

  if (currentCount > categoryLimit) {
    const retryAfter = Math.max(1, resetEpoch - Math.floor(now / 1000))
    res.setHeader('Retry-After', retryAfter)

    const categoryNames = {
      writes: 'Transactional / Write actions',
      reads: 'Dashboard / Read actions',
      polling: 'Real-time / Polling actions',
    }

    sendError(
      res,
      `Rate limit exceeded for ${categoryNames[category]} (${categoryLimit} RPM). Please retry in ${retryAfter}s.`,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      {
        retryAfter,
        category,
        categoryLimit,
        role: role || 'unauthenticated',
        resetTime: new Date(resetEpoch * 1000).toISOString(),
      }
    )
    return
  }

  next()
}

// In-memory fallback handler
const handleInMemoryFallback = (key: string, now: number, windowSeconds: number): number => {
  const record = inMemoryRateLimit.get(key)
  const windowMs = windowSeconds * 1000

  if (!record || now > record.resetTime) {
    inMemoryRateLimit.set(key, { count: 1, resetTime: now + windowMs })
    return 1
  }

  record.count += 1
  return record.count
}
