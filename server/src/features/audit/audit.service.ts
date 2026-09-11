import mongoose from 'mongoose'
import { AuditLog } from '../../models/AuditLog.js'
import { AuditLogResponseDto, ListAuditLogsQuery } from './audit.types.js'
import { getPagination } from '../../utils/pagination.js'
import {
  measureExecutionMs,
  recordDbMetric,
  safeJsonParse,
  buildCacheKey,
} from '../../utils/cacheHelper.js'
import { cacheGet, cacheSet } from '../../config/redis.js'

// Format plain AuditLog document/aggregation object into DTO (Rule DI-002)
export const formatAuditLogDto = (log: any): AuditLogResponseDto => {
  const startTime = process.hrtime.bigint()
  try {
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
  } finally {
    console.log(`[TIMER] formatAuditLogDto took ${measureExecutionMs(startTime).toFixed(3)}ms`)
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
  const startTime = process.hrtime.bigint()
  try {
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
  } finally {
    console.log(`[TIMER] buildAuditFilter took ${measureExecutionMs(startTime).toFixed(3)}ms`)
  }
}

// List audit logs with multi-tier caching (PERF-R-004), single-pass $facet aggregation (PERF-M-003), and projection constraints (PERF-M-002)
export const listAuditLogs = async (
  query: ListAuditLogsQuery,
  tenantFilter: Record<string, any> = {}
): Promise<{ logs: AuditLogResponseDto[]; total: number }> => {
  const listStartTime = process.hrtime.bigint()
  try {
    // 1. Build deterministic cache key (pp:{tenant}:audit-logs:{hash})
    const tenantKey = tenantFilter.brokerageId ? tenantFilter.brokerageId.toString() : 'super_admin'
    const cacheKey = buildCacheKey(tenantKey, 'audit-logs', query)

    // 2. Cache Hit Fast Path (< 0.3ms loopback) (Rule DI-003: Redis failure fallback)
    try {
      const cached = await cacheGet(cacheKey)
      if (cached) {
        const parsed = safeJsonParse<{ logs: AuditLogResponseDto[]; total: number }>(cached)
        if (parsed) {
          return parsed
        }
      }
    } catch {
      // Gracefully fall through to MongoDB on cache read error (Rule DI-003)
    }

    // 3. Cache Miss: Execute Single-Pass $facet Aggregation (Rule PERF-M-003)
    const filter = buildAuditFilter(query, tenantFilter)
    const { limit, skip } = getPagination(query)
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1
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
    }

    // 4. Populate Cache with short 15s TTL (Rule DI-003)
    try {
      await cacheSet(cacheKey, JSON.stringify(result), 15)
    } catch {
      // Fire-and-forget catch to prevent unhandled rejection
    }

    return result
  } finally {
    console.log(`[TIMER] listAuditLogs took ${measureExecutionMs(listStartTime).toFixed(3)}ms`)
  }
}

// Retrieve single audit log by ID with full state snapshots (details, previousState, newState)
export const getAuditLogById = async (
  id: string,
  tenantFilter: Record<string, any> = {}
): Promise<AuditLogResponseDto | null> => {
  const startTime = process.hrtime.bigint()
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null
    }

    // Wrap in explicit ObjectId cast (Rule DI-001)
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

    return formatAuditLogDto(doc)
  } finally {
    console.log(`[TIMER] getAuditLogById took ${measureExecutionMs(startTime).toFixed(3)}ms`)
  }
}
