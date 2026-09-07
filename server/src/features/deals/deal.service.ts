import mongoose from 'mongoose'
import { Deal, IDeal } from '../../models/Deal.js'
import { Pipeline } from '../../models/Pipeline.js'
import { Contact } from '../../models/Contact.js'
import { User, IUser } from '../../models/User.js'
import { Activity } from '../../models/Activity.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { emitDealStageChange } from '../../config/socket.js'
import { pushNotification } from '../notifications/notification.service.js'
import {
  CreateDealInput,
  UpdateDealInput,
  MoveDealStageInput,
  ListDealsQuery,
  DealResponseDto,
  KanbanResponse,
  KanbanStageData,
  formatDealDto,
} from './deal.types.js'
import { cacheGet, cacheSet } from '../../config/redis.js'
import { buildCacheKey, invalidateTenantFeatureCache } from '../../utils/cacheHelper.js'

// 24 hours in seconds for deal cache TTL
const DEAL_CACHE_TTL = 86400

//  Role-Scoped Filter Builder 

const buildDealFilter = (
  query: ListDealsQuery,
  caller: IUser,
  tenantFilter: Record<string, any>
): Record<string, any> => {
  const filter: Record<string, any> = { ...tenantFilter, isDeleted: false }

  // Role-based visibility
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  } else if (typeof caller.role === 'string' && caller.role === USER_ROLES.TEAM_LEAD) {
    // Team lead sees own deals + deals assigned to agents in their brokerage
    // Since no explicit team structure, team lead sees brokerage deals
    // (tenantFilter already scopes to brokerage)
  }
  // Brokerage owner: tenantFilter handles it
  // Super admin: tenantFilter handles it (empty or specified)

  if (query.pipelineId && mongoose.Types.ObjectId.isValid(query.pipelineId)) {
    filter.pipelineId = new mongoose.Types.ObjectId(query.pipelineId)
  }
  if (query.stageId && mongoose.Types.ObjectId.isValid(query.stageId)) {
    filter.stageId = new mongoose.Types.ObjectId(query.stageId)
  }
  if (query.assignedAgentId && mongoose.Types.ObjectId.isValid(query.assignedAgentId)) {
    // Only allow filtering by agent if caller has visibility
    if (caller.role !== USER_ROLES.AGENT) {
      filter.assignedAgentId = new mongoose.Types.ObjectId(query.assignedAgentId)
    }
  }
  if (query.priority && ['low', 'medium', 'high', 'urgent'].includes(query.priority)) {
    filter.priority = query.priority
  }
  if (query.search) {
    const escaped = escapeRegExp(query.search)
    filter.$or = [
      { contactName: { $regex: escaped, $options: 'i' } },
      { propertyAddress: { $regex: escaped, $options: 'i' } },
    ]
  }

  return filter
}

// Deal CRUD 

export const createDeal = async (
  data: CreateDealInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<DealResponseDto> => {
  // Validate pipeline exists and belongs to brokerage
  const pipeline = await Pipeline.findById(data.pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)

  // Enforce brokerage restriction: Users (including Super Admins) cannot create deals in someone else's brokerage
  if (caller.brokerageId && caller.brokerageId.toString() !== pipeline.brokerageId.toString()) {
    throw new AppError('You cannot create deals in someone else\'s brokerage. The selected pipeline belongs to another brokerage.', HTTP_STATUS.FORBIDDEN)
  }

  const targetBrokerageId = caller.brokerageId || pipeline.brokerageId

  // Validate stage exists in the pipeline
  const stage = pipeline.stages.find((s) => s._id.toString() === data.stageId)
  if (!stage) throw new AppError('Stage not found in this pipeline', HTTP_STATUS.BAD_REQUEST)

  // Validate contact exists and belongs to caller's brokerage
  const contact = await Contact.findById(data.contactId)
  if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  if (caller.brokerageId && contact.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('The selected contact does not belong to your brokerage', HTTP_STATUS.BAD_REQUEST)
  }

  // Validate assigned agent exists, is active, and belongs to caller's brokerage
  const agent = await User.findById(data.assignedAgentId)
  if (!agent || !agent.isActive) {
    throw new AppError('Assigned agent not found or inactive', HTTP_STATUS.BAD_REQUEST)
  }
  if (caller.brokerageId && agent.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Assigned agent does not belong to your brokerage', HTTP_STATUS.BAD_REQUEST)
  }

  const deal = await Deal.create({
    pipelineId: pipeline._id,
    stageId: stage._id,
    contactId: contact._id,
    contactName: `${contact.firstName} ${contact.lastName}`,
    propertyAddress: data.propertyAddress,
    dealValue: data.dealValue,
    assignedAgentId: agent._id,
    assignedAgentName: `${agent.firstName} ${agent.lastName}`,
    priority: data.priority || 'medium',
    stageEnteredAt: new Date(),
    notes: data.notes || '',
    brokerageId: targetBrokerageId,
    createdBy: caller._id,
  })

  // Log activity on the contact's timeline
  await Activity.create({
    contactId: contact._id,
    brokerageId: targetBrokerageId,
    type: 'deal_created',
    description: `New deal created: ${data.propertyAddress} ($${data.dealValue.toLocaleString()}) in pipeline "${pipeline.name}" at stage "${stage.name}"`,
    metadata: {
      dealId: deal._id.toString(),
      pipelineId: pipeline._id.toString(),
      stageId: stage._id.toString(),
      dealValue: String(data.dealValue),
    },
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`,
  })

  await logAuditEvent({
    action: 'deal.created',
    userId: caller._id.toString(),
    resource: 'Deal',
    resourceId: deal._id.toString(),
    details: { contactName: deal.contactName, dealValue: data.dealValue, pipeline: pipeline.name },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  // Invalidate deal cache for this brokerage
  await invalidateTenantFeatureCache(targetBrokerageId.toString(), 'deals')

  return formatDealDto(deal, stage.name)
}

export const listDeals = async (
  query: ListDealsQuery,
  caller: IUser,
  tenantFilter: Record<string, any>
): Promise<{ deals: DealResponseDto[]; total: number }> => {
  const filter = buildDealFilter(query, caller, tenantFilter)
  const page = query.page || 1
  const limit = query.limit || 25
  const skip = (page - 1) * limit

  const sortField = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder }

  const [deals, total] = await Promise.all([
    (await Deal.find(filter).sort(sort).skip(skip).limit(limit).lean()) as unknown as IDeal[],
    Deal.countDocuments(filter),
  ])

  // Get pipeline stages for stage name resolution
  const pipelineIds = [...new Set(deals.map((d) => d.pipelineId.toString()))]
  const pipelines = await Pipeline.find({ _id: { $in: pipelineIds } }).lean()
  const stageMap = new Map<string, string>()
  for (const p of pipelines) {
    for (const s of p.stages) {
      stageMap.set(s._id.toString(), s.name)
    }
  }

  const formatted = deals.map((d) => formatDealDto(d, stageMap.get(d.stageId.toString())))
  return { deals: formatted, total }
}

export const getDealById = async (
  id: string,
  caller: IUser
): Promise<DealResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid deal ID', HTTP_STATUS.BAD_REQUEST)
  }

  const deal = await Deal.findOne({ _id: id, isDeleted: false })
  if (!deal) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, deal.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  // Agent can only see their own deals
  if (caller.role === USER_ROLES.AGENT && deal.assignedAgentId.toString() !== caller._id.toString()) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const pipeline = await Pipeline.findById(deal.pipelineId)
  const stageName = pipeline?.stages.find((s) => s._id.toString() === deal.stageId.toString())?.name

  return formatDealDto(deal, stageName)
}

export const updateDeal = async (
  id: string,
  data: UpdateDealInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<DealResponseDto> => {
  const deal = await Deal.findOne({ _id: id, isDeleted: false })
  if (!deal) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, deal.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  if (data.propertyAddress !== undefined) deal.propertyAddress = data.propertyAddress
  if (data.dealValue !== undefined) deal.dealValue = data.dealValue
  if (data.priority !== undefined) deal.priority = data.priority
  if (data.notes !== undefined) deal.notes = data.notes

  if (data.assignedAgentId) {
    const agent = await User.findById(data.assignedAgentId)
    if (!agent || !agent.isActive) {
      throw new AppError('Assigned agent not found or inactive', HTTP_STATUS.BAD_REQUEST)
    }
    const isBrokerageMatch =
      agent.brokerageId.toString() === deal.brokerageId.toString() ||
      agent.role === USER_ROLES.SUPER_ADMIN ||
      caller.role === USER_ROLES.SUPER_ADMIN

    if (!isBrokerageMatch) {
      throw new AppError('Assigned agent does not belong to the deal brokerage', HTTP_STATUS.BAD_REQUEST)
    }
    deal.assignedAgentId = agent._id as mongoose.Types.ObjectId
    deal.assignedAgentName = `${agent.firstName} ${agent.lastName}`
  }

  await deal.save()

  await logAuditEvent({
    action: 'deal.updated',
    userId: caller._id.toString(),
    resource: 'Deal',
    resourceId: id,
    details: data,
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  // Invalidate deal cache for this brokerage
  await invalidateTenantFeatureCache(deal.brokerageId.toString(), 'deals')

  const pipeline = await Pipeline.findById(deal.pipelineId)
  const stageName = pipeline?.stages.find((s) => s._id.toString() === deal.stageId.toString())?.name

  return formatDealDto(deal, stageName)
}

export const deleteDeal = async (
  id: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const deal = await Deal.findOne({ _id: id, isDeleted: false })
  if (!deal) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, deal.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  deal.isDeleted = true
  await deal.save()

  await logAuditEvent({
    action: 'deal.deleted',
    userId: caller._id.toString(),
    resource: 'Deal',
    resourceId: id,
    details: { contactName: deal.contactName, dealValue: deal.dealValue },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  // Invalidate deal cache for this brokerage
  await invalidateTenantFeatureCache(deal.brokerageId.toString(), 'deals')
}

// ── Stage Transition ────────────────────────────────────

export const moveDealStage = async (
  dealId: string,
  data: MoveDealStageInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<DealResponseDto> => {
  const deal = await Deal.findOne({ _id: dealId, isDeleted: false })
  if (!deal) throw new AppError('Deal not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, deal.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const pipeline = await Pipeline.findById(deal.pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)

  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)

  const currentStage = sortedStages.find((s) => s._id.toString() === deal.stageId.toString())
  const newStage = sortedStages.find((s) => s._id.toString() === data.newStageId)

  if (!currentStage) throw new AppError('Current stage not found in pipeline', HTTP_STATUS.BAD_REQUEST)
  if (!newStage) throw new AppError('Target stage not found in pipeline', HTTP_STATUS.BAD_REQUEST)

  // Sequential validation: can only move ±1 stage at a time
  const diff = Math.abs(newStage.order - currentStage.order)
  if (diff !== 1) {
    throw new AppError(
      `Sequential stage transition required. Cannot skip from "${currentStage.name}" (order ${currentStage.order}) to "${newStage.name}" (order ${newStage.order}). Move one stage at a time.`,
      HTTP_STATUS.BAD_REQUEST
    )
  }

  const oldStageName = currentStage.name
  const newStageName = newStage.name

  deal.stageId = newStage._id
  deal.stageEnteredAt = new Date()
  await deal.save()

  // Log stage_change activity on contact timeline
  await Activity.create({
    contactId: deal.contactId,
    brokerageId: deal.brokerageId,
    type: 'stage_change',
    description: `Deal "${deal.propertyAddress}" moved from "${oldStageName}" → "${newStageName}"`,
    metadata: {
      dealId: deal._id.toString(),
      fromStage: oldStageName,
      toStage: newStageName,
      fromStageId: currentStage._id.toString(),
      toStageId: newStage._id.toString(),
    },
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`,
  })

  await logAuditEvent({
    action: 'deal.stage_changed',
    userId: caller._id.toString(),
    resource: 'Deal',
    resourceId: dealId,
    details: { from: oldStageName, to: newStageName, contactName: deal.contactName },
    ipAddress: clientIp,
    userAgent: userAgent,
  })

  // Real-Time Broadcast & Push Notification
  try {
    const formatted = formatDealDto(deal, newStageName)
    emitDealStageChange(formatted, deal.brokerageId.toString())
    await pushNotification({
      brokerageId: deal.brokerageId.toString(),
      type: 'stage_change',
      title: 'Deal Stage Advanced',
      message: `"${deal.propertyAddress}" progressed from "${oldStageName}" → "${newStageName}"`,
      linkTo: '/pipeline',
      metadata: { dealId: deal._id.toString(), from: oldStageName, to: newStageName },
    })
  } catch (err) {
    // Non-blocking
  }

  // Invalidate deal cache for this brokerage
  await invalidateTenantFeatureCache(deal.brokerageId.toString(), 'deals')

  return formatDealDto(deal, newStageName)
}

// Kanban Data 


export const getKanbanData = async (
  pipelineId: string,
  caller: IUser,
  tenantFilter: Record<string, any>,
  options?: { stageId?: string; includeDeals?: boolean }
): Promise<KanbanResponse> => {
  if (!mongoose.Types.ObjectId.isValid(pipelineId)) {
    throw new AppError('Invalid pipeline ID', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  // Try Redis cache for kanban data (24hr TTL)
  const brokerageId = (caller.brokerageId || pipeline.brokerageId).toString()
  const cacheIdentifier = { pipelineId, stageId: options?.stageId || '', includeDeals: options?.includeDeals !== false, role: caller.role, userId: caller._id.toString() }
  const cacheKey = buildCacheKey(brokerageId, 'deals', cacheIdentifier)

  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as KanbanResponse
    } catch {
      // Corrupted cache, proceed with fresh query
    }
  }

  const includeDeals = options?.includeDeals !== false
  const targetStageId = options?.stageId

  // Build deal filter with role scoping
  const dealFilter: Record<string, any> = {
    pipelineId: pipeline._id,
    isDeleted: false,
  }

  // Apply tenant scoping
  if (tenantFilter.brokerageId) {
    dealFilter.brokerageId = tenantFilter.brokerageId
  }

  // Role-based visibility
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    dealFilter.assignedAgentId = caller._id
  }

  const sortedStages = [...pipeline.stages].sort((a, b) => a.order - b.order)
  const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }

  // Case 1: Fast metadata mode (includeDeals === false and no targetStageId)
  if (!includeDeals && !targetStageId) {
    const stageStats = await Deal.aggregate([
      { $match: dealFilter },
      {
        $group: {
          _id: '$stageId',
          count: { $sum: 1 },
          totalValue: { $sum: '$dealValue' },
        },
      },
    ])

    const statsMap = new Map<string, { count: number; totalValue: number }>()
    for (const stat of stageStats) {
      if (stat._id) {
        statsMap.set(stat._id.toString(), { count: stat.count, totalValue: stat.totalValue })
      }
    }

    let totalDeals = 0
    let totalValue = 0
    let weightedForecast = 0

    const stages: KanbanStageData[] = sortedStages.map((stage) => {
      const stats = statsMap.get(stage._id.toString()) || { count: 0, totalValue: 0 }
      const stageWeighted = Math.round((stats.totalValue * stage.probability) / 100)

      totalDeals += stats.count
      totalValue += stats.totalValue
      weightedForecast += stageWeighted

      return {
        id: stage._id.toString(),
        name: stage.name,
        color: stage.color,
        order: stage.order,
        probability: stage.probability,
        dealCount: stats.count,
        totalValue: stats.totalValue,
        weightedValue: stageWeighted,
        deals: [],
      }
    })

    return {
      pipelineId: pipeline._id.toString(),
      pipelineName: pipeline.name,
      stages,
      summary: {
        totalDeals,
        totalValue,
        weightedForecast,
      },
    }
  }

  // Case 2: Load deals for a specific stage or all stages
  const fetchFilter = targetStageId && mongoose.Types.ObjectId.isValid(targetStageId)
    ? { ...dealFilter, stageId: new mongoose.Types.ObjectId(targetStageId) }
    : dealFilter

  const [deals, stageStats] = await Promise.all([
    Deal.find(fetchFilter).sort({ priority: -1, stageEnteredAt: 1 }).lean() as unknown as Promise<IDeal[]>,
    targetStageId
      ? Deal.aggregate([
          { $match: dealFilter },
          {
            $group: {
              _id: '$stageId',
              count: { $sum: 1 },
              totalValue: { $sum: '$dealValue' },
            },
          },
        ])
      : Promise.resolve([]),
  ])

  const statsMap = new Map<string, { count: number; totalValue: number }>()
  for (const stat of stageStats) {
    if (stat._id) {
      statsMap.set(stat._id.toString(), { count: stat.count, totalValue: stat.totalValue })
    }
  }

  let totalDeals = 0
  let totalValue = 0
  let weightedForecast = 0

  const stages: KanbanStageData[] = sortedStages.map((stage) => {
    const isTargetStage = !targetStageId || stage._id.toString() === targetStageId
    const stageDeals = isTargetStage
      ? deals
          .filter((d) => d.stageId.toString() === stage._id.toString())
          .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))
      : []

    const fallbackStats = statsMap.get(stage._id.toString()) || { count: 0, totalValue: 0 }
    const stageDealCount = isTargetStage && !targetStageId ? stageDeals.length : fallbackStats.count || stageDeals.length
    const stageTotalValue = isTargetStage && !targetStageId ? stageDeals.reduce((sum, d) => sum + d.dealValue, 0) : fallbackStats.totalValue
    const stageWeighted = Math.round((stageTotalValue * stage.probability) / 100)

    totalDeals += stageDealCount
    totalValue += stageTotalValue
    weightedForecast += stageWeighted

    return {
      id: stage._id.toString(),
      name: stage.name,
      color: stage.color,
      order: stage.order,
      probability: stage.probability,
      dealCount: stageDealCount,
      totalValue: stageTotalValue,
      weightedValue: stageWeighted,
      deals: stageDeals.map((d) => formatDealDto(d, stage.name)),
    }
  })

  const response: KanbanResponse = {
    pipelineId: pipeline._id.toString(),
    pipelineName: pipeline.name,
    stages,
    summary: {
      totalDeals,
      totalValue,
      weightedForecast,
    },
  }

  // Cache the response in Redis with 24hr TTL
  await cacheSet(cacheKey, JSON.stringify(response), DEAL_CACHE_TTL)

  return response
}

// ── Stage-Level Deal Fetching ────────────────────────────────────

/**
 * Fetches deals and aggregated statistics for a single pipeline stage.
 * Uses Redis cache with 24hr TTL.
 */
export const getStageDeals = async (
  stageId: string,
  caller: IUser,
  tenantFilter: Record<string, any>,
  pipelineId?: string
): Promise<KanbanStageData> => {
  if (!mongoose.Types.ObjectId.isValid(stageId)) {
    throw new AppError('Invalid stage ID', HTTP_STATUS.BAD_REQUEST)
  }

  // Must have pipelineId to locate the stage
  if (!pipelineId || !mongoose.Types.ObjectId.isValid(pipelineId)) {
    throw new AppError('Pipeline ID is required', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const stage = pipeline.stages.find((s) => s._id.toString() === stageId)
  if (!stage) throw new AppError('Stage not found in this pipeline', HTTP_STATUS.BAD_REQUEST)

  // Try Redis cache
  const brokerageId = (caller.brokerageId || pipeline.brokerageId).toString()
  const cacheIdentifier = { type: 'stageDeals', pipelineId, stageId, role: caller.role, userId: caller._id.toString() }
  const cacheKey = buildCacheKey(brokerageId, 'deals', cacheIdentifier)

  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as KanbanStageData
    } catch {
      // Corrupted cache, proceed with fresh query
    }
  }

  const dealFilter: Record<string, any> = {
    pipelineId: pipeline._id,
    stageId: new mongoose.Types.ObjectId(stageId),
    isDeleted: false,
  }
  if (tenantFilter.brokerageId) dealFilter.brokerageId = tenantFilter.brokerageId
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    dealFilter.assignedAgentId = caller._id
  }

  const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
  const deals = (await Deal.find(dealFilter).sort({ priority: -1, stageEnteredAt: 1 }).lean()) as unknown as IDeal[]
  const sortedDeals = deals.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))

  const totalValue = sortedDeals.reduce((sum, d) => sum + d.dealValue, 0)
  const weightedValue = Math.round((totalValue * stage.probability) / 100)

  const result: KanbanStageData = {
    id: stage._id.toString(),
    name: stage.name,
    color: stage.color,
    order: stage.order,
    probability: stage.probability,
    dealCount: sortedDeals.length,
    totalValue,
    weightedValue,
    deals: sortedDeals.map((d) => formatDealDto(d, stage.name)),
  }

  // Cache with 24hr TTL
  await cacheSet(cacheKey, JSON.stringify(result), DEAL_CACHE_TTL)

  return result
}

/**
 * Batch-fetches deals and statistics for multiple stages at once.
 * Designed for stage transitions where both fromStage and toStage need reloading.
 */
export const getMultipleStageDeals = async (
  stageIds: string[],
  caller: IUser,
  tenantFilter: Record<string, any>,
  pipelineId?: string
): Promise<KanbanStageData[]> => {
  if (!pipelineId || !mongoose.Types.ObjectId.isValid(pipelineId)) {
    throw new AppError('Pipeline ID is required', HTTP_STATUS.BAD_REQUEST)
  }

  const validStageIds = stageIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
  if (validStageIds.length === 0) {
    throw new AppError('At least one valid stage ID is required', HTTP_STATUS.BAD_REQUEST)
  }

  const pipeline = await Pipeline.findById(pipelineId)
  if (!pipeline) throw new AppError('Pipeline not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyBrokerageAccess(caller, pipeline.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const dealFilter: Record<string, any> = {
    pipelineId: pipeline._id,
    stageId: { $in: validStageIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isDeleted: false,
  }
  if (tenantFilter.brokerageId) dealFilter.brokerageId = tenantFilter.brokerageId
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    dealFilter.assignedAgentId = caller._id
  }

  const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 }
  const deals = (await Deal.find(dealFilter).sort({ priority: -1, stageEnteredAt: 1 }).lean()) as unknown as IDeal[]

  const results: KanbanStageData[] = validStageIds.map((sid) => {
    const stage = pipeline.stages.find((s) => s._id.toString() === sid)
    if (!stage) return null as unknown as KanbanStageData

    const stageDeals = deals
      .filter((d) => d.stageId.toString() === sid)
      .sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0))

    const totalValue = stageDeals.reduce((sum, d) => sum + d.dealValue, 0)
    const weightedValue = Math.round((totalValue * stage.probability) / 100)

    return {
      id: stage._id.toString(),
      name: stage.name,
      color: stage.color,
      order: stage.order,
      probability: stage.probability,
      dealCount: stageDeals.length,
      totalValue,
      weightedValue,
      deals: stageDeals.map((d) => formatDealDto(d, stage.name)),
    }
  }).filter(Boolean)

  return results
}

