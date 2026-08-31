import { Request, Response, NextFunction } from 'express'
import { cacheGet, cacheSet } from '../config/redis.js'
import { buildCacheKey } from '../utils/cacheHelper.js'

/**
 * Cache-Aside Route Middleware for Read-Heavy GET endpoints
 * Emits X-Cache: HIT / MISS headers and captures JSON responses for Redis caching.
 */
export const cacheRoute = (feature: string, ttlSeconds: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    const brokerageId = req.user?.brokerageId?.toString() || 'global'
    const queryPayload = {
      path: req.originalUrl || req.path,
      query: req.query,
      userRole: req.user?.role,
    }

    const cacheKey = buildCacheKey(brokerageId, feature, queryPayload)

    try {
      const cached = await cacheGet(cacheKey)
      if (cached) {
        res.setHeader('X-Cache', 'HIT')
        res.setHeader('Content-Type', 'application/json')
        res.status(200).send(cached)
        return
      }

      res.setHeader('X-Cache', 'MISS')

      // Intercept res.json to cache response body
      const originalJson = res.json.bind(res)
      res.json = (body: any): Response => {
        // Only cache successful 200 responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const stringified = JSON.stringify(body)
          cacheSet(cacheKey, stringified, ttlSeconds).catch(() => {})
        }
        return originalJson(body)
      }

      next()
    } catch {
      // Fallback cleanly on cache error
      next()
    }
  }
}
