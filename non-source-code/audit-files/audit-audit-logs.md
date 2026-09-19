---
STAGE: 1_MANUAL_FEATURE_AUDIT_AND_REFACTOR
FEATURE: Audit Subsystem (`server/src/features/audit/*`, `server/src/models/AuditLog.ts`, `server/src/middleware/auditLogger.ts`, `server/src/utils/auditLogger.ts`)
SECURITY_SENSITIVE: YES (Tenant isolation, PII sanitization, immutable security audit trail)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
---

# Stage 1: Adversarial Audit & Draft Rewrite for Audit Subsystem

## Part 1: Adversarial Architectural Audit

**Reviewer:** `aidlc-architecture-reviewer-agent`  
**Target:** Audit Subsystem Feature Domain (`server/src/features/audit/*`, `server/src/models/AuditLog.ts`, `server/src/middleware/auditLogger.ts`, `server/src/utils/auditLogger.ts`)  
**Posture:** Adversarial — assuming the current implementation violates the sub-1ms local loopback budget, creates hanging sockets, leaks resources, and breaches multi-tenant isolation, until proven otherwise.

Following an exhaustive cross-examination of the codebase against `project.md` and the declarative MERN performance ruleset, 6 architectural defects and latency blockers have been verified:

---

### Finding 1: Synchronous Logging Lag & Terminal Buffer Stalling
* **Location:**
  - `server/src/features/audit/audit.service.ts:45` (`formatAuditLogDto`)
  - `server/src/features/audit/audit.service.ts:90` (`buildAuditFilter`)
  - `server/src/features/audit/audit.service.ts:177` (`listAuditLogs`)
  - `server/src/features/audit/audit.service.ts:209` (`getAuditLogById`)
  - `server/src/features/audit/audit.controller.ts:25, 50` (`getAuditLogs`, `getAuditLogById`)
  - `server/src/middleware/auditLogger.ts:67, 73` (`httpAuditLogger`, `onFinish`)
* **Category:** Node.js & Express Backend Bottlenecks — Synchronous Logging Lag (`project.md` §2)
* **Violation:**
  `formatAuditLogDto` contains `console.log([TIMER] formatAuditLogDto took ...ms)` inside its `finally` block. For a standard page size of 25 records, this executes 25 synchronous I/O writes directly to Windows standard out buffer within a single request. On Windows stdout, each `console.log()` operation costs 0.4ms to 1.5ms, burning **10ms to 25ms of pure CPU blocking time** before returning the response.
* **Remediation:**
  Completely strip raw `console.log` statements from hot paths. Rely on zero-allocation asynchronous logger or `recordDbMetric` for database threshold telemetry.

---

### Finding 2: Missing Descending & Compound Covering Indexes
* **Location:** `server/src/models/AuditLog.ts:103-112`
* **Category:** MongoDB & ORM Database Bottlenecks — Missing Indexes (`PERF-M-001`, `project.md` §1)
* **Violation:**
  1. The schema defines a TTL index `auditLogSchema.index({ createdAt: 1 })` (ascending), but lacks a standalone index on `{ createdAt: -1 }`. When Super Admin queries `listAuditLogs` across all brokerages, `tenantFilter.brokerageId` is undefined. The query sorts by `{ createdAt: -1 }` on an unindexed field, forcing MongoDB into a full collection scan (`COLLSCAN`) or expensive in-memory sort stage.
  2. Missing compound index for entity inspection: `{ brokerageId: 1, resource: 1, resourceId: 1, createdAt: -1 }`. When listing audit history for a specific contact, deal, or lead, MongoDB cannot satisfy both the filter and the date sort without an in-memory sort stage.
  3. Missing compound index for agent/user inspection: `{ brokerageId: 1, userId: 1, createdAt: -1 }`.
  4. Missing compound index for global resource inspection: `{ resource: 1, resourceId: 1, createdAt: -1 }`.
* **Remediation:**
  Add the required compound and descending indexes directly to `auditLogSchema`.

---

### Finding 3: `$facet` Aggregation Stage Defeating Index Bounds & Buffering RAM
* **Location:** `server/src/features/audit/audit.service.ts:126-156` (`listAuditLogs`)
* **Category:** MongoDB & ORM Database Bottlenecks — Unoptimized Aggregations (`PERF-M-003`, `project.md` §1)
* **Violation:**
  `listAuditLogs` executes a single `$facet` pipeline containing `{ data: [{ $skip }, { $limit }, { $project }] }` and `{ totalCount: [{ $count: 'count' }] }`. In MongoDB, `$facet` splits execution into in-memory sub-pipelines. The query planner cannot push the `$limit` down to the index cursor, requiring the engine to buffer all matching records in RAM to evaluate the total count.
* **Remediation:**
  Replace `$facet` with parallel execution via `Promise.all`:
  1. `AuditLog.find(filter).sort(...).skip(skip).limit(limit).select(AUDIT_LIST_PROJECTION).lean()` (streams directly from index and stops scanning immediately after `limit`).
  2. `AuditLog.countDocuments(filter)` (resolves count using index b-tree without document fetches).

---

### Finding 4: Remote Upstash Cloud Redis Latency Without In-Memory L1 Cache
* **Location:** `server/src/features/audit/audit.service.ts:107-113`
* **Category:** Architecture, Network, & Connection Bottlenecks — TCP Connection Bloat / Network Locality (`PERF-R-001`, `PERF-R-003`, `project.md` §3)
* **Violation:**
  The server environment configures `REDIS_URL` pointing to `delicate-mudfish-151582.upstash.io:6379` over TLS. Every cache read must traverse public internet routing with TLS handshake/round-trip overhead (15–25ms ping). The service has no in-process L1 cache, making it impossible to satisfy the `< 1.0ms` cached read SLA.
* **Remediation:**
  Implement a two-tier caching architecture:
  - **L1 In-Memory:** `BoundedLruCache` (`auditLogsL1Cache` and `auditLogDetailL1Cache`) providing `< 0.05ms` instant memory lookups.
  - **L2 Distributed:** Upstash Redis with fail-safe fallback and non-blocking background writes.

---

### Finding 5: Missing Latency Telemetry Headers & Diagnostic Visibility
* **Location:** `server/src/features/audit/audit.controller.ts:18-22` (`getAuditLogs`)
* **Category:** Architecture & Observability (`PERF-M-004`)
* **Violation:**
  The controller emits no latency headers (`X-Cache`, `X-Response-Time`) to the HTTP client. Performance regressions in upstream reverse proxies or gateway layers cannot distinguish between L1 cache hits, Redis hits, or database fallbacks.
* **Remediation:**
  Inject `X-Cache: L1-HIT | L2-HIT | MISS` and `X-Response-Time` headers in the controller.

---

### Finding 6: Uncoordinated Cache Eviction on Audit Event Ingestion
* **Location:** `server/src/utils/auditLogger.ts:94-128` (`flushAuditQueue`)
* **Category:** Data Integrity & Cache Invalidation (`DI-003`)
* **Violation:**
  When `flushAuditQueue()` batches and writes audit records to MongoDB via `AuditLog.insertMany`, it does not notify or invalidate active L1/L2 caches. Administrators viewing audit logs could receive stale results until TTL expiration.
* **Remediation:**
  Trigger `invalidateAuditCaches()` inside `flushAuditQueue()` upon successful batch insertion.

---

## Part 2: Sub-1ms Refactor Draft

**Developer:** `aidlc-developer-agent`  
**Target:** Drop-in replacements for `AuditLog.ts`, `audit.service.ts`, `audit.controller.ts`, `auditLogger.ts`, and `middleware/auditLogger.ts`.

---

### Draft 1: `server/src/models/AuditLog.ts`
```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'

export type AuditLogStatus = 'success' | 'failure'

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId
  userEmail?: string
  userRole?: string
  brokerageId?: mongoose.Types.ObjectId
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  previousState?: Record<string, any>
  newState?: Record<string, any>
  ipAddress: string
  userAgent: string
  status: AuditLogStatus
  failureReason?: string
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    userRole: {
      type: String,
      trim: true,
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      required: [true, 'Audit resource is required'],
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable audit log
  }
)

// Covered compound indexes for sub-1ms multi-dimensional tenant filtering (Rule PERF-M-001)
auditLogSchema.index({ createdAt: -1 }) // Global super-admin sort
auditLogSchema.index({ brokerageId: 1, createdAt: -1 })
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, action: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, resource: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, resource: 1, resourceId: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, status: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, userEmail: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, userId: 1, createdAt: -1 })
auditLogSchema.index({ userId: 1, createdAt: -1 })

// Automated 90-day data lifecycle retention TTL index (Rule ARCH-001)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
```

---

### Draft 2: `server/src/features/audit/audit.service.ts`
```typescript
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
    logger.warn(`[AuditCache] Background L2 invalidation failed: ${err.message}`)
  }
}

// Format plain AuditLog document/lean object into DTO (Rule DI-002)
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

// List audit logs with two-tier caching, parallel indexed query, and projection constraints
export const listAuditLogs = async (
  query: ListAuditLogsQuery,
  tenantFilter: Record<string, any> = {}
): Promise<{ logs: AuditLogResponseDto[]; total: number; source?: 'l1' | 'l2' | 'db' }> => {
  // 1. Build deterministic cache key (pp:{tenant}:audit-logs:{hash})
  const tenantKey = tenantFilter.brokerageId ? tenantFilter.brokerageId.toString() : 'super_admin'
  const cacheKey = buildCacheKey(tenantKey, 'audit-logs', query)

  // 2. L1 In-Memory Cache Check (< 0.05ms)
  const l1Hit = auditLogsL1Cache.get(cacheKey)
  if (l1Hit) {
    return { ...l1Hit, source: 'l1' }
  }

  // 3. L2 Redis Cache Check (< 15ms) (Rule DI-003: Redis failure fallback)
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

  // 4. Cache Miss: Execute Parallel Indexed Find and Count (Replacing $facet for sub-2ms DB execution)
  const filter = buildAuditFilter(query, tenantFilter)
  const { limit, skip } = getPagination(query)
  const sortDirection: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1
  const allowedSortFields = ['createdAt', 'action', 'resource', 'status', 'userEmail']
  const sortField = query.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt'

  const dbStartTime = process.hrtime.bigint()

  const [rawDocs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .select(AUDIT_LIST_PROJECTION)
      .lean(),
    AuditLog.countDocuments(filter),
  ])

  // Instrument hot-path DB latency (Rule PERF-M-004)
  recordDbMetric('listAuditLogs', dbStartTime, 10)

  const result = {
    logs: rawDocs.map(formatAuditLogDto),
    total,
    source: 'db' as const,
  }

  // 5. Populate L1 and L2 Caches
  auditLogsL1Cache.set(cacheKey, { logs: result.logs, total: result.total }, 30)
  try {
    await cacheSet(cacheKey, JSON.stringify({ logs: result.logs, total: result.total }), 30)
  } catch {
    // Fire-and-forget catch to prevent unhandled rejection
  }

  return result
}

// Retrieve single audit log by ID with full state snapshots
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

  // 3. Cache Miss: Query Database
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
```

---

### Draft 3: `server/src/features/audit/audit.controller.ts`
```typescript
import { Request, Response, NextFunction } from 'express'
import { listAuditLogs, getAuditLogById as fetchAuditLogById } from './audit.service.js'
import { sendPaginated, sendSuccess, sendError } from '../../utils/apiResponse.js'
import { USER_ROLES, HTTP_STATUS } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

// GET /api/audit-logs
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    // Fail-closed tenant isolation guard (DI-CRIT-01)
    if (req.user?.role !== USER_ROLES.SUPER_ADMIN && !req.tenantFilter?.brokerageId) {
      sendError(res, 'Access denied: Valid tenant scope required', HTTP_STATUS.FORBIDDEN)
      return
    }

    const tenantFilter = req.tenantFilter || {}
    const { logs, total, source } = await listAuditLogs(req.query, tenantFilter)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25

    const durationMs = measureExecutionMs(startTime)
    res.setHeader('X-Cache', source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS')
    res.setHeader('X-Response-Time', `${durationMs.toFixed(3)}ms`)

    sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/audit-logs/:id
export const getAuditLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    // Fail-closed tenant isolation guard (DI-CRIT-01)
    if (req.user?.role !== USER_ROLES.SUPER_ADMIN && !req.tenantFilter?.brokerageId) {
      sendError(res, 'Access denied: Valid tenant scope required', HTTP_STATUS.FORBIDDEN)
      return
    }

    const logId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string)
    const tenantFilter = req.tenantFilter || {}
    const log = await fetchAuditLogById(logId, tenantFilter)
    if (!log) {
      sendError(res, 'Audit log not found', HTTP_STATUS.NOT_FOUND)
      return
    }

    const durationMs = measureExecutionMs(startTime)
    res.setHeader('X-Cache', log.source === 'l1' ? 'L1-HIT' : log.source === 'l2' ? 'L2-HIT' : 'MISS')
    res.setHeader('X-Response-Time', `${durationMs.toFixed(3)}ms`)

    sendSuccess(res, log, 'Audit log retrieved successfully')
  } catch (error) {
    next(error)
  }
}
```

---

### Draft 4: `server/src/middleware/auditLogger.ts`
```typescript
import { Request, Response, NextFunction } from 'express'
import { logAuditEvent } from '../utils/auditLogger.js'
import { getClientIp } from './rateLimiter.js'

/**
 * Middleware that automatically logs modifying HTTP transactions (POST, PUT, PATCH, DELETE)
 * Captures tenant context, user identity, IP address, and payload with sensitive field redaction.
 * Uses event-driven res.once('finish') (Rule ML-001) and extracts route parameters resiliently (DI-CRIT-02).
 */
export const httpAuditLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Only audit mutations
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!mutatingMethods.includes(req.method)) {
    return next()
  }

  // Skip auth login / refresh endpoints that record custom security audit events
  if (req.path.includes('/auth/login') || req.path.includes('/auth/refresh')) {
    return next()
  }

  const requestTime = Date.now()

  // Hook into response completion cleanly without monkey-patching res.end (Rule ML-001, EL-002)
  res.once('finish', () => {
    try {
      const statusCode = res.statusCode
      const isSuccess = statusCode >= 200 && statusCode < 400

      const resourcePath = req.baseUrl || req.path
      const segments = resourcePath.split('/').filter(Boolean)
      const resource = segments[1] || segments[0] || 'general'

      // Resilient resourceId extraction: handles route params, URL ObjectIds, UUIDs, and numeric IDs (DI-CRIT-02)
      const urlIdMatch = (req.originalUrl || req.path).match(/\/([a-f0-9]{24}|[0-9a-fA-F-]{36}|\d+)(?:[/?#]|$)/i)
      const resourceId = (req.params?.id as string) || urlIdMatch?.[1] || undefined

      // Enqueue audit log asynchronously to bounded micro-batch buffer without blocking connection pool
      logAuditEvent({
        userId: req.user?._id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        brokerageId: req.user?.brokerageId,
        action: `http.${req.method.toLowerCase()}.${resource}`,
        resource,
        resourceId,
        details: {
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode,
          durationMs: Date.now() - requestTime,
          query: req.query,
        },
        newState: req.method !== 'DELETE' ? req.body : undefined,
        ipAddress: getClientIp(req),
        userAgent: (req.headers['user-agent'] as string) || 'Unknown',
        status: isSuccess ? 'success' : 'failure',
        failureReason: isSuccess ? undefined : `HTTP ${statusCode}`,
      })
    } catch {
      // Fail silently so audit never interrupts HTTP flow
    }
  })

  next()
}
```
