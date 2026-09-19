import { Request, Response, NextFunction } from 'express'
import { cacheGet, cacheSet } from '../config/redis.js'
import { FeatureFlag } from '../models/FeatureFlag.js'
import { HTTP_STATUS } from '../utils/constants.js'
import { logger } from '../utils/logger.js'

// In-process L1 Cache: 5 seconds TTL (~0.01ms memory read)
interface CachedFlagState {
  isEnabled: boolean
  name?: string
  disabledReason?: string
  expiresAt: number
}

const localFlagCache = new Map<string, CachedFlagState>()

export const invalidateLocalFeatureFlag = (featureKey?: string): void => {
  if (featureKey) {
    localFlagCache.delete(featureKey.toLowerCase())
  } else {
    localFlagCache.clear()
  }
}

export interface RequireFeatureOptions {
  allowSuperAdmin?: boolean
}

// Feature Kill-Switch Middleware
export const requireFeature = (featureKey: string, options?: RequireFeatureOptions) => {
  const normalizedKey = featureKey.toLowerCase()

  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    // 0. Super Admin bypass check (if requested via header or options)
    if (
      (req.user?.role === 'super_admin' && req.headers['x-admin-bypass'] === 'true') ||
      (options?.allowSuperAdmin && req.user?.role === 'super_admin')
    ) {
      return next()
    }

    try {
      const now = Date.now()

      // 1. L1 In-Memory Fast Path (~0.01ms)
      const localCached = localFlagCache.get(normalizedKey)
      if (localCached && localCached.expiresAt > now) {
        if (!localCached.isEnabled) {
          return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
            success: false,
            message: `The subsystem [${localCached.name || normalizedKey}] is currently paused for maintenance.`,
            code: 'FEATURE_MAINTENANCE',
            feature: normalizedKey,
            disabledReason: localCached.disabledReason || 'Under maintenance',
          })
        }
        return next()
      }

      // 2. L2 Redis Cache Path (<1ms) with try/catch fallback isolation (Rule DI-003)
      let cachedStatus: string | null = null
      try {
        cachedStatus = await cacheGet(`feature_flag:${normalizedKey}`)
      } catch (redisErr) {
        logger.warn(`Redis feature flag read error for [${normalizedKey}], falling through to MongoDB`, redisErr)
      }

      if (cachedStatus !== null) {
        const isEnabled = cachedStatus !== '0'
        // Warm L1 cache
        localFlagCache.set(normalizedKey, {
          isEnabled,
          expiresAt: now + 5000,
        })

        if (!isEnabled) {
          return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
            success: false,
            message: `The subsystem [${normalizedKey}] is currently paused for maintenance.`,
            code: 'FEATURE_MAINTENANCE',
            feature: normalizedKey,
            disabledReason: 'Under maintenance',
          })
        }
        return next()
      }

      // 3. L3 MongoDB Covered Fallback (<10ms) (Rule PERF-M-001 & DI-002)
      const flag = await FeatureFlag.findOne({ key: normalizedKey })
        .select('key isEnabled name disabledReason')
        .lean()

      const isEnabled = flag ? flag.isEnabled : true
      const flagName = flag?.name || normalizedKey
      const disabledReason = flag?.disabledReason || 'Under maintenance'

      // Warm up both L1 and L2 caches (1 day TTL for Redis, 5s for L1)
      localFlagCache.set(normalizedKey, {
        isEnabled,
        name: flagName,
        disabledReason,
        expiresAt: now + 5000,
      })

      try {
        await cacheSet(`feature_flag:${normalizedKey}`, isEnabled ? '1' : '0', 86400)
      } catch (setErr) {
        logger.warn(`Redis cacheSet failed for [${normalizedKey}]`, setErr)
      }

      if (!isEnabled) {
        return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
          success: false,
          message: `The subsystem [${flagName}] is currently paused for maintenance.`,
          code: 'FEATURE_MAINTENANCE',
          feature: normalizedKey,
          disabledReason,
        })
      }

      next()
    } catch (err) {
      // On unexpected database error, fail-open to avoid full CRM outage
      logger.error(`Error checking feature flag [${normalizedKey}]:`, err)
      next()
    }
  }
}
