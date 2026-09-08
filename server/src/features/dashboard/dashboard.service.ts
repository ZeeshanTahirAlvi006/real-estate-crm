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

  // 1. Match by contactId if present on User
  let contact: any = null
  if (user.contactId) {
    contact = await Contact.findOne({ _id: user.contactId, isDeleted: false }).lean()
  }

  // 2. Match by email
  if (!contact && user.email) {
    contact = await Contact.findOne({
      email: new RegExp(`^${user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      isDeleted: false,
    }).lean()
  }

  // 3. Match by Name if email differs
  if (!contact && user.firstName && user.lastName) {
    contact = await Contact.findOne({
      firstName: new RegExp(`^${user.firstName.trim()}$`, 'i'),
      lastName: new RegExp(`^${user.lastName.trim()}$`, 'i'),
      isDeleted: false,
    }).lean()
  }

  if (!contact) {
    return {
      contactId: '',
      deals: [],
    }
  }

  let assignedAgent = undefined
  if (contact?.assignedAgentId) {
    const agent = await User.findById(contact.assignedAgentId).lean()
    if (agent) {
      assignedAgent = {
        name: `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
        phone: agent.phone,
      }
    }
  }

  const deals = contact
    ? await Deal.find({
        contactId: contact._id,
        isDeleted: false,
      }).lean()
    : []

  return {
    contactId: contact ? contact._id.toString() : '',
    assignedAgent,
    contactProfile: contact
      ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          secondaryPhone: contact.secondaryPhone,
          address: contact.address,
          city: contact.city,
          state: contact.state,
          zipCode: contact.zipCode,
          propertyInterests: contact.propertyInterests || [],
          dncStatus: contact.dncStatus || 'clean',
          optedOutAt: contact.optedOutAt ? contact.optedOutAt.toISOString() : undefined,
        }
      : {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || '',
        },
    deals: deals.map((d) => ({
      id: d._id.toString(),
      title: d.propertyAddress,
      value: d.dealValue,
      stage: d.stageId ? d.stageId.toString() : 'none',
    })),
  }
}

export const updateLeadPortalProfile = async (
  user: IUser,
  input: {
    firstName?: string
    lastName?: string
    phone?: string
    secondaryPhone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    propertyInterests?: string[]
    dncStatus?: 'clean' | 'opted_out'
  }
): Promise<LeadPortalDto> => {
  if (user.role !== 'lead') {
    throw new AppError('Only leads can access client portal settings', 403)
  }

  if (input.firstName) user.firstName = input.firstName.trim()
  if (input.lastName) user.lastName = input.lastName.trim()
  if (input.phone) user.phone = input.phone.trim()
  await user.save()

  let contact = user.contactId ? await Contact.findById(user.contactId) : null
  if (!contact && user.email) {
    contact = await Contact.findOne({ email: user.email.toLowerCase(), isDeleted: false })
  }

  if (contact) {
    if (input.firstName) contact.firstName = input.firstName.trim()
    if (input.lastName) contact.lastName = input.lastName.trim()
    if (input.phone) contact.phone = input.phone.trim()
    if (input.secondaryPhone !== undefined) contact.secondaryPhone = input.secondaryPhone
    if (input.address !== undefined) contact.address = input.address
    if (input.city !== undefined) contact.city = input.city
    if (input.state !== undefined) contact.state = input.state
    if (input.zipCode !== undefined) contact.zipCode = input.zipCode
    if (input.propertyInterests !== undefined) contact.propertyInterests = input.propertyInterests
    if (input.dncStatus !== undefined) {
      contact.dncStatus = input.dncStatus
      contact.optedOutAt = input.dncStatus === 'opted_out' ? new Date() : undefined
    }
    await contact.save()
  }

  return getLeadPortal(user)
}
