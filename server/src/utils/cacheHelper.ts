import crypto from 'crypto'
import { cacheInvalidatePattern } from '../config/redis.js'

/**
 * Deterministically sorts object keys recursively to produce consistent serialization
 */
const sortKeysRecursively = (val: any): any => {
  if (!val || typeof val !== 'object') return val
  if (Array.isArray(val)) return val.map(sortKeysRecursively)
  const sorted: Record<string, any> = {}
  const keys = Object.keys(val).sort()
  for (const k of keys) {
    sorted[k] = sortKeysRecursively(val[k])
  }
  return sorted
}

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
      : JSON.stringify(sortKeysRecursively(identifier))

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
