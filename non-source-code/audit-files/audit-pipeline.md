---
STAGE: MANUAL_FEATURE_AUDIT_AND_REFACTOR
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
FEATURE: Pipeline (`server/src/features/pipeline/`, `server/src/models/Pipeline.ts`, `server/src/models/Deal.ts`)
SECURITY_SENSITIVE: YES (touches multi-tenant brokerage isolation, role authorization, pipeline ownership, deal/stage data integrity)
---

# Stage 1: Adversarial Audit & Draft Rewrite for Pipeline Feature

## Part 1: Adversarial Architectural Audit

**Reviewer:** `aidlc-architecture-reviewer-agent`  
**Target:** Pipeline Feature (`server/src/features/pipeline/`, `server/src/models/Pipeline.ts`, `server/src/models/Deal.ts`)  
**Posture:** Adversarial — assuming the current implementation violates the sub-1ms local loopback budget, creates hanging sockets, causes N+1 query storms, and leaks resources, until proven otherwise.

---

### Adversarial Findings Checklist

#### 1. Unhandled Silent Returns & TCP Socket Hanging (`ML-001` / `project.md § Other Issues #4`)
* **Location:** `server/src/features/pipeline/pipeline.controller.ts`: Lines 24, 33, 42, 52, 62, 72, 82, 92, 102
* **Violation:** In all 9 controller route handlers (`list`, `get`, `create`, `update`, `remove`, `createStage`, `patchStage`, `patchReorder`, `removeStage`), the code contains:
  ```ts
  if (!req.user) return
  ```
  If `req.user` is undefined or null (e.g., auth middleware bypass, race condition, or token invalidation), the handler executes a silent `return void` without ending the response, calling `res.status().json()`, or invoking `next()`. The client TCP connection remains open until Node.js or OS socket timeout (120s), exhausting server socket descriptors and causing client-side connection hangs.
* **Remediation:** Replace every silent return with an explicit `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.

#### 2. The N+1 Aggregation Storm on Pipeline Listing (`project.md § 2.3`, `project.md § Other Issues #1`)
* **Location:** `server/src/features/pipeline/pipeline.service.ts`: Lines 84–95 (`listPipelines`)
* **Violation:** In `listPipelines`:
  ```ts
  const pipelines = await Pipeline.find(tenantFilter).sort({ isDefault: -1, createdAt: 1 }).lean() as unknown as IPipeline[]

  const results: PipelineResponse[] = []
  for (const p of pipelines) {
    const stats = await getStageStats(p._id as mongoose.Types.ObjectId)
    results.push(serializePipeline(p, stats))
  }
  return results
  ```
  For $N$ pipelines configured in a brokerage, this executes 1 pipeline fetch followed by $N$ separate, un-pipelined sequential `Deal.aggregate()` database roundtrips. In a brokerage with 5–10 pipelines, this results in 6–11 sequential network roundtrips over the Mongo driver socket (adding 25ms–60ms of blocking latency), completely destroying the sub-10ms uncached SLA.
* **Remediation:** Refactor `listPipelines` to extract all `pipelineIds`, execute a single batch aggregation query (`$match: { pipelineId: { $in: pipelineIds }, isDeleted: false }`) grouped by `{ pipelineId: '$pipelineId', stageId: '$stageId' }`, and build a multi-level stats map in memory in one pass.

#### 3. Complete Lack of Caching on Hot Read Paths (`project.md § 3.2`)
* **Location:** `server/src/features/pipeline/pipeline.service.ts`: Lines 84–95 (`listPipelines`), Lines 97–116 (`getPipelineById`)
* **Violation:** Pipeline metadata and stage configurations change very infrequently (only when brokerage owners customize stages), yet `listPipelines` and `getPipelineById` query MongoDB on every single request. Every page load, navigation event, and Kanban view triggers cold database queries.
* **Remediation:** Introduce a 2-tier caching engine:
  - L1: In-memory `BoundedLruCache` (60s TTL, <0.05ms access time) for pipeline lists and pipeline detail objects.
  - L2: Redis cache via `cacheGet`/`cacheSet` with tenant-scoped keys (`pp:tenant:<brokerageId>:pipeline:*`).
  - Add fail-safe try/catch isolation with automatic MongoDB fallback on cache error (`DI-003`).
  - Add coordinated cache invalidation (`invalidatePipelineCaches`) on all mutation pathways.

#### 4. Missing Compound Covering & Sort Indexes (`PERF-M-001`, `project.md § 1.1`, `project.md § Other Issues #2`)
* **Location:** `server/src/models/Pipeline.ts` & `server/src/models/Deal.ts`
* **Violation:**
  - `Pipeline.ts`: `listPipelines` queries with `Pipeline.find(tenantFilter).sort({ isDefault: -1, createdAt: 1 })`. The existing indexes are `{ brokerageId: 1, name: 1 }` and `{ brokerageId: 1, isDefault: 1 }`. Neither covers `{ isDefault: -1, createdAt: 1 }`. MongoDB must perform an in-memory sort stage on every query.
  - `Deal.ts`: `getStageStats` executes:
    `Deal.aggregate([ { $match: { pipelineId, isDeleted: false } }, { $group: { _id: '$stageId', dealCount: { $sum: 1 }, totalValue: { $sum: '$dealValue' } } } ])`.
    In `Deal.ts`, existing indexes start with `brokerageId`, `assignedAgentId`, or `contactId`. None have `pipelineId` as the leading index key! This results in an inefficient index scan or collection scan (`COLLSCAN`).
* **Remediation:**
  - Add compound index to `Pipeline.ts`: `{ brokerageId: 1, isDefault: -1, createdAt: 1 }`.
  - Add compound covering index to `Deal.ts`: `{ pipelineId: 1, isDeleted: 1, stageId: 1, dealValue: 1 }`. This allows stage stat aggregation to be a 100% index-covered query (`totalDocsExamined === 0`).

#### 5. Non-Essential Side Effects Blocking the Client Response (`project.md § Other Issues #5`)
* **Location:** `server/src/features/pipeline/pipeline.service.ts`: Lines 71–79, 139–147, 176–184, 217–225, 254–262, 290–298, 344–352
* **Violation:** In all 7 mutation operations (`createPipeline`, `updatePipeline`, `deletePipeline`, `addStage`, `updateStage`, `reorderStages`, `deleteStage`), `await logAuditEvent(...)` is called synchronously on the critical request path before sending the HTTP response. Audit logging writes to disk/DB (taking 3ms–15ms), artificially inflating client response times.
* **Remediation:** Dispatch `logAuditEvent` calls asynchronously in decoupled background microtasks with dedicated `.catch(err => logger.error(...))` handlers.

#### 6. Double Database Roundtrips on Pipeline Deletion (`project.md § Other Issues #1`)
* **Location:** `server/src/features/pipeline/pipeline.service.ts`: Lines 159, 174
* **Violation:** In `deletePipeline`:
  ```ts
  const pipeline = await Pipeline.findById(id) // Roundtrip 1
  ...
  await Pipeline.findByIdAndDelete(id) // Roundtrip 2
  ```
  Fetching the full Mongoose document just to verify existence and check brokerage access before issuing a separate `findByIdAndDelete` wastes an entire network roundtrip.
* **Remediation:** Use `.select('_id name brokerageId').lean()` for existence and access verification, or streamline deletion with atomic filters.

#### 7. Missing Lean Projections and Full Mongoose Hydration Overhead (`PERF-M-001`, `project.md § 1.3`)
* **Location:** `server/src/features/pipeline/pipeline.service.ts`: Lines 105, 125, 196, 239, 275, 311
* **Violation:** `getPipelineById`, `updatePipeline`, `addStage`, `updateStage`, `reorderStages`, and `deleteStage` execute `Pipeline.findById(id)` without `.lean()` or field projections, hydrating full Mongoose documents into V8 heap with change tracking, virtuals, and prototypes even when performing read-only or targeted operations.
* **Remediation:** Apply `.lean()` on read-only pathways (`getPipelineById`), and use atomic `$push`, `$set`, `$pull` operations where applicable or lean reads with atomic updates.

#### 8. Missing High-Resolution Latency Telemetry & Console Counters (`PERF-M-004` & User Requirement)
* **Location:** `server/src/features/pipeline/pipeline.service.ts` and `pipeline.controller.ts`
* **Violation:** DB calls and controller handlers lack high-resolution `process.hrtime.bigint()` timing measurements and console output. Regressions in latency cannot be detected in the local terminal or loopback monitoring.
* **Remediation:** Wrap every service function and controller handler with `process.hrtime.bigint()` timers, log elapsed execution times directly to console (`[PIPELINE-PERF][service:<fnName>] <ms> (source: L1|L2|DB)` and `[PIPELINE-PERF][controller:<handlerName>] <ms>`), and inject `X-Cache` and `X-Response-Time` HTTP diagnostic headers.

---

## Part 2: Draft Drop-In Replacement Code

### 1. Draft `server/src/models/Pipeline.ts` (Index Additions)

```typescript
// Compound index for sorted listing by default and creation time
pipelineSchema.index({ brokerageId: 1, isDefault: -1, createdAt: 1 })
```

### 2. Draft `server/src/models/Deal.ts` (Index Additions)

```typescript
// Compound covering index for stage statistics aggregation:
// covers { pipelineId, isDeleted } filter and { stageId, dealValue } grouping
dealSchema.index({ pipelineId: 1, isDeleted: 1, stageId: 1, dealValue: 1 })
```

### 3. Draft `server/src/features/pipeline/pipeline.types.ts` (Cache & Telemetry Extensions)

```typescript
export interface CachedPipelineListResult {
  pipelines: PipelineResponse[]
  source: 'l1' | 'l2' | 'db'
}

export interface CachedPipelineDetailResult {
  pipeline: PipelineResponse
  source: 'l1' | 'l2' | 'db'
}
```

### 4. Draft `server/src/features/pipeline/pipeline.service.ts` (Optimized Service Layer)

```typescript
import mongoose from 'mongoose'
import { Pipeline, DEFAULT_PIPELINE_STAGES, IPipeline, IPipelineStage } from '../../models/Pipeline.js'
import { Deal } from '../../models/Deal.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { cacheGet, cacheSet } from '../../config/redis.js'
import {
  buildCacheKey,
  invalidateTenantFeatureCache,
  safeJsonParse,
  measureExecutionMs,
  recordDbMetric,
} from '../../utils/cacheHelper.js'
import {
  PipelineResponse,
  serializePipeline,
  CreatePipelineInput,
  UpdatePipelineInput,
  CreateStageInput,
  UpdateStageInput,
  ReorderStagesInput,
  CachedPipelineListResult,
  CachedPipelineDetailResult,
} from './pipeline.types.js'

// ── Two-Tier Caching Engine ──────────────────────────────
export const pipelineListL1Cache = new BoundedLruCache<PipelineResponse[]>(500, 60)
export const pipelineDetailL1Cache = new BoundedLruCache<PipelineResponse>(500, 60)
const PIPELINE_CACHE_TTL = 300 // 5 minutes in Redis

// Cache invalidation utility
export const invalidatePipelineCaches = async (brokerageId?: string, pipelineId?: string): Promise<void> => {
  pipelineListL1Cache.clear()
  pipelineDetailL1Cache.clear()

  if (brokerageId) {
    try {
      await invalidateTenantFeatureCache(brokerageId, 'pipeline')
      // Also invalidate deals cache since pipeline stage definitions affect Kanban
      await invalidateTenantFeatureCache(brokerageId, 'deals')
    } catch (err: any) {
      logger.warn(`[PipelineCache] Redis invalidation failed for brokerage ${brokerageId}: ${err.message}`)
    }
  }
}

// ── Batch & Single Stage Stats Aggregators ────────────────
export const getStageStats = async (pipelineId: mongoose.Types.ObjectId): Promise<Map<string, { dealCount: number; totalValue: number }>> => {
  const t0 = process.hrtime.bigint()
  const stats = await Deal.aggregate([
    { $match: { pipelineId, isDeleted: false } },
    {
      $group: {
        _id: '$stageId',
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$dealValue' },
      },
    },
  ])
  const map = new Map<string, { dealCount: number; totalValue: number }>()
  for (const s of stats) {
    if (s._id) {
      map.set(s._id.toString(), { dealCount: s.dealCount, totalValue: s.totalValue })
    }
  }
  const duration = recordDbMetric('getStageStats', t0, 10)
  console.log(`[PIPELINE-PERF][service:getStageStats] ${duration.toFixed(3)}ms`)
  return map
}

export const getBatchStageStats = async (
  pipelineIds: mongoose.Types.ObjectId[]
): Promise<Map<string, Map<string, { dealCount: number; totalValue: number }>>> => {
  const t0 = process.hrtime.bigint()
  if (pipelineIds.length === 0) return new Map()

  const stats = await Deal.aggregate([
    { $match: { pipelineId: { $in: pipelineIds }, isDeleted: false } },
    {
      $group: {
        _id: { pipelineId: '$pipelineId', stageId: '$stageId' },
        dealCount: { $sum: 1 },
        totalValue: { $sum: '$dealValue' },
      },
    },
  ])

  const resultMap = new Map<string, Map<string, { dealCount: number; totalValue: number }>>()
  for (const s of stats) {
    if (!s._id || !s._id.pipelineId || !s._id.stageId) continue
    const pid = s._id.pipelineId.toString()
    const sid = s._id.stageId.toString()
    if (!resultMap.has(pid)) {
      resultMap.set(pid, new Map())
    }
    resultMap.get(pid)!.set(sid, { dealCount: s.dealCount, totalValue: s.totalValue })
  }

  const duration = recordDbMetric('getBatchStageStats', t0, 10)
  console.log(`[PIPELINE-PERF][service:getBatchStageStats] ${duration.toFixed(3)}ms (pipelines: ${pipelineIds.length})`)
  return resultMap
}

// ── Pipeline CRUD with Sub-1ms Caching & High-Res Timers ──

export const createPipeline = async (
  data: CreatePipelineInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  const brokerageId = caller.brokerageId
  if (!brokerageId) {
    throw new AppError('Brokerage ID required', HTTP_STATUS.BAD_REQUEST)
  }

  const existing = await Pipeline.findOne({ brokerageId, name: data.name }).select('_id').lean()
  if (existing) {
    throw new AppError('A pipeline with this name already exists in your brokerage', HTTP_STATUS.CONFLICT)
  }

  const count = await Pipeline.countDocuments({ brokerageId })
  const isDefault = count === 0

  const stages = data.stages && data.stages.length > 0
    ? data.stages.map((s, i) => ({ ...s, order: i }))
    : DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s }))

  const pipeline = await Pipeline.create({
    name: data.name,
    brokerageId,
    isDefault,
    stages,
    createdBy: caller._id,
  })

  // Offload non-essential audit logging
  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.created',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipeline._id.toString(),
      details: { name: data.name, stageCount: stages.length },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.created:', err))
  })

  await invalidatePipelineCaches(brokerageId.toString())

  const result = serializePipeline(pipeline)
  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:createPipeline] ${duration.toFixed(3)}ms`)
  return result
}

export const listPipelines = async (
  tenantFilter: Record<string, any>
): Promise<CachedPipelineListResult> => {
  const t0 = process.hrtime.bigint()
  const brokerageId = tenantFilter.brokerageId ? tenantFilter.brokerageId.toString() : 'global'
  const cacheKey = buildCacheKey(brokerageId, 'pipeline', { list: true, filter: tenantFilter })

  // 1. L1 in-memory cache check (<0.05ms)
  const l1Hit = pipelineListL1Cache.get(cacheKey)
  if (l1Hit) {
    const duration = measureExecutionMs(t0)
    console.log(`[PIPELINE-PERF][service:listPipelines] ${duration.toFixed(3)}ms (source: L1)`)
    return { pipelines: l1Hit, source: 'l1' }
  }

  // 2. L2 Redis cache check with fail-safe fallback (DI-003)
  try {
    const l2Raw = await cacheGet(cacheKey)
    if (l2Raw) {
      const parsed = safeJsonParse<PipelineResponse[]>(l2Raw)
      if (parsed) {
        pipelineListL1Cache.set(cacheKey, parsed)
        const duration = measureExecutionMs(t0)
        console.log(`[PIPELINE-PERF][service:listPipelines] ${duration.toFixed(3)}ms (source: L2)`)
        return { pipelines: parsed, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[PipelineCache] L2 read failed in listPipelines: ${err.message}`)
  }

  // 3. Database fetch with single-pass batch aggregation (eliminates N+1)
  const tDb = process.hrtime.bigint()
  const pipelines = (await Pipeline.find(tenantFilter)
    .sort({ isDefault: -1, createdAt: 1 })
    .lean()) as unknown as IPipeline[]

  const pipelineIds = pipelines.map((p) => new mongoose.Types.ObjectId(p._id.toString()))
  const batchStats = await getBatchStageStats(pipelineIds)

  const results: PipelineResponse[] = pipelines.map((p) => {
    const pidStr = p._id.toString()
    const statsMap = batchStats.get(pidStr) || new Map()
    return serializePipeline(p, statsMap)
  })

  recordDbMetric('listPipelines_full', tDb, 10)

  // Asynchronously populate L2 and L1 caches
  pipelineListL1Cache.set(cacheKey, results)
  cacheSet(cacheKey, JSON.stringify(results), PIPELINE_CACHE_TTL).catch((err) => {
    logger.warn(`[PipelineCache] Failed to write L2 cache for listPipelines: ${err.message}`)
  })

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:listPipelines] ${duration.toFixed(3)}ms (source: DB)`)
  return { pipelines: results, source: 'db' }
}

export const getPipelineById = async (
  id: string,
  caller: IUser
): Promise<CachedPipelineDetailResult> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const brokerageId = caller.brokerageId ? caller.brokerageId.toString() : 'global'
  const cacheKey = buildCacheKey(brokerageId, 'pipeline', { id })

  // 1. L1 Cache Check
  const l1Hit = pipelineDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    const duration = measureExecutionMs(t0)
    console.log(`[PIPELINE-PERF][service:getPipelineById] ${duration.toFixed(3)}ms (source: L1)`)
    return { pipeline: l1Hit, source: 'l1' }
  }

  // 2. L2 Cache Check
  try {
    const l2Raw = await cacheGet(cacheKey)
    if (l2Raw) {
      const parsed = safeJsonParse<PipelineResponse>(l2Raw)
      if (parsed) {
        pipelineDetailL1Cache.set(cacheKey, parsed)
        const duration = measureExecutionMs(t0)
        console.log(`[PIPELINE-PERF][service:getPipelineById] ${duration.toFixed(3)}ms (source: L2)`)
        return { pipeline: parsed, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[PipelineCache] L2 read failed in getPipelineById: ${err.message}`)
  }

  // 3. Database fetch with lean projection
  const tDb = process.hrtime.bigint()
  const pipeline = (await Pipeline.findById(id).lean()) as unknown as IPipeline | null
  if (!pipeline) {
    throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)
  recordDbMetric('getPipelineById_full', tDb, 10)

  // Store in L1 and L2
  pipelineDetailL1Cache.set(cacheKey, result)
  cacheSet(cacheKey, JSON.stringify(result), PIPELINE_CACHE_TTL).catch((err) => {
    logger.warn(`[PipelineCache] L2 write failed in getPipelineById: ${err.message}`)
  })

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:getPipelineById] ${duration.toFixed(3)}ms (source: DB)`)
  return { pipeline: result, source: 'db' }
}

export const updatePipeline = async (
  id: string,
  data: UpdatePipelineInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(id)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  if (data.name) {
    const dup = await Pipeline.findOne({
      brokerageId: pipeline.brokerageId,
      name: data.name,
      _id: { $ne: pipeline._id },
    })
      .select('_id')
      .lean()
    if (dup) throw new AppError('A pipeline with this name already exists', HTTP_STATUS.CONFLICT)
    pipeline.name = data.name
  }

  await pipeline.save()

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.updated',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipeline._id.toString(),
      details: data,
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.updated:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), id)

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:updatePipeline] ${duration.toFixed(3)}ms`)
  return result
}

export const deletePipeline = async (
  id: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(id).select('_id name brokerageId').lean()
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const dealCount = await Deal.countDocuments({
    pipelineId: new mongoose.Types.ObjectId(pipeline._id.toString()),
    isDeleted: false,
  })
  if (dealCount > 0) {
    throw new AppError(
      `Cannot delete pipeline: ${dealCount} active deal(s) still exist. Move or delete them first.`,
      HTTP_STATUS.CONFLICT
    )
  }

  await Pipeline.findByIdAndDelete(id)

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.deleted',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: id,
      details: { name: pipeline.name },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.deleted:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), id)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:deletePipeline] ${duration.toFixed(3)}ms`)
}

export const addStage = async (
  pipelineId: string,
  data: CreateStageInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(pipelineId)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const maxOrder = pipeline.stages.length > 0 ? Math.max(...pipeline.stages.map((s) => s.order)) : -1

  pipeline.stages.push({
    _id: new mongoose.Types.ObjectId(),
    name: data.name,
    color: data.color,
    order: maxOrder + 1,
    probability: data.probability,
  })

  await pipeline.save()

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.stage_added',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipelineId,
      details: { stageName: data.name },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.stage_added:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), pipelineId)

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:addStage] ${duration.toFixed(3)}ms`)
  return result
}

export const updateStage = async (
  pipelineId: string,
  stageId: string,
  data: UpdateStageInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
    throw new AppError('Invalid pipeline or stage ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const stage = pipeline.stages.find((s) => s._id.toString() === stageId)
  if (!stage) throw new AppError('Stage not found', HTTP_STATUS.NOT_FOUND)

  if (data.name !== undefined) stage.name = data.name
  if (data.color !== undefined) stage.color = data.color
  if (data.probability !== undefined) stage.probability = data.probability

  await pipeline.save()

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.stage_updated',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipelineId,
      details: { stageId, ...data },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.stage_updated:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), pipelineId)

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:updateStage] ${duration.toFixed(3)}ms`)
  return result
}

export const reorderStages = async (
  pipelineId: string,
  data: ReorderStagesInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(pipelineId)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  for (const { stageId, order } of data.orderings) {
    const stage = pipeline.stages.find((s) => s._id.toString() === stageId)
    if (stage) {
      stage.order = order
    }
  }

  await pipeline.save()

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.stages_reordered',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipelineId,
      details: { orderings: data.orderings },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.stages_reordered:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), pipelineId)

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:reorderStages] ${duration.toFixed(3)}ms`)
  return result
}

export const deleteStage = async (
  pipelineId: string,
  stageId: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(pipelineId) || !mongoose.Types.ObjectId.isValid(stageId)) {
    throw new AppError('Invalid pipeline or stage ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  if (pipeline.stages.length <= 1) {
    throw new AppError('Pipeline must have at least one stage', HTTP_STATUS.BAD_REQUEST)
  }

  const stageObjectId = new mongoose.Types.ObjectId(stageId)
  const dealCount = await Deal.countDocuments({
    pipelineId: new mongoose.Types.ObjectId(pipeline._id.toString()),
    stageId: stageObjectId,
    isDeleted: false,
  })
  if (dealCount > 0) {
    throw new AppError(
      `Cannot delete stage: ${dealCount} active deal(s) in this stage. Move them first.`,
      HTTP_STATUS.CONFLICT
    )
  }

  const stageIdx = pipeline.stages.findIndex((s) => s._id.toString() === stageId)
  if (stageIdx === -1) throw new AppError('Stage not found', HTTP_STATUS.NOT_FOUND)

  const removedName = pipeline.stages[stageIdx].name
  pipeline.stages.splice(stageIdx, 1)

  pipeline.stages
    .sort((a, b) => a.order - b.order)
    .forEach((s, i) => {
      s.order = i
    })

  await pipeline.save()

  queueMicrotask(() => {
    logAuditEvent({
      action: 'pipeline.stage_deleted',
      userId: caller._id.toString(),
      resource: 'Pipeline',
      resourceId: pipelineId,
      details: { stageId, stageName: removedName },
      ipAddress: clientIp,
      userAgent: userAgent,
    }).catch((err) => logger.error('[PipelineAudit] Error logging pipeline.stage_deleted:', err))
  })

  await invalidatePipelineCaches(pipeline.brokerageId.toString(), pipelineId)

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()))
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:deleteStage] ${duration.toFixed(3)}ms`)
  return result
}
```

### 5. Draft `server/src/features/pipeline/pipeline.controller.ts` (Controller Immunization & Latency Telemetry)

```typescript
import { Request, Response, NextFunction } from 'express'
import {
  createPipeline,
  listPipelines,
  getPipelineById,
  updatePipeline,
  deletePipeline,
  addStage,
  updateStage,
  reorderStages,
  deleteStage,
} from './pipeline.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/pipelines
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { pipelines, source } = await listPipelines(req.tenantFilter || {})
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:list] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)
    sendSuccess(res, pipelines, 'Pipelines retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/pipelines/:id
export const get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { pipeline, source } = await getPipelineById(req.params.id as string, req.user)
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:get] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader})`)
    sendSuccess(res, pipeline, 'Pipeline retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/pipelines
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await createPipeline(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:create] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Pipeline created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updatePipeline(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:update] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Pipeline updated successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/pipelines/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    await deletePipeline(req.params.id as string, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:remove] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, null, 'Pipeline deleted successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/pipelines/:id/stages
export const createStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await addStage(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:createStage] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stage added successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id/stages/:stageId
export const patchStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updateStage(
      req.params.id as string,
      req.params.stageId as string,
      req.body,
      req.user,
      clientIp,
      userAgent
    )
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:patchStage] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stage updated successfully')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id/stages/reorder
export const patchReorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await reorderStages(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:patchReorder] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stages reordered successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/pipelines/:id/stages/:stageId
export const removeStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await deleteStage(
      req.params.id as string,
      req.params.stageId as string,
      req.user,
      clientIp,
      userAgent
    )
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:removeStage] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stage deleted successfully')
  } catch (error) {
    next(error)
  }
}
```
