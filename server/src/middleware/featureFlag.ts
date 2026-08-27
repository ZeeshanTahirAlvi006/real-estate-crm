import { Request, Response, NextFunction } from 'express'
import { cacheGet, cacheSet } from '../config/redis.js'
import { FeatureFlag } from '../models/FeatureFlag.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../utils/constants.js'
import { sendError } from '../utils/apiResponse.js'

// Feature Kill-Switch Middleware
export const requireFeature = (featureKey: string) => {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      // 1. Fast path: check Redis cache (0ms)
      const cachedStatus = await cacheGet(`feature_flag:${featureKey}`)
      if (cachedStatus !== null) {
        if (cachedStatus === '0') {
          return sendError(
            res,
            GENERIC_AUTH_MESSAGES.FEATURE_MAINTENANCE,
            HTTP_STATUS.SERVICE_UNAVAILABLE
          )
        }
        return next()
      }

      // 2. Fallback path: query MongoDB
      const flag = await FeatureFlag.findOne({ key: featureKey })
      const isEnabled = flag ? flag.isEnabled : true // Default to true if not found

      // Cache the result for subsequent requests (1 hour TTL)
      await cacheSet(`feature_flag:${featureKey}`, isEnabled ? '1' : '0', 3600)

      if (!isEnabled) {
        return sendError(
          res,
          GENERIC_AUTH_MESSAGES.FEATURE_MAINTENANCE,
          HTTP_STATUS.SERVICE_UNAVAILABLE
        )
      }

      next()
    } catch {
      // On unexpected cache/DB error, fail open to prevent total application outage
      next()
    }
  }
}
