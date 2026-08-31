import { Contact } from '../../models/Contact.js'
import { Deal } from '../../models/Deal.js'
import { DataHealthLog } from '../../models/DataHealthLog.js'
import { Activity } from '../../models/Activity.js'
import { User, IUser } from '../../models/User.js'
import { cacheGet, cacheSet } from '../../config/redis.js'
import {
  DashboardKpisDto,
  LeadSourceStatDto,
  LeadsOverTimeStatDto,
  PipelineSummaryDto,
  ActivityFeedItemDto,
  LeadPortalDto,
} from './dashboard.types.js'
import { AppError } from '../../middleware/errorHandler.js'

const CACHE_TTL = 300 // 5 minutes

const getCacheKey = (prefix: string, tenantFilter: Record<string, any>) => {
  return `dashboard:${prefix}:${JSON.stringify(tenantFilter)}`
}

export const getKpis = async (tenantFilter: Record<string, any>): Promise<DashboardKpisDto> => {
  const cacheKey = getCacheKey('kpis', tenantFilter)
  let cached = await cacheGet(cacheKey)
  //try once more if cached is null or undefined
  if (!cached) {
    cached = await cacheGet(cacheKey)
  }
  if (cached) return JSON.parse(cached)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [totalContacts, newLeads, activeDeals, healthLog, activeUsers, highPriorityLeads] = await Promise.all([
    Contact.countDocuments({ ...tenantFilter, isDeleted: false }),
    Contact.countDocuments({ ...tenantFilter, isDeleted: false, createdAt: { $gte: weekAgo } }),
    Deal.countDocuments({ ...tenantFilter, isDeleted: false }),
    tenantFilter.brokerageId ? DataHealthLog.findOne({ brokerageId: tenantFilter.brokerageId }).sort({ scannedAt: -1 }).lean() : null,
    User.countDocuments({ ...tenantFilter, isActive: true }),
    Contact.countDocuments({ ...tenantFilter, isDeleted: false, leadScore: { $gte: 80 } }),
  ])

  // Aggregate pipeline value
  const valueAgg = await Deal.aggregate([
    { $match: { ...tenantFilter, isDeleted: false } },
    { $group: { _id: null, totalValue: { $sum: '$dealValue' } } },
  ])

  const pipelineValue = valueAgg[0]?.totalValue || 0

  const result: DashboardKpisDto = {
    totalContacts,
    newLeadsThisWeek: newLeads,
    activeDeals,
    pipelineValue,
    dataHealthScore: healthLog ? healthLog.score : 0,
    dataHealthGrade: healthLog ? healthLog.grade : 'N/A',
    activeUsers,
    highPriorityLeads,
    avgSpeedSeconds: 24,
  }

  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL)
  return result
}

export const getLeadSources = async (tenantFilter: Record<string, any>): Promise<LeadSourceStatDto[]> => {
  const cacheKey = getCacheKey('leadSources', tenantFilter)
  let cached = await cacheGet(cacheKey)
  //if cache not fetched , try once again
  if (!cached) cached = await cacheGet(cacheKey)
  if (cached) return JSON.parse(cached)

  const result = await Contact.aggregate([
    { $match: { ...tenantFilter, isDeleted: false, leadSource: { $nin: [null, ''] } } },
    { $group: { _id: '$leadSource', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL)
  return result
}

export const getLeadsOverTime = async (tenantFilter: Record<string, any>): Promise<LeadsOverTimeStatDto[]> => {
  const cacheKey = getCacheKey('leadsOverTime', tenantFilter)
  let cached = await cacheGet(cacheKey)
  //if cache not fetched , try once again
  if (!cached) cached = await cacheGet(cacheKey)
  if (cached) return JSON.parse(cached)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const result = await Contact.aggregate([
    { $match: { ...tenantFilter, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } },
    {
      $project: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt',
            timezone: 'Asia/Karachi',
          },
        },
      },
    },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])

  await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL)
  return result
}

export const getPipelineSummary = async (tenantFilter: Record<string, any>): Promise<PipelineSummaryDto[]> => {
  const cacheKey = getCacheKey('pipelineSummary', tenantFilter)
  let cached = await cacheGet(cacheKey)
  //if cache not fetched , try once again
  if (!cached) cached = await cacheGet(cacheKey)
  if (cached) return JSON.parse(cached)

  const result = await Deal.aggregate([
    { $match: { ...tenantFilter, isDeleted: false } },
    {
      $group: {
        _id: '$stageId',
        count: { $sum: 1 },
        value: { $sum: '$dealValue' },
      },
    },
  ])

  // Need to convert ObjectIds in response (aggregate returns them as ObjectIds)
  const formatted = result.map(r => ({ ...r, _id: r._id ? r._id.toString() : 'unassigned' }))

  await cacheSet(cacheKey, JSON.stringify(formatted), CACHE_TTL)
  return formatted
}

export const getActivityFeed = async (tenantFilter: Record<string, any>): Promise<ActivityFeedItemDto[]> => {
  const result = await Activity.find({ ...tenantFilter })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()

  return result.map(a => ({
    id: a._id.toString(),
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdByName,
  }))
}

export const getLeadPortal = async (user: IUser): Promise<LeadPortalDto> => {
  if (user.role !== 'lead') {
    throw new AppError('Only leads can access the lead portal', 403)
  }

  // Match the lead User email to a Contact record
  const contact = await Contact.findOne({
    email: user.email,
    brokerageId: user.brokerageId,
    isDeleted: false
  }).lean()

  if (!contact) {
    throw new AppError('Contact record not found for this user account', 404)
  }

  let assignedAgent = undefined
  if (contact.assignedAgentId) {
    const agent = await User.findById(contact.assignedAgentId).lean()
    if (agent) {
      assignedAgent = {
        name: `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
        phone: agent.phone,
      }
    }
  }

  const deals = await Deal.find({
    contactId: contact._id,
    isDeleted: false
  }).lean()

  return {
    contactId: contact._id.toString(),
    assignedAgent,
    deals: deals.map(d => ({
      id: d._id.toString(),
      title: d.propertyAddress,
      value: d.dealValue,
      stage: d.stageId ? d.stageId.toString() : 'none',
    })),
  }
}
