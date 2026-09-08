import crypto from 'crypto'
import { cacheInvalidatePattern } from '../config/redis.js'

/**
 * Builds a deterministic, hashed cache key scoped by tenant brokerage and feature.
 * Format: pp:{brokerageId}:{feature}:{hash}
 */
export const buildCacheKey = (
  brokerageId: string,
  feature: string,
  identifier: string | Record<string, any>
): string => {
  const payloadStr =
    typeof identifier === 'string'
      ? identifier
      : JSON.stringify(identifier, Object.keys(identifier).sort())

  const hash = crypto.createHash('md5').update(payloadStr).digest('hex')
  return `pp:${brokerageId}:${feature}:${hash}`
}

/**
 * Invalidates all cached query responses for a given feature within a brokerage tenant.
 */
export const invalidateTenantFeatureCache = async (
  brokerageId: string,
  feature: string
): Promise<void> => {
  const pattern = `pp:${brokerageId}:${feature}:*`
  await cacheInvalidatePattern(pattern)
}

/**
 * Completely purges all cached entries for a brokerage tenant.
 */
export const invalidateBrokerageAllCache = async (brokerageId: string): Promise<void> => {
  const pattern = `pp:${brokerageId}:*`
  await cacheInvalidatePattern(pattern)
}
