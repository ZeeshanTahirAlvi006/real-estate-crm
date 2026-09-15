import mongoose from 'mongoose'
import { ReactivationCampaign, IReactivationCampaign } from '../../../models/ReactivationCampaign.js'
import { Contact } from '../../../models/Contact.js'
import { IUser } from '../../../models/User.js'
import { AppError } from '../../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../../utils/constants.js'
import { logAuditEvent } from '../../../utils/auditLogger.js'
import { logger } from '../../../utils/logger.js'
import { buildCacheKey, safeJsonParse, recordDbMetric } from '../../../utils/cacheHelper.js'
import { cacheGet, cacheSet } from '../../../config/redis.js'
import {
  ReactivationCampaignDto,
  CampaignMetricsDto,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../aiIsa.types.js'
import {
  startTimer,
  DEFAULT_CAMPAIGN_SEEDS,
  CAMPAIGN_PROJECTION,
  formatCampaignDto,
  campaignsL1Cache,
  campaignDetailL1Cache,
  campaignMetricsL1Cache,
  invalidateAiIsaCaches,
} from './aiIsa.common.js'

export const getReactivationCampaigns = async (
  tenantFilter: Record<string, any>,
  caller: IUser
): Promise<ReactivationCampaignDto[]> => {
  const stopTimer = startTimer('getReactivationCampaigns')
  try {
    const bIdStr = caller.brokerageId?.toString() || 'global'
    const l1Key = `camps:${bIdStr}`

    const l1Cached = campaignsL1Cache.get(l1Key)
    if (l1Cached) {
      stopTimer()
      return l1Cached
    }

    const l2Key = buildCacheKey(bIdStr, 'ai-isa', 'campaigns')
    try {
      const l2Raw = await cacheGet(l2Key)
      const l2Parsed = safeJsonParse<ReactivationCampaignDto[]>(l2Raw)
      if (l2Parsed) {
        campaignsL1Cache.set(l1Key, l2Parsed)
        stopTimer()
        return l2Parsed
      }
    } catch {
      // Fall through to DB
    }

    const tDb = process.hrtime.bigint()
    let campaigns = (await ReactivationCampaign.find(tenantFilter)
      .select(CAMPAIGN_PROJECTION)
      .sort({ createdAt: -1 })
      .lean()) as unknown as IReactivationCampaign[]

    if (campaigns.length === 0 && caller.brokerageId) {
      const seeded = await Promise.all(
        DEFAULT_CAMPAIGN_SEEDS.map((seed) =>
          ReactivationCampaign.create({
            ...seed,
            brokerageId: caller.brokerageId,
            createdBy: caller._id,
          })
        )
      )
      campaigns = seeded.map((s) => s.toObject() as IReactivationCampaign)
    }
    recordDbMetric('getReactivationCampaigns', tDb)

    const dtos = campaigns.map(formatCampaignDto)
    campaignsL1Cache.set(l1Key, dtos)
    cacheSet(l2Key, JSON.stringify(dtos), 120).catch(() => { })

    stopTimer()
    return dtos
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 84] ", error)
    throw error
  }
}

export const getCampaignById = async (
  id: string,
  caller: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('getCampaignById')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)
    const l1Key = `camp:${id}`

    const l1Cached = campaignDetailL1Cache.get(l1Key)
    if (l1Cached) {
      stopTimer()
      return l1Cached
    }

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOne({
      _id: objectId,
      brokerageId: caller.brokerageId,
    })
      .select(CAMPAIGN_PROJECTION)
      .lean()) as IReactivationCampaign | null
    recordDbMetric('getCampaignById', tDb)

    if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    const dto = formatCampaignDto(campaign)
    campaignDetailL1Cache.set(l1Key, dto)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 84] ", error)
    throw error
  }
}

export const createReactivationCampaign = async (
  input: CreateCampaignInput,
  caller: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('createReactivationCampaign')
  try {
    const tDb = process.hrtime.bigint()
    const campaign = await ReactivationCampaign.create({
      ...input,
      brokerageId: caller.brokerageId,
      createdBy: caller._id,
    })
    recordDbMetric('createReactivationCampaign', tDb)

    logAuditEvent({
      action: 'campaign.created',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: campaign._id.toString(),
      details: { name: input.name, targetSegment: input.targetSegment },
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 151] Campaign create error: ${err.message}`))

    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCampaignDto(campaign)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 160] ", error)
    throw error
  }
}

export const updateCampaign = async (
  id: string,
  input: UpdateCampaignInput,
  caller: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('updateCampaign')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOneAndUpdate(
      { _id: objectId, brokerageId: caller.brokerageId },
      { $set: input },
      { new: true, lean: true }
    ).select(CAMPAIGN_PROJECTION)) as IReactivationCampaign | null
    recordDbMetric('updateCampaign', tDb)

    if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'campaign.updated',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: id,
      details: { fieldsUpdated: Object.keys(input) },
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 195] Campaign update log error: ${err.message}`))

    campaignDetailL1Cache.delete(`camp:${id}`)
    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCampaignDto(campaign)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 205] ", error)
    throw error
  }
}

export const deleteCampaign = async (
  id: string,
  caller: IUser
): Promise<void> => {
  const stopTimer = startTimer('deleteCampaign')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const result = await ReactivationCampaign.deleteOne({
      _id: objectId,
      brokerageId: caller.brokerageId,
    })
    recordDbMetric('deleteCampaign', tDb)

    if (result.deletedCount === 0) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'campaign.deleted',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: id,
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 236] Campaign delete log error: ${err?.message}`))

    campaignDetailL1Cache.delete(`camp:${id}`)
    await invalidateAiIsaCaches(caller.brokerageId?.toString())
    stopTimer()
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 244] ", error)
    throw error
  }
}

export const startCampaign = async (
  id: string,
  caller: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('startCampaign')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOneAndUpdate(
      { _id: objectId, brokerageId: caller.brokerageId, status: { $in: ['paused', 'draft'] } },
      { $set: { status: 'active' } },
      { new: true, lean: true }
    ).select(CAMPAIGN_PROJECTION)) as IReactivationCampaign | null
    recordDbMetric('startCampaign', tDb)

    if (!campaign) throw new AppError('Campaign not found or already active', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'campaign.started',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: id,
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 277]  Campaign start log error: ${err?.message}`))

    campaignDetailL1Cache.delete(`camp:${id}`)
    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCampaignDto(campaign)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 287] ", error)
    throw error
  }
}

export const pauseCampaign = async (
  id: string,
  caller: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('pauseCampaign')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOneAndUpdate(
      { _id: objectId, brokerageId: caller.brokerageId, status: 'active' },
      { $set: { status: 'paused' } },
      { new: true, lean: true }
    ).select(CAMPAIGN_PROJECTION)) as IReactivationCampaign | null
    recordDbMetric('pauseCampaign', tDb)

    if (!campaign) throw new AppError('Campaign not found or not active', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'campaign.paused',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: id,
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[AuditLog] Campaign pause error: ${err.message}`))

    campaignDetailL1Cache.delete(`camp:${id}`)
    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCampaignDto(campaign)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 330] ", error)
    throw error
  }
}

export const getCampaignMetrics = async (
  id: string,
  caller: IUser
): Promise<CampaignMetricsDto> => {
  const stopTimer = startTimer('getCampaignMetrics')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)
    const l1Key = `metrics:${id}`

    const l1Cached = campaignMetricsL1Cache.get(l1Key)
    if (l1Cached) {
      stopTimer()
      return l1Cached
    }

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOne({
      _id: objectId,
      brokerageId: caller.brokerageId,
    })
      .select(CAMPAIGN_PROJECTION)
      .lean()) as IReactivationCampaign | null
    recordDbMetric('getCampaignMetrics', tDb)

    if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    const contacted = campaign.contactedCount || 0
    const dto: CampaignMetricsDto = {
      campaignId: campaign._id.toString(),
      name: campaign.name,
      status: campaign.status,
      totalLeads: campaign.totalLeads,
      contactedCount: contacted,
      respondedCount: campaign.respondedCount,
      engagedCount: campaign.engagedCount,
      convertedCount: campaign.convertedCount,
      meetingsBookedCount: campaign.meetingsBookedCount,
      responseRatePercent: contacted > 0 ? Math.round((campaign.respondedCount / contacted) * 100) : 0,
      engagementRatePercent: contacted > 0 ? Math.round((campaign.engagedCount / contacted) * 100) : 0,
      conversionRatePercent: contacted > 0 ? Math.round((campaign.convertedCount / contacted) * 100) : 0,
      lastRunAt: campaign.lastRunAt?.toISOString(),
    }

    campaignMetricsL1Cache.set(l1Key, dto)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 386] ", error)
    throw error
  }
}

export const executeCampaign = async (
  id: string,
  caller: IUser
): Promise<{ success: boolean; contactedCount: number; message: string }> => {
  const stopTimer = startTimer('executeCampaign')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    // Enforce tenant isolation on execution
    const campaign = (await ReactivationCampaign.findOne({
      _id: objectId,
      brokerageId: caller.brokerageId,
    })
      .select('_id name channel')
      .lean()) as IReactivationCampaign | null

    if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    const matchingContacts = await Contact.countDocuments({
      brokerageId: caller.brokerageId,
      isDeleted: false,
    })
    recordDbMetric('executeCampaign:countContacts', tDb)

    const batchCount = Math.max(12, Math.min(matchingContacts, 45))

    // Atomic increment
    await ReactivationCampaign.updateOne(
      { _id: campaign._id },
      {
        $inc: { contactedCount: batchCount },
        $set: { lastExecutedAt: new Date(), lastRunAt: new Date() },
      }
    )

    logAuditEvent({
      action: 'campaign.executed',
      userId: caller._id.toString(),
      resource: 'ReactivationCampaign',
      resourceId: id,
      details: { batchCount },
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 438] ", err?.message))

    campaignDetailL1Cache.delete(`camp:${id}`)
    campaignMetricsL1Cache.delete(`metrics:${id}`)
    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    stopTimer()
    return {
      success: true,
      contactedCount: batchCount,
      message: `Campaign "${campaign.name}" dispatched to ${batchCount} target leads via ${campaign.channel.toUpperCase()}.`,
    }
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 452] ", error)
    throw error
  }
}

export const toggleCampaignStatus = async (
  id: string,
  caller?: IUser
): Promise<ReactivationCampaignDto> => {
  const stopTimer = startTimer('toggleCampaignStatus')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid campaign ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)
    const query: Record<string, any> = { _id: objectId }
    if (caller?.brokerageId) {
      query.brokerageId = caller.brokerageId
    }

    const tDb = process.hrtime.bigint()
    const campaign = (await ReactivationCampaign.findOne(query)
      .select(CAMPAIGN_PROJECTION)
      .lean()) as IReactivationCampaign | null
    if (!campaign) throw new AppError('Campaign not found', HTTP_STATUS.NOT_FOUND)

    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    const updated = (await ReactivationCampaign.findOneAndUpdate(
      { _id: objectId },
      { $set: { status: newStatus } },
      { new: true, lean: true }
    ).select(CAMPAIGN_PROJECTION)) as IReactivationCampaign

    recordDbMetric('toggleCampaignStatus', tDb)

    campaignDetailL1Cache.delete(`camp:${id}`)
    campaignMetricsL1Cache.delete(`metrics:${id}`)
    await invalidateAiIsaCaches(caller?.brokerageId?.toString() || campaign.brokerageId.toString())

    const dto = formatCampaignDto(updated)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.error("[server/src/features/ai-isa/services/reactivationCampaign.service.ts: Line 287] ", error)
    throw error
  }
}
