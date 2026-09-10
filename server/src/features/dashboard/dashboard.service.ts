import mongoose from 'mongoose'
import { Contact } from '../../models/Contact.js'
import { Deal } from '../../models/Deal.js'
import { DataHealthLog } from '../../models/DataHealthLog.js'
import { Activity } from '../../models/Activity.js'
import { User, IUser } from '../../models/User.js'
import { cacheDelete } from '../../config/redis.js'
import {
  DashboardKpisDto,
  LeadSourceStatDto,
  LeadsOverTimeStatDto,
  PipelineSummaryDto,
  ActivityFeedItemDto,
  LeadPortalDto,
} from './dashboard.types.js'
import { AppError } from '../../middleware/errorHandler.js'
import {
  measureExecutionMs,
  recordDbMetric,
  getDashboardCacheKey,
  getLeadPortalCacheKey,
  fetchWithSWR,
} from '../../utils/cacheHelper.js'
import { logger } from '../../utils/logger.js'

const CACHE_TTL_KPIS = 300 // 5 minutes fresh
const CACHE_TTL_SOURCES = 300 // 5 minutes fresh
const CACHE_TTL_TRENDS = 300 // 5 minutes fresh
const CACHE_TTL_PIPELINE = 300 // 5 minutes fresh
const CACHE_TTL_ACTIVITY = 60 // 1 minute fresh
const CACHE_TTL_LEAD_PORTAL = 180 // 3 minutes fresh

const normalizeTenantFilter = (tenantFilter: Record<string, any>): Record<string, any> => {
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

export const getKpis = async (tenantFilter: Record<string, any>): Promise<DashboardKpisDto> => {
  const fnStart = process.hrtime.bigint()
  const cacheKey = getDashboardCacheKey('kpis', tenantFilter)

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const filter = normalizeTenantFilter(tenantFilter)
      const dbStart = process.hrtime.bigint()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)

      const [contactStats, dealStats, healthLog, activeUsers] = await Promise.all([
        // Single-pass Contact aggregation with compound covering index
        Contact.aggregate([
          { $match: { ...filter, isDeleted: false } },
          {
            $group: {
              _id: null,
              totalContacts: { $sum: 1 },
              newLeadsThisWeek: {
                $sum: { $cond: [{ $gte: ['$createdAt', weekAgo] }, 1, 0] },
              },
              highPriorityLeads: {
                $sum: { $cond: [{ $gte: ['$leadScore', 80] }, 1, 0] },
              },
            },
          },
        ]),

        // Single-pass Deal aggregation with compound covering index
        Deal.aggregate([
          { $match: { ...filter, isDeleted: false } },
          {
            $group: {
              _id: null,
              activeDeals: { $sum: 1 },
              pipelineValue: { $sum: '$dealValue' },
            },
          },
        ]),

        // Covered query on latest data health log
        filter.brokerageId
          ? DataHealthLog.findOne({ brokerageId: filter.brokerageId })
              .sort({ scannedAt: -1 })
              .select('score grade')
              .lean()
          : null,

        // Covered query on active users count
        User.countDocuments({ ...filter, isActive: true }),
      ])

      recordDbMetric('getKpis', dbStart, 10)

      const contactAgg = contactStats[0]
      const dealAgg = dealStats[0]

      const result: DashboardKpisDto = {
        totalContacts: contactAgg?.totalContacts || 0,
        newLeadsThisWeek: contactAgg?.newLeadsThisWeek || 0,
        activeDeals: dealAgg?.activeDeals || 0,
        pipelineValue: dealAgg?.pipelineValue || 0,
        dataHealthScore: healthLog?.score || 0,
        dataHealthGrade: healthLog?.grade || 'N/A',
        activeUsers,
        highPriorityLeads: contactAgg?.highPriorityLeads || 0,
        avgSpeedSeconds: 24,
      }
      return result
    },
    CACHE_TTL_KPIS,
    CACHE_TTL_KPIS * 2
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getKpis] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
}

export const getLeadSources = async (tenantFilter: Record<string, any>): Promise<LeadSourceStatDto[]> => {
  const fnStart = process.hrtime.bigint()
  const cacheKey = getDashboardCacheKey('leadSources', tenantFilter)

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const filter = normalizeTenantFilter(tenantFilter)
      const dbStart = process.hrtime.bigint()
      const result = await Contact.aggregate([
        { $match: { ...filter, isDeleted: false, leadSource: { $nin: [null, ''] } } },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      recordDbMetric('getLeadSources', dbStart, 10)
      return result
    },
    CACHE_TTL_SOURCES,
    CACHE_TTL_SOURCES * 2
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getLeadSources] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
}

export const getLeadsOverTime = async (tenantFilter: Record<string, any>): Promise<LeadsOverTimeStatDto[]> => {
  const fnStart = process.hrtime.bigint()
  const cacheKey = getDashboardCacheKey('leadsOverTime', tenantFilter)

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const filter = normalizeTenantFilter(tenantFilter)
      const dbStart = process.hrtime.bigint()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await Contact.aggregate([
        { $match: { ...filter, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Karachi',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      recordDbMetric('getLeadsOverTime', dbStart, 10)
      return result
    },
    CACHE_TTL_TRENDS,
    CACHE_TTL_TRENDS * 2
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getLeadsOverTime] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
}

export const getPipelineSummary = async (tenantFilter: Record<string, any>): Promise<PipelineSummaryDto[]> => {
  const fnStart = process.hrtime.bigint()
  const cacheKey = getDashboardCacheKey('pipelineSummary', tenantFilter)

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const filter = normalizeTenantFilter(tenantFilter)
      const dbStart = process.hrtime.bigint()
      const result = await Deal.aggregate([
        { $match: { ...filter, isDeleted: false } },
        {
          $group: {
            _id: '$stageId',
            count: { $sum: 1 },
            value: { $sum: '$dealValue' },
          },
        },
        {
          $project: {
            _id: { $ifNull: [{ $toString: '$_id' }, 'unassigned'] },
            count: 1,
            value: 1,
          },
        },
      ])
      recordDbMetric('getPipelineSummary', dbStart, 10)
      return result
    },
    CACHE_TTL_PIPELINE,
    CACHE_TTL_PIPELINE * 2
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getPipelineSummary] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
}

export const getActivityFeed = async (tenantFilter: Record<string, any>): Promise<ActivityFeedItemDto[]> => {
  const fnStart = process.hrtime.bigint()
  const cacheKey = getDashboardCacheKey('activityFeed', tenantFilter)

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const filter = normalizeTenantFilter(tenantFilter)
      const dbStart = process.hrtime.bigint()
      const activities = await Activity.find({ ...filter })
        .select('_id type description createdAt createdByName')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
      recordDbMetric('getActivityFeed', dbStart, 10)

      const formatted: ActivityFeedItemDto[] = activities.map((a: any) => ({
        id: a._id.toString(),
        type: a.type,
        description: a.description,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
        createdBy: a.createdByName,
      }))
      return formatted
    },
    CACHE_TTL_ACTIVITY,
    CACHE_TTL_ACTIVITY * 3
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getActivityFeed] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
}

export const getLeadPortal = async (user: IUser): Promise<LeadPortalDto> => {
  const fnStart = process.hrtime.bigint()

  if (user.role !== 'lead') {
    throw new AppError('Only leads can access the lead portal', 403)
  }

  const cacheKey = getLeadPortalCacheKey(user._id.toString())

  const { data, source } = await fetchWithSWR(
    cacheKey,
    async () => {
      const dbStart = process.hrtime.bigint()
      const tenantBrokerageId = user.brokerageId

      let contact: any = null

      if (user.contactId) {
        const contactObjId = new mongoose.Types.ObjectId(user.contactId)
        contact = await Contact.findOne({
          _id: contactObjId,
          brokerageId: tenantBrokerageId,
          isDeleted: false,
        }).lean()
      }

      if (!contact && user.email) {
        contact = await Contact.findOne({
          email: user.email.toLowerCase().trim(),
          brokerageId: tenantBrokerageId,
          isDeleted: false,
        }).lean()
      }

      if (!contact && user.firstName && user.lastName) {
        contact = await Contact.findOne({
          firstName: user.firstName.trim(),
          lastName: user.lastName.trim(),
          brokerageId: tenantBrokerageId,
          isDeleted: false,
        }).lean()
      }

      if (!contact) {
        return {
          contactId: '',
          deals: [],
        } as LeadPortalDto
      }

      const [agent, deals] = await Promise.all([
        contact.assignedAgentId
          ? User.findOne({
              _id: new mongoose.Types.ObjectId(contact.assignedAgentId),
              brokerageId: tenantBrokerageId,
            })
              .select('firstName lastName email phone')
              .lean()
          : null,
        Deal.find({
          contactId: contact._id,
          brokerageId: tenantBrokerageId,
          isDeleted: false,
        })
          .select('_id propertyAddress dealValue stageId')
          .limit(20)
          .lean(),
      ])

      recordDbMetric('getLeadPortal', dbStart, 10)

      const assignedAgent = agent
        ? {
            name: `${agent.firstName} ${agent.lastName}`.trim(),
            email: agent.email,
            phone: agent.phone,
          }
        : undefined

      const result: LeadPortalDto = {
        contactId: contact._id.toString(),
        assignedAgent,
        contactProfile: {
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
          optedOutAt: contact.optedOutAt instanceof Date ? contact.optedOutAt.toISOString() : contact.optedOutAt,
        },
        deals: deals.map((d: any) => ({
          id: d._id.toString(),
          title: d.propertyAddress,
          value: d.dealValue,
          stage: d.stageId ? d.stageId.toString() : 'none',
        })),
      }
      return result
    },
    CACHE_TTL_LEAD_PORTAL,
    CACHE_TTL_LEAD_PORTAL * 2
  )

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:getLeadPortal] executed in ${durationMs.toFixed(3)}ms (source: ${source})`)
  return data
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
  const fnStart = process.hrtime.bigint()

  if (user.role !== 'lead') {
    throw new AppError('Only leads can access client portal settings', 403)
  }

  const tenantBrokerageId = user.brokerageId
  const userUpdates: Record<string, any> = {}

  if (input.firstName !== undefined) {
    const trimmed = input.firstName.trim()
    userUpdates.firstName = trimmed
    user.firstName = trimmed
  }
  if (input.lastName !== undefined) {
    const trimmed = input.lastName.trim()
    userUpdates.lastName = trimmed
    user.lastName = trimmed
  }
  if (input.phone !== undefined) {
    const trimmed = input.phone.trim()
    userUpdates.phone = trimmed
    user.phone = trimmed
  }

  const dbStart = process.hrtime.bigint()

  if (Object.keys(userUpdates).length > 0) {
    await User.updateOne(
      { _id: user._id, brokerageId: tenantBrokerageId },
      { $set: userUpdates }
    )
  }

  let targetContactId = user.contactId ? new mongoose.Types.ObjectId(user.contactId) : null
  if (!targetContactId && user.email) {
    const matchedContact = await Contact.findOne({
      email: user.email.toLowerCase().trim(),
      brokerageId: tenantBrokerageId,
      isDeleted: false,
    })
      .select('_id')
      .lean()
    if (matchedContact) {
      targetContactId = matchedContact._id as mongoose.Types.ObjectId
    }
  }

  if (targetContactId) {
    const contactSet: Record<string, any> = {}
    const contactUnset: Record<string, any> = {}

    if (input.firstName !== undefined) contactSet.firstName = input.firstName.trim()
    if (input.lastName !== undefined) contactSet.lastName = input.lastName.trim()
    if (input.phone !== undefined) contactSet.phone = input.phone.trim()
    if (input.secondaryPhone !== undefined) contactSet.secondaryPhone = input.secondaryPhone
    if (input.address !== undefined) contactSet.address = input.address
    if (input.city !== undefined) contactSet.city = input.city
    if (input.state !== undefined) contactSet.state = input.state
    if (input.zipCode !== undefined) contactSet.zipCode = input.zipCode
    if (input.propertyInterests !== undefined) contactSet.propertyInterests = input.propertyInterests

    if (input.dncStatus !== undefined) {
      contactSet.dncStatus = input.dncStatus
      if (input.dncStatus === 'opted_out') {
        contactSet.optedOutAt = new Date()
      } else {
        contactUnset.optedOutAt = 1
      }
    }

    const updateDoc: Record<string, any> = {}
    if (Object.keys(contactSet).length > 0) updateDoc.$set = contactSet
    if (Object.keys(contactUnset).length > 0) updateDoc.$unset = contactUnset

    if (Object.keys(updateDoc).length > 0) {
      await Contact.updateOne(
        { _id: targetContactId, brokerageId: tenantBrokerageId },
        updateDoc
      )
    }
  }

  recordDbMetric('updateLeadPortalProfile', dbStart, 10)

  // Invalidate cached portal entry
  await cacheDelete(getLeadPortalCacheKey(user._id.toString()))

  const freshPortal = await getLeadPortal(user)

  const durationMs = measureExecutionMs(fnStart)
  logger.info(`[DashboardService:updateLeadPortalProfile] executed in ${durationMs.toFixed(3)}ms`)
  return freshPortal
}
