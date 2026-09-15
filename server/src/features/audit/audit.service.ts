import mongoose from 'mongoose'
import { AuditLog } from '../../models/AuditLog.js'
import { AuditLogResponseDto, ListAuditLogsQuery } from './audit.types.js'
import { getPagination } from '../../utils/pagination.js'
import {
  recordDbMetric,
  safeJsonParse,
  buildCacheKey,
} from '../../utils/cacheHelper.js'
import { cacheGet, cacheSet, cacheInvalidatePattern } from '../../config/redis.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { logger } from '../../utils/logger.js'

// Lean projection constant (Rule PERF-M-002: omit heavy JSON blobs on list paths)
export const AUDIT_LIST_PROJECTION =
  '_id userId userEmail userRole brokerageId action resource resourceId ipAddress userAgent status failureReason createdAt'

// L1 In-Memory Caches (< 0.05ms) with bounded capacity and TTL
export const auditLogsL1Cache = new BoundedLruCache<{ logs: AuditLogResponseDto[]; total: number }>(500, 30)
export const auditLogDetailL1Cache = new BoundedLruCache<AuditLogResponseDto>(500, 60)

/**
 * Coordinated cache invalidation across L1 in-memory and L2 Redis (DI-003)
 */
export const invalidateAuditCaches = async (brokerageId?: string): Promise<void> => {
  auditLogsL1Cache.clear()
  if (brokerageId) {
    auditLogDetailL1Cache.clear()
  }

  // L2 Redis pattern eviction executed out-of-band
  try {
    const pattern = brokerageId ? `pp:${brokerageId}:audit-logs:*` : 'pp:*:audit-logs:*'
    await cacheInvalidatePattern(pattern)
  } catch (err: any) {
    logger.error("[server/src/features/audit/audit.service.ts: Line 36] ", err)
  }
}

// Format plain AuditLog document/aggregation object into DTO (Rule DI-002)
export const formatAuditLogDto = (log: any): AuditLogResponseDto => {
  const createdAtIso =
    log.createdAt instanceof Date
      ? log.createdAt.toISOString()
      : typeof log.createdAt === 'string'
        ? log.createdAt
        : log.createdAt
          ? new Date(log.createdAt).toISOString()
          : new Date().toISOString()

  return {
    id: log._id ? log._id.toString() : log.id?.toString() || '',
    userId: log.userId?.toString(),
    userEmail: log.userEmail,
    userRole: log.userRole,
    brokerageId: log.brokerageId?.toString(),
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    details: log.details,
    previousState: log.previousState,
    newState: log.newState,
    ipAddress: log.ipAddress || '127.0.0.1',
    userAgent: log.userAgent || 'system',
    status: log.status || 'success',
    failureReason: log.failureReason,
    createdAt: createdAtIso,
  }
}

// Normalize tenant filter ensuring string IDs are safely wrapped in ObjectId (Rule DI-001)
export const normalizeTenantFilter = (tenantFilter: Record<string, any>): Record<string, any> => {
  const normalized: Record<string, any> = { ...tenantFilter }
  if (
    normalized.brokerageId &&
    typeof normalized.brokerageId === 'string' &&
    mongoose.Types.ObjectId.isValid(normalized.brokerageId)
  ) {
    normalized.brokerageId = new mongoose.Types.ObjectId(normalized.brokerageId)
  }
  return normalized
}

// Build query filter with tenant scoping and date boundaries
export const buildAuditFilter = (query: ListAuditLogsQuery, tenantFilter: Record<string, any>) => {
  const filter: Record<string, any> = normalizeTenantFilter(tenantFilter)

  if (query.action) filter.action = query.action
  if (query.resource) filter.resource = query.resource
  if (query.userEmail) filter.userEmail = query.userEmail.toLowerCase()
  if (query.status) filter.status = query.status

  if (query.startDate || query.endDate) {
    filter.createdAt = {}
    if (query.startDate) {
      const start = new Date(query.startDate)
      if (!isNaN(start.getTime())) filter.createdAt.$gte = start
    }
    if (query.endDate) {
      const end = new Date(query.endDate)
      if (!isNaN(end.getTime())) filter.createdAt.$lte = end
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt
    }
  }

  return filter
}

// List audit logs with multi-tier caching (PERF-R-004), single-pass $facet aggregation (PERF-M-003), and projection constraints (PERF-M-002)
export const listAuditLogs = async (
  query: ListAuditLogsQuery,
  tenantFilter: Record<string, any> = {}
): Promise<{ logs: AuditLogResponseDto[]; total: number; source?: 'l1' | 'l2' | 'db' }> => {
  // 1. Build deterministic cache key (pp:{tenant}:audit-logs:{hash})
  const tenantKey = tenantFilter.brokerageId ? tenantFilter.brokerageId.toString() : 'super_admin'
  const cacheKey = buildCacheKey(tenantKey, 'audit-logs', query)

  // 2. L1 In-Memory Cache Check (< 0.05ms loopback)
  const l1Hit = auditLogsL1Cache.get(cacheKey)
  if (l1Hit) {
    return { ...l1Hit, source: 'l1' }
  }

  // 3. L2 Redis Cache Check (< 0.3ms loopback) (Rule DI-003: Redis failure fallback)
  try {
    const cached = await cacheGet(cacheKey)
    if (cached) {
      const parsed = safeJsonParse<{ logs: AuditLogResponseDto[]; total: number }>(cached)
      if (parsed) {
        auditLogsL1Cache.set(cacheKey, parsed, 30)
        return { ...parsed, source: 'l2' }
      }
    }
  } catch {
    // Gracefully fall through to MongoDB on cache read error (Rule DI-003)
  }

  // 4. Cache Miss: Execute Single-Pass $facet Aggregation backed by covered indexes (Rule PERF-M-003)
  const filter = buildAuditFilter(query, tenantFilter)
  const { limit, skip } = getPagination(query)
  const sortDirection: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1
  const allowedSortFields = ['createdAt', 'action', 'resource', 'status', 'userEmail']
  const sortField = query.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt'

  const dbStartTime = process.hrtime.bigint()
  const aggregationResult = await AuditLog.aggregate([
    { $match: filter },
    { $sort: { [sortField]: sortDirection } },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              userId: 1,
              userEmail: 1,
              userRole: 1,
              brokerageId: 1,
              action: 1,
              resource: 1,
              resourceId: 1,
              ipAddress: 1,
              userAgent: 1,
              status: 1,
              failureReason: 1,
              createdAt: 1,
              // Omit heavy JSON blobs (details, previousState, newState) for list performance (Rule PERF-M-002)
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ])

  // Instrument hot-path DB latency (Rule PERF-M-004)
  recordDbMetric('listAuditLogs', dbStartTime, 10)

  const rawLogs = aggregationResult[0]?.data || []
  const total = aggregationResult[0]?.totalCount[0]?.count || 0
  const result = {
    logs: rawLogs.map(formatAuditLogDto),
    total,
    source: 'db' as const,
  }

  // 5. Populate L1 and L2 Caches (Rule DI-003)
  auditLogsL1Cache.set(cacheKey, { logs: result.logs, total: result.total }, 30)
  try {
    await cacheSet(cacheKey, JSON.stringify({ logs: result.logs, total: result.total }), 30)
  } catch {
    // Fire-and-forget catch to prevent unhandled rejection
  }

  return result
}

// Retrieve single audit log by ID with full state snapshots (details, previousState, newState)
export const getAuditLogById = async (
  id: string,
  tenantFilter: Record<string, any> = {}
): Promise<(AuditLogResponseDto & { source?: 'l1' | 'l2' | 'db' }) | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null
  }

  const tenantKey = tenantFilter.brokerageId ? tenantFilter.brokerageId.toString() : 'super_admin'
  const cacheKey = buildCacheKey(tenantKey, 'audit-log-detail', { id })

  // 1. L1 In-Memory Cache Check (< 0.05ms)
  const l1Hit = auditLogDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    return { ...l1Hit, source: 'l1' }
  }

  // 2. L2 Redis Cache Check
  try {
    const cached = await cacheGet(cacheKey)
    if (cached) {
      const parsed = safeJsonParse<AuditLogResponseDto>(cached)
      if (parsed) {
        auditLogDetailL1Cache.set(cacheKey, parsed, 60)
        return { ...parsed, source: 'l2' }
      }
    }
  } catch {
    // Gracefully fall through
  }

  // 3. Cache Miss: Query Database (Rule DI-001)
  const normalizedFilter = normalizeTenantFilter(tenantFilter)
  const filter: Record<string, any> = {
    _id: new mongoose.Types.ObjectId(id),
    ...normalizedFilter,
  }

  const dbStartTime = process.hrtime.bigint()
  const doc = await AuditLog.findOne(filter).lean()
  recordDbMetric('getAuditLogById', dbStartTime, 10)

  if (!doc) {
    return null
  }

  const dto = formatAuditLogDto(doc)
  auditLogDetailL1Cache.set(cacheKey, dto, 60)
  try {
    await cacheSet(cacheKey, JSON.stringify(dto), 60)
  } catch {
    // Fire-and-forget
  }

  return { ...dto, source: 'db' }
}
