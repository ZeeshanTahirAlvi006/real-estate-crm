import mongoose from 'mongoose'
import { Pipeline, DEFAULT_PIPELINE_STAGES, IPipeline } from '../../models/Pipeline.js'
import { Deal } from '../../models/Deal.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import {
  PipelineResponse,
  serializePipeline,
  CreatePipelineInput,
  UpdatePipelineInput,
  CreateStageInput,
  UpdateStageInput,
  ReorderStagesInput,
} from './pipeline.types.js'

//  Helpers 

const getStageStats = async (pipelineId: mongoose.Types.ObjectId) => {
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
    map.set(s._id.toString(), { dealCount: s.dealCount, totalValue: s.totalValue })
  }
  return map
}

// Pipeline CRUD 

export const createPipeline = async (
  data: CreatePipelineInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const brokerageId = caller.brokerageId

  // Check if name is unique within brokerage
  const existing = await Pipeline.findOne({ brokerageId, name: data.name })
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

  await logAuditEvent({
    action: 'pipeline.created',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipeline._id.toString(),
    details: { name: data.name, stageCount: stages.length },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  return serializePipeline(pipeline)
}

export const listPipelines = async (
  tenantFilter: Record<string, any>
): Promise<PipelineResponse[]> => {
  const pipelines = await Pipeline.find(tenantFilter).sort({ isDefault: -1, createdAt: 1 }).lean() as unknown as IPipeline[]

  const results: PipelineResponse[] = []
  for (const p of pipelines) {
    const stats = await getStageStats(p._id as mongoose.Types.ObjectId)
    results.push(serializePipeline(p, stats))
  }
  return results
}

export const getPipelineById = async (
  id: string,
  caller: IUser
): Promise<PipelineResponse> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(id)
  if (!pipeline) {
    throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}

export const updatePipeline = async (
  id: string,
  data: UpdatePipelineInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const pipeline = await Pipeline.findById(id)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  if (data.name) {
    const dup = await Pipeline.findOne({ brokerageId: pipeline.brokerageId, name: data.name, _id: { $ne: pipeline._id } })
    if (dup) throw new AppError('A pipeline with this name already exists', HTTP_STATUS.CONFLICT)
    pipeline.name = data.name
  }

  await pipeline.save()

  await logAuditEvent({
    action: 'pipeline.updated',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipeline._id.toString(),
    details: data,
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}

export const deletePipeline = async (
  id: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const pipeline = await Pipeline.findById(id)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  // Cannot delete pipeline with active deals
  const dealCount = await Deal.countDocuments({ pipelineId: pipeline._id, isDeleted: false })
  if (dealCount > 0) {
    throw new AppError(
      `Cannot delete pipeline: ${dealCount} active deal(s) still exist. Move or delete them first.`,
      HTTP_STATUS.CONFLICT
    )
  }

  await Pipeline.findByIdAndDelete(id)

  await logAuditEvent({
    action: 'pipeline.deleted',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: id,
    details: { name: pipeline.name },
    ipAddress: clientIp,
    userAgent: userAgent,
  })
}

// ── Stage CRUD ──────────────────────────────────────────

export const addStage = async (
  pipelineId: string,
  data: CreateStageInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  // New stage goes to the end
  const maxOrder = pipeline.stages.length > 0
    ? Math.max(...pipeline.stages.map((s) => s.order))
    : -1

  pipeline.stages.push({
    _id: new mongoose.Types.ObjectId(),
    name: data.name,
    color: data.color,
    order: maxOrder + 1,
    probability: data.probability,
  })

  await pipeline.save()

  await logAuditEvent({
    action: 'pipeline.stage_added',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipelineId,
    details: { stageName: data.name },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}

export const updateStage = async (
  pipelineId: string,
  stageId: string,
  data: UpdateStageInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
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

  await logAuditEvent({
    action: 'pipeline.stage_updated',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipelineId,
    details: { stageId, ...data },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}

export const reorderStages = async (
  pipelineId: string,
  data: ReorderStagesInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
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

  await logAuditEvent({
    action: 'pipeline.stages_reordered',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipelineId,
    details: { orderings: data.orderings },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}

export const deleteStage = async (
  pipelineId: string,
  stageId: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<PipelineResponse> => {
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
  const dealCount = await Deal.countDocuments({ pipelineId: pipeline._id, stageId: stageObjectId, isDeleted: false })
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
    .forEach((s, i) => { s.order = i })

  await pipeline.save()

  await logAuditEvent({
    action: 'pipeline.stage_deleted',
    userId: caller._id.toString(),
    resource: 'Pipeline',
    resourceId: pipelineId,
    details: { stageId, stageName: removedName },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  const stats = await getStageStats(pipeline._id as mongoose.Types.ObjectId)
  return serializePipeline(pipeline, stats)
}
