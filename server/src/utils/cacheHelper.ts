import crypto from 'crypto'
import { cacheGet, cacheSet, cacheDelete, cacheSetNx, cacheInvalidatePattern } from '../config/redis.js'
import { logger } from './logger.js'

export interface SwrEnvelope<T> {
  data: T
  expiresAt: number
}

/**
 * Stale-While-Revalidate (SWR) cache fetcher with distributed mutex lock.
 * Serves cached/stale data in < 0.1ms. If stale, exactly one asynchronous worker
 * refreshes from DB in the background, eliminating thundering-herd spikes under load.
 */
export const fetchWithSWR = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 60,
  staleTtlSeconds: number = 300
): Promise<{ data: T; source: 'cache' | 'swr-background' | 'db' }> => {
  const cachedRaw = await cacheGet(key)
  if (cachedRaw) {
    const parsed = safeJsonParse<SwrEnvelope<T> | T>(cachedRaw)
    if (parsed) {
      const isEnvelope =
        typeof parsed === 'object' && parsed !== null && 'expiresAt' in parsed && 'data' in parsed
      const data = isEnvelope ? (parsed as SwrEnvelope<T>).data : (parsed as T)
      const expiresAt = isEnvelope ? (parsed as SwrEnvelope<T>).expiresAt : 0

      // Fresh cache hit: instant response
      if (Date.now() < expiresAt) {
        return { data, source: 'cache' }
      }

      // Stale cache hit: return stale data immediately, acquire lock to refresh in background
      const lockKey = `${key}:lock`
      const lockAcquired = await cacheSetNx(lockKey, '1', 15)
      if (lockAcquired) {
        fetcher()
          .then((fresh) => {
            const envelope: SwrEnvelope<T> = {
              data: fresh,
              expiresAt: Date.now() + ttlSeconds * 1000,
            }
            return cacheSet(key, JSON.stringify(envelope), staleTtlSeconds)
          })
          .catch((err) => {
            logger.warn(`[SWR] Background refresh failed for ${key}: ${err.message}`)
          })
          .finally(() => {
            cacheDelete(lockKey).catch(() => {})
          })
      }
      return { data, source: 'swr-background' }
    }
  }

  // Cold cache miss: fetch synchronously, store SWR envelope, return data
  const fresh = await fetcher()
  const envelope: SwrEnvelope<T> = {
    data: fresh,
    expiresAt: Date.now() + ttlSeconds * 1000,
  }
  await cacheSet(key, JSON.stringify(envelope), staleTtlSeconds)
  return { data: fresh, source: 'db' }
}


//Deterministically sorts object keys recursively to produce consistent serialization

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

//Safely parses JSON string with error isolation and logging (DI-003).
//If payload is corrupted or invalid, returns null and prevents application crashes.
export const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch (error: any) {
    logger.warn(`Failed to parse cached JSON payload (${error.message}). Gracefully falling back to DB.`)
    return null
  }
}

//Calculates execution time in milliseconds from a process.hrtime.bigint() start marker.
export const measureExecutionMs = (startTime: bigint): number => {
  const deltaNs = process.hrtime.bigint() - startTime
  return Number(deltaNs) / 1e6
}

//Instruments hot-path database queries and alerts if execution exceeds latency threshold (PERF-M-004).
export const recordDbMetric = (
  operationName: string,
  startTime: bigint,
  thresholdMs: number = 10
): number => {
  const deltaMs = measureExecutionMs(startTime)
  if (deltaMs > thresholdMs) {
    logger.warn(
      `[PERF-M-004 WARNING] Hot-path DB operation "${operationName}" exceeded ${thresholdMs}ms budget: ${deltaMs.toFixed(3)}ms`
    )
  }
  return deltaMs
}

//Standardized cache key generator for dashboard query operations.
export const getDashboardCacheKey = (prefix: string, tenantFilter: Record<string, any>): string => {
  return `dashboard:${prefix}:${JSON.stringify(sortKeysRecursively(tenantFilter))}`
}

//Standardized cache key generator for user lead portal.
export const getLeadPortalCacheKey = (userId: string): string => {
  return `dashboard:leadPortal:${userId}`
}

//Builds a deterministic, hashed cache key scoped by tenant brokerage and feature.
//Format: pp:{brokerageId}:{feature}:{hash}
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


//Invalidates all cached query responses for a given feature within a brokerage tenant.

export const invalidateTenantFeatureCache = async (
  brokerageId: string,
  feature: string
): Promise<void> => {
  const pattern = `pp:${brokerageId}:${feature}:*`
  await cacheInvalidatePattern(pattern)
}

//Completely purges all cached entries for a brokerage tenant.
export const invalidateBrokerageAllCache = async (brokerageId: string): Promise<void> => {
  const pattern = `pp:${brokerageId}:*`
  await cacheInvalidatePattern(pattern)
}

