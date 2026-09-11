import { Brokerage } from '../../models/Brokerage.js'
import { User, IUser } from '../../models/User.js'
import {
  BrokerageResponseDto,
  CreateBrokerageInput,
  UpdateBrokerageInput,
  ListBrokeragesQueryInput,
} from './brokerage.types.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { AppError } from '../../middleware/errorHandler.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { cacheGet, cacheSet, cacheInvalidatePattern } from '../../config/redis.js'
import {
  buildCacheKey,
  safeJsonParse,
  recordDbMetric,
} from '../../utils/cacheHelper.js'
import { getPagination } from '../../utils/pagination.js'
import mongoose from 'mongoose'

// Lean projection constant (PERF-M-002: omit heavy tokens and configs)
const BROKERAGE_PROJECTION = '_id name subdomain plan logoUrl timezone isActive createdAt updatedAt'

// L1 In-Memory Caches (< 0.05ms) with bounded size and 60s TTL
export const brokeragesL1Cache = new BoundedLruCache<{ brokerages: BrokerageResponseDto[]; total: number }>(500, 60)
export const brokerageDetailL1Cache = new BoundedLruCache<BrokerageResponseDto>(500, 60)

/**
 * Coordinated cache invalidation across L1 in-memory and L2 Redis (DI-003)
 */
export const invalidateBrokerageCaches = async (brokerageId?: string): Promise<void> => {
  brokeragesL1Cache.clear()
  if (brokerageId) {
    const detailKey = buildCacheKey(brokerageId, 'brokerage', { id: brokerageId })
    brokerageDetailL1Cache.delete(detailKey)
  } else {
    brokerageDetailL1Cache.clear()
  }

  // L2 Redis eviction executed out-of-band
  try {
    await Promise.all([
      cacheInvalidatePattern('pp:*:brokerage*'),
      cacheInvalidatePattern('pp:*:brokerages*'),
      cacheInvalidatePattern('pp:global:brokerages:*'),
    ])
  } catch (err: any) {
    logger.warn(`[BrokerageCache] Background L2 invalidation failed: ${err.message}`)
  }
}

// Format Brokerage document/lean object to DTO
const formatBrokerageDto = (brokerage: any, memberCount?: number): BrokerageResponseDto => ({
  id: brokerage._id.toString(),
  name: brokerage.name,
  subdomain: brokerage.subdomain,
  plan: brokerage.plan,
  logoUrl: brokerage.logoUrl,
  timezone: brokerage.timezone,
  isActive: brokerage.isActive,
  memberCount,
  createdAt: brokerage.createdAt instanceof Date ? brokerage.createdAt.toISOString() : new Date(brokerage.createdAt).toISOString(),
  updatedAt: brokerage.updatedAt instanceof Date ? brokerage.updatedAt.toISOString() : new Date(brokerage.updatedAt).toISOString(),
})

// List all brokerages with active member counts and bounded pagination (Super Admin only)
export const listAllBrokerages = async (
  query: ListBrokeragesQueryInput = {}
): Promise<{
  brokerages: BrokerageResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
  source: 'l1' | 'l2' | 'db'
}> => {
  const pagination = getPagination({
    page: query.page,
    limit: query.limit,
    defaultLimit: 25,
    maxLimit: 100,
  })
  const { page, limit, skip } = pagination

  // Deterministic cache key scoped globally for super-admin brokerage listing
  const cacheKey = buildCacheKey('global', 'brokerages', {
    page,
    limit,
    search: query.search || '',
    isActive: query.isActive !== undefined ? query.isActive : 'all',
  })

  // 1. Check L1 Memory Cache (< 0.05ms)
  const l1Hit = brokeragesL1Cache.get(cacheKey)
  if (l1Hit) {
    const totalPages = pagination.totalPages(l1Hit.total)
    return {
      brokerages: l1Hit.brokerages,
      total: l1Hit.total,
      page,
      limit,
      totalPages,
      source: 'l1',
    }
  }

  // 2. Check L2 Redis Cache (< 0.5ms) with fail-safe isolation (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<{ brokerages: BrokerageResponseDto[]; total: number }>(cachedRaw)
      if (parsed && Array.isArray(parsed.brokerages)) {
        brokeragesL1Cache.set(cacheKey, parsed, 60)
        const totalPages = pagination.totalPages(parsed.total)
        return {
          brokerages: parsed.brokerages,
          total: parsed.total,
          page,
          limit,
          totalPages,
          source: 'l2',
        }
      }
    }
  } catch (err: any) {
    logger.warn(`[BrokerageService] Redis cache lookup failed (${err.message}). Falling through to MongoDB.`)
  }

  // 3. Cache Miss: Execute indexed MongoDB query (< 10ms target, PERF-M-001)
  const t0Db = process.hrtime.bigint()
  const filter: Record<string, any> = {}
  if (query.search && query.search.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.name = { $regex: escaped, $options: 'i' }
  }
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive
  }

  let brokerages: any[]
  let total: number

  if (skip === 0) {
    brokerages = await Brokerage.find(filter)
      .select(BROKERAGE_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    if (brokerages.length < limit && !query.search) {
      total = brokerages.length
    } else {
      total = await Brokerage.countDocuments(filter)
    }
  } else {
    const [bList, count] = await Promise.all([
      Brokerage.find(filter)
        .select(BROKERAGE_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Brokerage.countDocuments(filter),
    ])
    brokerages = bList
    total = count
  }

  // Scoped member count aggregation using { brokerageId: 1, isActive: 1 } covering index (PERF-M-001)
  const targetIds = brokerages.map((b) => b._id)
  const countMap = new Map<string, number>()
  if (targetIds.length > 0) {
    const counts = await User.aggregate([
      { $match: { brokerageId: { $in: targetIds }, isActive: true } },
      { $group: { _id: '$brokerageId', count: { $sum: 1 } } },
    ])
    for (const c of counts) {
      if (c._id) {
        countMap.set(c._id.toString(), c.count)
      }
    }
  }

  recordDbMetric('brokerage:listAllBrokerages', t0Db, 10)

  const formattedList = brokerages.map((b) =>
    formatBrokerageDto(b, countMap.get(b._id.toString()) || 0)
  )
  const totalPages = pagination.totalPages(total)
  const cachePayload = { brokerages: formattedList, total }

  // 4. Populate L1 and L2 Caches asynchronously
  brokeragesL1Cache.set(cacheKey, cachePayload, 60)
  cacheSet(cacheKey, JSON.stringify(cachePayload), 300).catch((err: any) => {
    logger.warn(`[BrokerageService] Redis cacheSet failed: ${err.message}`)
  })

  return {
    brokerages: formattedList,
    total,
    page,
    limit,
    totalPages,
    source: 'db',
  }
}

// Get single brokerage details with L1/L2 caching (< 1.0ms)
export const getBrokerageDetail = async (
  id: string,
  caller: IUser
): Promise<{ brokerage: BrokerageResponseDto; source: 'l1' | 'l2' | 'db' }> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const objectId = new mongoose.Types.ObjectId(id)

  if (!verifyBrokerageAccess(caller, objectId)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }

  const cacheKey = buildCacheKey(id, 'brokerage', { id })

  // 1. Check L1 Memory Cache (< 0.05ms)
  const l1Hit = brokerageDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    return { brokerage: l1Hit, source: 'l1' }
  }

  // 2. Check L2 Redis Cache (< 0.5ms)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<BrokerageResponseDto>(cachedRaw)
      if (parsed) {
        brokerageDetailL1Cache.set(cacheKey, parsed, 60)
        return { brokerage: parsed, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[BrokerageService] Redis cache lookup failed (${err.message}). Falling through to MongoDB.`)
  }

  // 3. Cache Miss: Fetch with lean and covering queries (< 10ms)
  const t0Db = process.hrtime.bigint()
  const [brokerage, memberCount] = await Promise.all([
    Brokerage.findById(objectId).select(BROKERAGE_PROJECTION).lean(),
    User.countDocuments({ brokerageId: objectId, isActive: true }),
  ])

  recordDbMetric('brokerage:getBrokerageDetail', t0Db, 10)

  if (!brokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const dto = formatBrokerageDto(brokerage, memberCount)

  // 4. Populate L1 and L2 Caches
  brokerageDetailL1Cache.set(cacheKey, dto, 60)
  cacheSet(cacheKey, JSON.stringify(dto), 300).catch((err: any) => {
    logger.warn(`[BrokerageService] Redis cacheSet failed: ${err.message}`)
  })

  return { brokerage: dto, source: 'db' }
}

// Create new brokerage (Super Admin only)
export const createNewBrokerage = async (
  input: CreateBrokerageInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<BrokerageResponseDto> => {
  const t0Db = process.hrtime.bigint()
  const brokerage = await Brokerage.create({
    name: input.name,
    subdomain: input.subdomain,
    plan: input.plan || 'growth',
    timezone: input.timezone || 'America/New_York',
    createdBy: caller._id,
  })
  recordDbMetric('brokerage:createNewBrokerage', t0Db, 10)

  // Invalidate caches immediately
  invalidateBrokerageCaches().catch(() => {})

  // Fire-and-forget non-blocking audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: brokerage._id,
    action: 'BROKERAGE_CREATE',
    resource: 'brokerages',
    resourceId: brokerage._id.toString(),
    details: { name: brokerage.name, plan: brokerage.plan },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err: any) => {
    logger.error(`[BrokerageService] Audit log write failed: ${err.message}`)
  })

  return formatBrokerageDto(brokerage, 0)
}

// Update brokerage settings or plan with atomic update
export const updateBrokerageDetails = async (
  id: string,
  input: UpdateBrokerageInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<BrokerageResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const objectId = new mongoose.Types.ObjectId(id)

  if (!verifyBrokerageAccess(caller, objectId)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }

  // Only Super Admin can change plan tier
  if (input.plan && caller.role !== USER_ROLES.SUPER_ADMIN) {
    throw new AppError('Unauthorized: You may contact super admin', HTTP_STATUS.FORBIDDEN)
  }

  const updateFields: Record<string, any> = {}
  if (input.name !== undefined && typeof input.name === 'string') updateFields.name = input.name
  if (input.subdomain !== undefined && typeof input.subdomain === 'string') updateFields.subdomain = input.subdomain
  if (input.plan !== undefined && caller.role === USER_ROLES.SUPER_ADMIN && typeof input.plan === 'string') updateFields.plan = input.plan
  if (input.logoUrl !== undefined && typeof input.logoUrl === 'string') updateFields.logoUrl = input.logoUrl
  if (input.timezone !== undefined && typeof input.timezone === 'string') updateFields.timezone = input.timezone

  const t0Db = process.hrtime.bigint()
  const [updatedBrokerage, memberCount] = await Promise.all([
    Brokerage.findByIdAndUpdate(
      objectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select(BROKERAGE_PROJECTION)
      .lean(),
    User.countDocuments({ brokerageId: objectId, isActive: true }),
  ])
  recordDbMetric('brokerage:updateBrokerageDetails', t0Db, 10)

  if (!updatedBrokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  // Cache invalidation
  invalidateBrokerageCaches(id).catch(() => {})

  // Fire-and-forget non-blocking audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: updatedBrokerage._id,
    action: 'BROKERAGE_UPDATE',
    resource: 'brokerages',
    resourceId: updatedBrokerage._id.toString(),
    newState: {
      name: updatedBrokerage.name,
      subdomain: updatedBrokerage.subdomain,
      plan: updatedBrokerage.plan,
      logoUrl: updatedBrokerage.logoUrl,
      timezone: updatedBrokerage.timezone,
    },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err: any) => {
    logger.error(`[BrokerageService] Audit log write failed: ${err.message}`)
  })

  return formatBrokerageDto(updatedBrokerage, memberCount)
}

// Deactivate brokerage and revoke member sessions (Super Admin only)
export const deactivateBrokerage = async (
  id: string,
  caller?: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const objectId = new mongoose.Types.ObjectId(id)

  const t0Db = process.hrtime.bigint()
  const brokerage = await Brokerage.findByIdAndUpdate(
    objectId,
    { $set: { isActive: false } },
    { new: true }
  )
    .select(BROKERAGE_PROJECTION)
    .lean()

  if (!brokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  // Deactivate all users within the brokerage & invalidate sessions concurrently
  await User.updateMany(
    { brokerageId: objectId },
    { $set: { isActive: false }, $inc: { tokenVersion: 1 } }
  )
  recordDbMetric('brokerage:deactivateBrokerage', t0Db, 10)

  // Invalidate caches
  invalidateBrokerageCaches(id).catch(() => {})

  // Fire-and-forget non-blocking audit logging
  logAuditEvent({
    userId: caller?._id,
    userEmail: caller?.email,
    userRole: caller?.role,
    brokerageId: brokerage._id,
    action: 'BROKERAGE_DEACTIVATE',
    resource: 'brokerages',
    resourceId: brokerage._id.toString(),
    details: { name: brokerage.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err: any) => {
    logger.error(`[BrokerageService] Audit log write failed: ${err.message}`)
  })
}

