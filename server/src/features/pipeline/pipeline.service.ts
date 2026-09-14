import mongoose from 'mongoose'
import { Pipeline, DEFAULT_PIPELINE_STAGES, IPipeline } from '../../models/Pipeline.js'
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

/**
 * Deterministically invalidates L1 in-memory caches and fires asynchronous
 * Redis invalidation for the brokerage's pipeline and deals features.
 */
export const invalidatePipelineCaches = async (brokerageId?: string, pipelineId?: string): Promise<void> => {
  const t0 = process.hrtime.bigint()
  pipelineListL1Cache.clear()
  pipelineDetailL1Cache.clear()

  if (brokerageId) {
    try {
      await invalidateTenantFeatureCache(brokerageId, 'pipeline')
      // Also invalidate deals cache since pipeline stage definitions directly affect Kanban
      await invalidateTenantFeatureCache(brokerageId, 'deals')
    } catch (err: any) {
      logger.warn(`[PipelineCache] Redis invalidation failed for brokerage ${brokerageId}: ${err.message}`)
    }
  }
  const elapsed = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:invalidatePipelineCaches] ${elapsed.toFixed(3)}ms (brokerage: ${brokerageId || 'all'}, pipeline: ${pipelineId || 'all'})`)
}

// ── Stage Stats Aggregators ──────────────────────────────

/**
 * Aggregates deal count and value for each stage in a single pipeline.
 * Utilizes the compound covering index on Deal { pipelineId: 1, isDeleted: 1, stageId: 1, dealValue: 1 }.
 */
export const getStageStats = async (
  pipelineId: mongoose.Types.ObjectId,
  brokerageId?: mongoose.Types.ObjectId | string
): Promise<Map<string, { dealCount: number; totalValue: number }>> => {
  const t0 = process.hrtime.bigint()
  const match: Record<string, any> = { pipelineId, isDeleted: false }
  if (brokerageId) {
    match.brokerageId = typeof brokerageId === 'string' ? new mongoose.Types.ObjectId(brokerageId) : brokerageId
  }
  const stats = await Deal.aggregate([
    { $match: match },
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
  console.log(`[PIPELINE-PERF][service:getStageStats] ${duration.toFixed(3)}ms (pipelineId: ${pipelineId.toString()})`)
  return map
}

/**
 * Batch-aggregates stage statistics for multiple pipelines in a single database roundtrip.
 * Uses compound covering index on Deal { brokerageId: 1, pipelineId: 1, isDeleted: 1 } to eliminate COLLSCAN.
 */
export const getBatchStageStats = async (
  pipelineIds: mongoose.Types.ObjectId[],
  brokerageId?: mongoose.Types.ObjectId | string
): Promise<Map<string, Map<string, { dealCount: number; totalValue: number }>>> => {
  const t0 = process.hrtime.bigint()
  if (pipelineIds.length === 0) return new Map()

  const match: Record<string, any> = { pipelineId: { $in: pipelineIds }, isDeleted: false }
  if (brokerageId) {
    match.brokerageId = typeof brokerageId === 'string' ? new mongoose.Types.ObjectId(brokerageId) : brokerageId
  }

  const stats = await Deal.aggregate([
    { $match: match },
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

// ── Pipeline CRUD ────────────────────────────────────────

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

  // Check if name is unique within brokerage using lean projection
  const existing = await Pipeline.findOne({ brokerageId, name: data.name }).select('_id').lean()
  if (existing) {
    throw new AppError('A pipeline with this name already exists in your brokerage', HTTP_STATUS.CONFLICT)
  }

  // First pipeline in brokerage becomes default
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

  // Offload non-essential audit logging off critical path
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
  console.log(`[PIPELINE-PERF][service:createPipeline] ${duration.toFixed(3)}ms (id: ${result.id})`)
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

  // 3. Uncached Database Fetch with single-pass batch aggregation (eliminates N+1)
  const tDb = process.hrtime.bigint()
  const pipelines = (await Pipeline.find(tenantFilter)
    .sort({ isDefault: -1, createdAt: 1 })
    .select('_id name brokerageId isDefault stages createdAt updatedAt')
    .lean()) as unknown as IPipeline[]

  const pipelineIds = pipelines.map((p) => new mongoose.Types.ObjectId(p._id.toString()))
  const batchStats = await getBatchStageStats(pipelineIds, tenantFilter.brokerageId)

  const results: PipelineResponse[] = pipelines.map((p) => {
    const pidStr = p._id.toString()
    const statsMap = batchStats.get(pidStr) || new Map()
    return serializePipeline(p, statsMap)
  })

  recordDbMetric('listPipelines_full', tDb, 10)

  // Asynchronously populate L2 and synchronously populate L1
  pipelineListL1Cache.set(cacheKey, results)
  cacheSet(cacheKey, JSON.stringify(results), PIPELINE_CACHE_TTL).catch((err) => {
    logger.warn(`[PipelineCache] Failed to write L2 cache for listPipelines: ${err.message}`)
  })

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:listPipelines] ${duration.toFixed(3)}ms (source: DB, count: ${results.length})`)
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

  // 1. L1 in-memory cache check (<0.05ms)
  const l1Hit = pipelineDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    const duration = measureExecutionMs(t0)
    console.log(`[PIPELINE-PERF][service:getPipelineById] ${duration.toFixed(3)}ms (source: L1)`)
    return { pipeline: l1Hit, source: 'l1' }
  }

  // 2. L2 Redis cache check with fail-safe fallback (DI-003)
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)
  recordDbMetric('getPipelineById_full', tDb, 10)

  // Populate caches
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

  // Offload non-essential audit logging
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:updatePipeline] ${duration.toFixed(3)}ms (id: ${id})`)
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

  // Cannot delete pipeline with active deals
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
  console.log(`[PIPELINE-PERF][service:deletePipeline] ${duration.toFixed(3)}ms (id: ${id})`)
}

// ── Stage CRUD ──────────────────────────────────────────

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

  // New stage goes to the end
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:addStage] ${duration.toFixed(3)}ms (pipelineId: ${pipelineId})`)
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:updateStage] ${duration.toFixed(3)}ms (stageId: ${stageId})`)
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:reorderStages] ${duration.toFixed(3)}ms (orderings: ${data.orderings.length})`)
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

  // Cannot delete a stage that has active deals
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

  // Recalculate orders after removal
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

  const stats = await getStageStats(new mongoose.Types.ObjectId(pipeline._id.toString()), pipeline.brokerageId)
  const result = serializePipeline(pipeline, stats)

  const duration = measureExecutionMs(t0)
  console.log(`[PIPELINE-PERF][service:deleteStage] ${duration.toFixed(3)}ms (removed: ${removedName})`)
  return result
}
