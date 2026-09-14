import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { LeadSource } from '../../models/LeadSource.js'
import { RoutingRule } from '../../models/RoutingRule.js'
import { ScoringConfig } from '../../models/ScoringConfig.js'
import { Contact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { User, IUser } from '../../models/User.js'
import { encrypt, decrypt, generateSecureToken } from '../../utils/cryptoHelper.js'
import { cacheGet, cacheSet, cacheInvalidatePattern } from '../../config/redis.js'
import { getPagination } from '../../utils/pagination.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES, DEFAULT_ESCALATION_TIMEOUT } from '../../utils/constants.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { buildCacheKey, safeJsonParse, measureExecutionMs } from '../../utils/cacheHelper.js'
import {
  LeadSourceResponseDto,
  CreateLeadSourceInput,
  UpdateLeadSourceInput,
  ListLeadSourcesQuery,
  RoutingRuleResponseDto,
  CreateRoutingRuleInput,
  UpdateRoutingRuleInput,
  ListRoutingRulesQuery,
  ScoringConfigResponseDto,
  UpdateScoringConfigInput,
  LeadIngestPayload,
  LeadCapturePayload,
  ManualLeadEntryInput,
  ParsedLead,
  RoutingResult,
  GoogleAdsWebhookPayload,
  EmailParserPayload,
} from './lead.types.js'
import { formatContactDto, provisionLeadPortalUser } from '../contacts/contact.service.js'
import { ContactResponseDto } from '../contacts/contact.types.js'
import { emitNewLead } from '../../config/socket.js'
import { pushNotification } from '../notifications/notification.service.js'

// ═══════════════════════════════════════════
//  Bounded L1 In-Memory Caches (< 0.05ms)
// ═══════════════════════════════════════════
export const leadSourcesL1Cache = new BoundedLruCache<{ leadSources: LeadSourceResponseDto[]; total: number }>(500, 60)
export const leadSourceDetailL1Cache = new BoundedLruCache<LeadSourceResponseDto>(500, 60)
export const routingRulesL1Cache = new BoundedLruCache<{ routingRules: RoutingRuleResponseDto[]; total: number }>(500, 60)
export const routingRuleDetailL1Cache = new BoundedLruCache<RoutingRuleResponseDto>(500, 60)
export const scoringConfigL1Cache = new BoundedLruCache<ScoringConfigResponseDto>(500, 300)
export const activeRoutingRulesL1Cache = new BoundedLruCache<any[]>(500, 60)
export const captureKeyL1Cache = new BoundedLruCache<{ id: string; brokerageId: string; type: string }>(1000, 300)

// ═══════════════════════════════════════════
//  Coordinated Cache Invalidation (DI-003)
// ═══════════════════════════════════════════
export const invalidateLeadCaches = async (
  brokerageId?: string,
  leadSourceId?: string,
  routingRuleId?: string
): Promise<void> => {
  leadSourcesL1Cache.clear()
  routingRulesL1Cache.clear()
  activeRoutingRulesL1Cache.clear()
  scoringConfigL1Cache.clear()
  captureKeyL1Cache.clear()

  if (leadSourceId) {
    leadSourceDetailL1Cache.delete(leadSourceId)
  } else {
    leadSourceDetailL1Cache.clear()
  }

  if (routingRuleId) {
    routingRuleDetailL1Cache.delete(routingRuleId)
  } else {
    routingRuleDetailL1Cache.clear()
  }

  // Non-blocking L2 Redis pattern eviction
  try {
    const promises: Promise<any>[] = [
      cacheInvalidatePattern('pp:*:leads*'),
      cacheInvalidatePattern('pp:*:routing_rules*'),
      cacheInvalidatePattern('pp:*:scoring_config*'),
    ]
    if (brokerageId) {
      promises.push(cacheInvalidatePattern(`pp:${brokerageId}:*`))
    }
    await Promise.all(promises)
  } catch (err: any) {
    logger.warn(`[LeadsCache] Background L2 invalidation failed: ${err.message}`)
  }
}

// ═══════════════════════════════════════════
//  Memory-Safe Escalation Store (ML-001, ML-002)
// ═══════════════════════════════════════════
const MAX_PENDING_ESCALATIONS = 2000
const pendingEscalations = new Map<string, ReturnType<typeof setTimeout>>()

export const clearAllEscalations = (): void => {
  for (const timer of pendingEscalations.values()) {
    clearTimeout(timer)
  }
  pendingEscalations.clear()
}

// ═══════════════════════════════════════════
//  LEAD SOURCE CRUD
// ═══════════════════════════════════════════

const formatLeadSourceDto = (source: any, includeSecret: boolean = false): LeadSourceResponseDto => {
  const dto: LeadSourceResponseDto = {
    id: source._id.toString(),
    name: source.name,
    type: source.type,
    captureKey: source.captureKey,
    isActive: source.isActive,
    leadCount: source.leadCount || 0,
    config: {
      fieldMapping: source.config?.fieldMapping instanceof Map
        ? Object.fromEntries(source.config.fieldMapping)
        : source.config?.fieldMapping || {},
    },
    brokerageId: source.brokerageId.toString(),
    createdBy: source.createdBy.toString(),
    createdAt: source.createdAt instanceof Date ? source.createdAt.toISOString() : new Date(source.createdAt).toISOString(),
    updatedAt: source.updatedAt instanceof Date ? source.updatedAt.toISOString() : new Date(source.updatedAt).toISOString(),
  }

  if (includeSecret && source.webhookSecret) {
    try {
      dto.webhookSecret = decrypt(source.webhookSecret)
    } catch {
      dto.webhookSecret = '[decryption_failed]'
    }
  }

  return dto
}

export const createLeadSource = async (
  input: CreateLeadSourceInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<LeadSourceResponseDto> => {
  const t0 = process.hrtime.bigint()
  const rawSecret = generateSecureToken(16)
  const encryptedSecret = encrypt(rawSecret)
  const captureKey = uuidv4()

  const source = await LeadSource.create({
    ...input,
    webhookSecret: encryptedSecret,
    captureKey,
    brokerageId: new mongoose.Types.ObjectId(caller.brokerageId),
    createdBy: new mongoose.Types.ObjectId(caller._id),
  })

  // Synchronously invalidate caches
  invalidateLeadCaches(caller.brokerageId.toString())

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: caller.brokerageId,
    action: 'LEAD_SOURCE_CREATE',
    resource: 'lead_sources',
    resourceId: source._id.toString(),
    details: { name: source.name, type: source.type },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging LEAD_SOURCE_CREATE:', err))

  const dto = formatLeadSourceDto(source)
  dto.webhookSecret = rawSecret

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:createLeadSource] ${elapsed.toFixed(3)}ms`)
  return dto
}

export const listLeadSources = async (
  query: ListLeadSourcesQuery,
  _caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ leadSources: LeadSourceResponseDto[]; total: number; source: 'l1' | 'l2' | 'db' }> => {
  const t0 = process.hrtime.bigint()
  const bId = tenantFilter.brokerageId?.toString() || 'global'
  const pagination = getPagination({
    page: query.page,
    limit: query.limit,
    defaultLimit: 25,
    maxLimit: 100,
  })
  const { page, limit, skip } = pagination

  const cacheKey = buildCacheKey(bId, 'leads:sources', {
    page,
    limit,
    search: query.search || '',
    type: query.type || 'all',
    isActive: query.isActive !== undefined ? query.isActive : 'all',
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder || 'desc',
  })

  // 1. L1 Cache Check (< 0.05ms)
  const l1Hit = leadSourcesL1Cache.get(cacheKey)
  if (l1Hit) {
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][service:listLeadSources] ${elapsed.toFixed(3)}ms (source: L1)`)
    return { leadSources: l1Hit.leadSources, total: l1Hit.total, source: 'l1' }
  }

  // 2. L2 Redis Cache Check (< 0.5ms) (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<{ leadSources: LeadSourceResponseDto[]; total: number }>(cachedRaw)
      if (parsed) {
        leadSourcesL1Cache.set(cacheKey, parsed)
        const elapsed = measureExecutionMs(t0)
        console.log(`[LEADS-PERF][service:listLeadSources] ${elapsed.toFixed(3)}ms (source: L2)`)
        return { leadSources: parsed.leadSources, total: parsed.total, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[LeadSourceCache] Redis read failed: ${err.message}`)
  }

  // 3. Database Query with Compound Covering Index
  const filter: Record<string, any> = {}
  if (tenantFilter.brokerageId) {
    filter.brokerageId = new mongoose.Types.ObjectId(tenantFilter.brokerageId)
  }

  if (query.type && query.type !== 'all' && query.type !== 'undefined') filter.type = query.type
  if (query.isActive === 'true') filter.isActive = true
  else if (query.isActive === 'false') filter.isActive = false

  if (query.search && query.search.trim() && query.search !== 'undefined') {
    const escaped = escapeRegExp(query.search.trim())
    filter.name = { $regex: escaped, $options: 'i' }
  }

  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'createdAt'

  const [sources, total] = await Promise.all([
    LeadSource.find(filter)
      .select('_id name type captureKey isActive leadCount config brokerageId createdBy createdAt updatedAt')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeadSource.countDocuments(filter),
  ])

  const formattedSources = sources.map((s: any) => formatLeadSourceDto(s))
  const result = { leadSources: formattedSources, total }

  // Populate L1 & L2
  leadSourcesL1Cache.set(cacheKey, result)
  cacheSet(cacheKey, JSON.stringify(result), 60).catch(() => { })

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:listLeadSources] ${elapsed.toFixed(3)}ms (source: DB)`)
  return { ...result, source: 'db' }
}

export const getLeadSourceById = async (
  id: string,
  caller: IUser,
  includeSecret: boolean = false
): Promise<{ source: LeadSourceResponseDto; cacheSource: 'l1' | 'l2' | 'db' }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const objectId = new mongoose.Types.ObjectId(id)
  const cacheKey = buildCacheKey(caller.brokerageId.toString(), 'leads:source', { id, includeSecret })

  // Check L1 cache
  const l1Hit = leadSourceDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][service:getLeadSourceById] ${elapsed.toFixed(3)}ms (source: L1)`)
    return { source: l1Hit, cacheSource: 'l1' }
  }

  // Check L2 Redis (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<LeadSourceResponseDto>(cachedRaw)
      if (parsed) {
        leadSourceDetailL1Cache.set(cacheKey, parsed)
        const elapsed = measureExecutionMs(t0)
        console.log(`[LEADS-PERF][service:getLeadSourceById] ${elapsed.toFixed(3)}ms (source: L2)`)
        return { source: parsed, cacheSource: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[LeadSourceCache] Redis read failed: ${err.message}`)
  }

  // Database fetch
  const selectFields = includeSecret ? '+webhookSecret' : ''
  const source = await LeadSource.findById(objectId).select(selectFields).lean()
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && source.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const dto = formatLeadSourceDto(source, includeSecret)
  leadSourceDetailL1Cache.set(cacheKey, dto)
  cacheSet(cacheKey, JSON.stringify(dto), 60).catch(() => { })

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:getLeadSourceById] ${elapsed.toFixed(3)}ms (source: DB)`)
  return { source: dto, cacheSource: 'db' }
}

export const updateLeadSource = async (
  id: string,
  input: UpdateLeadSourceInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<LeadSourceResponseDto> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const filter: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)
  }

  // Atomic single-roundtrip update (DI-002)
  const source = await LeadSource.findOneAndUpdate(
    filter,
    { $set: input },
    { new: true, runValidators: true }
  ).lean()

  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  // Invalidate caches
  invalidateLeadCaches(source.brokerageId.toString(), id)

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: source.brokerageId,
    action: 'LEAD_SOURCE_UPDATE',
    resource: 'lead_sources',
    resourceId: source._id.toString(),
    details: { name: source.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging LEAD_SOURCE_UPDATE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:updateLeadSource] ${elapsed.toFixed(3)}ms`)
  return formatLeadSourceDto(source)
}

export const deleteLeadSource = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const filter: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)
  }

  const source = await LeadSource.findOneAndDelete(filter).lean()
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  // Invalidate caches
  invalidateLeadCaches(source.brokerageId.toString(), id)

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: source.brokerageId,
    action: 'LEAD_SOURCE_DELETE',
    resource: 'lead_sources',
    resourceId: source._id.toString(),
    details: { name: source.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging LEAD_SOURCE_DELETE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:deleteLeadSource] ${elapsed.toFixed(3)}ms`)
}

export const rotateWebhookSecret = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<{ webhookSecret: string }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const filter: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)
  }

  const newRawSecret = generateSecureToken(16)
  const encrypted = encrypt(newRawSecret)

  const source = await LeadSource.findOneAndUpdate(
    filter,
    { $set: { webhookSecret: encrypted } },
    { new: true }
  ).lean()

  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  // Invalidate caches
  invalidateLeadCaches(source.brokerageId.toString(), id)

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: source.brokerageId,
    action: 'LEAD_SOURCE_ROTATE_SECRET',
    resource: 'lead_sources',
    resourceId: source._id.toString(),
    details: { name: source.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging LEAD_SOURCE_ROTATE_SECRET:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:rotateWebhookSecret] ${elapsed.toFixed(3)}ms`)
  return { webhookSecret: newRawSecret }
}

// ═══════════════════════════════════════════
//  ROUTING RULE CRUD
// ═══════════════════════════════════════════

const formatRoutingRuleDto = (rule: any): RoutingRuleResponseDto => ({
  id: rule._id.toString(),
  name: rule.name,
  type: rule.type,
  isActive: rule.isActive,
  priority: rule.priority,
  brokerageId: rule.brokerageId.toString(),
  createdBy: rule.createdBy.toString(),
  assignedAgentIds: (rule.assignedAgentIds || []).map((id: any) => id.toString()),
  lastAssignedIndex: rule.lastAssignedIndex ?? -1,
  agentWeights: (rule.agentWeights || []).map((w: any) => ({
    agentId: w.agentId.toString(),
    percentage: w.percentage,
  })),
  zipCodeMappings: (rule.zipCodeMappings || []).map((m: any) => ({
    zipCodes: m.zipCodes,
    agentId: m.agentId.toString(),
  })),
  schedules: (rule.schedules || []).map((s: any) => ({
    agentId: s.agentId.toString(),
    timezone: s.timezone,
    windows: (s.windows || []).map((w: any) => ({
      dayOfWeek: w.dayOfWeek,
      startHour: w.startHour,
      endHour: w.endHour,
    })),
  })),
  escalationTimeoutSeconds: rule.escalationTimeoutSeconds ?? DEFAULT_ESCALATION_TIMEOUT,
  createdAt: rule.createdAt instanceof Date ? rule.createdAt.toISOString() : new Date(rule.createdAt).toISOString(),
  updatedAt: rule.updatedAt instanceof Date ? rule.updatedAt.toISOString() : new Date(rule.updatedAt).toISOString(),
})

const validateAgentIds = async (agentIds: string[], brokerageId: mongoose.Types.ObjectId): Promise<void> => {
  if (agentIds.length === 0) return

  const uniqueIds = [...new Set(agentIds)].filter((id) => mongoose.Types.ObjectId.isValid(id))
  const agents = await User.find({
    _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isActive: true,
    brokerageId: new mongoose.Types.ObjectId(brokerageId),
  })
    .select('_id')
    .lean()

  const foundIds = new Set(agents.map((a: any) => a._id.toString()))
  const missing = uniqueIds.filter((id) => !foundIds.has(id))

  if (missing.length > 0) {
    throw new AppError(
      `The following agent IDs are invalid, inactive, or do not belong to this brokerage: ${missing.join(', ')}`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY
    )
  }
}

const extractAgentIdsFromInput = (input: CreateRoutingRuleInput | UpdateRoutingRuleInput): string[] => {
  const ids: string[] = []
  if (input.assignedAgentIds) ids.push(...input.assignedAgentIds)
  if (input.agentWeights) ids.push(...input.agentWeights.map((w) => w.agentId))
  if (input.zipCodeMappings) ids.push(...input.zipCodeMappings.map((m) => m.agentId))
  if (input.schedules) ids.push(...input.schedules.map((s) => s.agentId))
  return ids
}

export const createRoutingRule = async (
  input: CreateRoutingRuleInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<RoutingRuleResponseDto> => {
  const t0 = process.hrtime.bigint()
  const agentIds = extractAgentIdsFromInput(input)
  await validateAgentIds(agentIds, caller.brokerageId)

  const rule = await RoutingRule.create({
    ...input,
    assignedAgentIds: (input.assignedAgentIds || []).map((id) => new mongoose.Types.ObjectId(id)),
    agentWeights: (input.agentWeights || []).map((w) => ({
      agentId: new mongoose.Types.ObjectId(w.agentId),
      percentage: w.percentage,
    })),
    zipCodeMappings: (input.zipCodeMappings || []).map((m) => ({
      zipCodes: m.zipCodes,
      agentId: new mongoose.Types.ObjectId(m.agentId),
    })),
    schedules: (input.schedules || []).map((s) => ({
      agentId: new mongoose.Types.ObjectId(s.agentId),
      timezone: s.timezone,
      windows: s.windows,
    })),
    brokerageId: new mongoose.Types.ObjectId(caller.brokerageId),
    createdBy: new mongoose.Types.ObjectId(caller._id),
  })

  // Invalidate caches
  invalidateLeadCaches(caller.brokerageId.toString())

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: caller.brokerageId,
    action: 'ROUTING_RULE_CREATE',
    resource: 'routing_rules',
    resourceId: rule._id.toString(),
    details: { name: rule.name, type: rule.type, priority: rule.priority },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging ROUTING_RULE_CREATE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:createRoutingRule] ${elapsed.toFixed(3)}ms`)
  return formatRoutingRuleDto(rule)
}

export const listRoutingRules = async (
  query: ListRoutingRulesQuery,
  _caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ routingRules: RoutingRuleResponseDto[]; total: number; source: 'l1' | 'l2' | 'db' }> => {
  const t0 = process.hrtime.bigint()
  const bId = tenantFilter.brokerageId?.toString() || 'global'
  const pagination = getPagination({
    page: query.page,
    limit: query.limit,
    defaultLimit: 25,
    maxLimit: 100,
  })
  const { page, limit, skip } = pagination

  const cacheKey = buildCacheKey(bId, 'leads:rules', {
    page,
    limit,
    type: query.type || 'all',
    isActive: query.isActive !== undefined ? query.isActive : 'all',
    sortBy: query.sortBy || 'priority',
    sortOrder: query.sortOrder || 'asc',
  })

  // 1. L1 Cache Check (< 0.05ms)
  const l1Hit = routingRulesL1Cache.get(cacheKey)
  if (l1Hit) {
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][service:listRoutingRules] ${elapsed.toFixed(3)}ms (source: L1)`)
    return { routingRules: l1Hit.routingRules, total: l1Hit.total, source: 'l1' }
  }

  // 2. L2 Redis Cache Check (< 0.5ms) (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<{ routingRules: RoutingRuleResponseDto[]; total: number }>(cachedRaw)
      if (parsed) {
        routingRulesL1Cache.set(cacheKey, parsed)
        const elapsed = measureExecutionMs(t0)
        console.log(`[LEADS-PERF][service:listRoutingRules] ${elapsed.toFixed(3)}ms (source: L2)`)
        return { routingRules: parsed.routingRules, total: parsed.total, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[RoutingRuleCache] Redis read failed: ${err.message}`)
  }

  // 3. Database Query
  const filter: Record<string, any> = {}
  if (tenantFilter.brokerageId) {
    filter.brokerageId = new mongoose.Types.ObjectId(tenantFilter.brokerageId)
  }

  if (query.type && query.type !== 'all' && query.type !== 'undefined') filter.type = query.type
  if (query.isActive === 'true') filter.isActive = true
  else if (query.isActive === 'false') filter.isActive = false

  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'priority'

  const [rules, total] = await Promise.all([
    RoutingRule.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
    RoutingRule.countDocuments(filter),
  ])

  const formattedRules = rules.map((r: any) => formatRoutingRuleDto(r))
  const result = { routingRules: formattedRules, total }

  // Populate L1 & L2
  routingRulesL1Cache.set(cacheKey, result)
  cacheSet(cacheKey, JSON.stringify(result), 60).catch(() => { })

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:listRoutingRules] ${elapsed.toFixed(3)}ms (source: DB)`)
  return { ...result, source: 'db' }
}

export const getRoutingRuleById = async (
  id: string,
  caller: IUser
): Promise<{ rule: RoutingRuleResponseDto; cacheSource: 'l1' | 'l2' | 'db' }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const objectId = new mongoose.Types.ObjectId(id)
  const cacheKey = buildCacheKey(caller.brokerageId.toString(), 'leads:rule', { id })

  // 1. L1 Cache Check
  const l1Hit = routingRuleDetailL1Cache.get(cacheKey)
  if (l1Hit) {
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][service:getRoutingRuleById] ${elapsed.toFixed(3)}ms (source: L1)`)
    return { rule: l1Hit, cacheSource: 'l1' }
  }

  // 2. L2 Redis Check (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<RoutingRuleResponseDto>(cachedRaw)
      if (parsed) {
        routingRuleDetailL1Cache.set(cacheKey, parsed)
        const elapsed = measureExecutionMs(t0)
        console.log(`[LEADS-PERF][service:getRoutingRuleById] ${elapsed.toFixed(3)}ms (source: L2)`)
        return { rule: parsed, cacheSource: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[RoutingRuleCache] Redis read failed: ${err.message}`)
  }

  // 3. Database Query
  const rule = await RoutingRule.findById(objectId).lean()
  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && rule.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const dto = formatRoutingRuleDto(rule)
  routingRuleDetailL1Cache.set(cacheKey, dto)
  cacheSet(cacheKey, JSON.stringify(dto), 60).catch(() => { })

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:getRoutingRuleById] ${elapsed.toFixed(3)}ms (source: DB)`)
  return { rule: dto, cacheSource: 'db' }
}

export const updateRoutingRule = async (
  id: string,
  input: UpdateRoutingRuleInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<RoutingRuleResponseDto> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const agentIds = extractAgentIdsFromInput(input)
  if (agentIds.length > 0) {
    await validateAgentIds(agentIds, caller.brokerageId)
  }

  const filter: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)
  }

  const updateFields: Record<string, any> = {}
  if (input.name !== undefined) updateFields.name = input.name
  if (input.isActive !== undefined) updateFields.isActive = input.isActive
  if (input.priority !== undefined) updateFields.priority = input.priority
  if (input.escalationTimeoutSeconds !== undefined) updateFields.escalationTimeoutSeconds = input.escalationTimeoutSeconds

  if (input.assignedAgentIds) {
    updateFields.assignedAgentIds = input.assignedAgentIds.map((aid) => new mongoose.Types.ObjectId(aid))
  }
  if (input.agentWeights) {
    updateFields.agentWeights = input.agentWeights.map((w) => ({
      agentId: new mongoose.Types.ObjectId(w.agentId),
      percentage: w.percentage,
    }))
  }
  if (input.zipCodeMappings) {
    updateFields.zipCodeMappings = input.zipCodeMappings.map((m) => ({
      zipCodes: m.zipCodes,
      agentId: new mongoose.Types.ObjectId(m.agentId),
    }))
  }
  if (input.schedules) {
    updateFields.schedules = input.schedules.map((s) => ({
      agentId: new mongoose.Types.ObjectId(s.agentId),
      timezone: s.timezone,
      windows: s.windows,
    }))
  }

  // Atomic single-roundtrip update (DI-002)
  const rule = await RoutingRule.findOneAndUpdate(
    filter,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).lean()

  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  // Invalidate caches
  invalidateLeadCaches(rule.brokerageId.toString(), undefined, id)

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: rule.brokerageId,
    action: 'ROUTING_RULE_UPDATE',
    resource: 'routing_rules',
    resourceId: rule._id.toString(),
    details: { name: rule.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging ROUTING_RULE_UPDATE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:updateRoutingRule] ${elapsed.toFixed(3)}ms`)
  return formatRoutingRuleDto(rule)
}

export const deleteRoutingRule = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const filter: Record<string, any> = { _id: new mongoose.Types.ObjectId(id) }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)
  }

  const rule = await RoutingRule.findOneAndDelete(filter).lean()
  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  // Invalidate caches
  invalidateLeadCaches(rule.brokerageId.toString(), undefined, id)

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: rule.brokerageId,
    action: 'ROUTING_RULE_DELETE',
    resource: 'routing_rules',
    resourceId: rule._id.toString(),
    details: { name: rule.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging ROUTING_RULE_DELETE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:deleteRoutingRule] ${elapsed.toFixed(3)}ms`)
}

// ═══════════════════════════════════════════
//  SCORING CONFIG
// ═══════════════════════════════════════════

const formatScoringConfigDto = (config: any): ScoringConfigResponseDto => ({
  id: config._id.toString(),
  brokerageId: config.brokerageId.toString(),
  sourceWeights: (config.sourceWeights || []).map((w: any) => ({
    sourceType: w.sourceType,
    points: w.points,
  })),
  keywordWeights: (config.keywordWeights || []).map((w: any) => ({
    keyword: w.keyword,
    points: w.points,
  })),
  priceTierWeights: (config.priceTierWeights || []).map((w: any) => ({
    minPrice: w.minPrice,
    maxPrice: w.maxPrice,
    points: w.points,
  })),
  financingBonus: config.financingBonus ?? 5,
  messageLengthBonus: {
    minLength: config.messageLengthBonus?.minLength ?? 100,
    points: config.messageLengthBonus?.points ?? 5,
  },
  baseScore: config.baseScore ?? 50,
  createdAt: config.createdAt instanceof Date ? config.createdAt.toISOString() : new Date(config.createdAt).toISOString(),
  updatedAt: config.updatedAt instanceof Date ? config.updatedAt.toISOString() : new Date(config.updatedAt).toISOString(),
})

export const getOrCreateScoringConfig = async (
  brokerageId: mongoose.Types.ObjectId
): Promise<{ config: any; source: 'l1' | 'l2' | 'db' }> => {
  const t0 = process.hrtime.bigint()
  const bIdStr = brokerageId.toString()
  const cacheKey = buildCacheKey(bIdStr, 'scoring_config', 'active')

  // 1. L1 cache (< 0.05ms)
  const l1Hit = scoringConfigL1Cache.get(cacheKey)
  if (l1Hit) {
    const elapsed = measureExecutionMs(t0)
    console.log(`[LEADS-PERF][service:getOrCreateScoringConfig] ${elapsed.toFixed(3)}ms (source: L1)`)
    return { config: l1Hit, source: 'l1' }
  }

  // 2. L2 Redis cache (< 0.5ms) (DI-003)
  try {
    const cachedRaw = await cacheGet(cacheKey)
    if (cachedRaw) {
      const parsed = safeJsonParse<ScoringConfigResponseDto>(cachedRaw)
      if (parsed) {
        scoringConfigL1Cache.set(cacheKey, parsed)
        const elapsed = measureExecutionMs(t0)
        console.log(`[LEADS-PERF][service:getOrCreateScoringConfig] ${elapsed.toFixed(3)}ms (source: L2)`)
        return { config: parsed, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[ScoringConfigCache] Redis read failed: ${err.message}`)
  }

  // 3. DB fetch or create
  const objectId = new mongoose.Types.ObjectId(brokerageId)
  let doc: any = await ScoringConfig.findOne({ brokerageId: objectId }).lean()
  if (!doc) {
    doc = (await ScoringConfig.create({ brokerageId: objectId })).toObject()
  }

  const dto = formatScoringConfigDto(doc)
  scoringConfigL1Cache.set(cacheKey, dto)
  cacheSet(cacheKey, JSON.stringify(dto), 3600).catch(() => { })

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:getOrCreateScoringConfig] ${elapsed.toFixed(3)}ms (source: DB)`)
  return { config: dto, source: 'db' }
}

export const getScoringConfig = async (
  caller: IUser
): Promise<{ config: ScoringConfigResponseDto; source: 'l1' | 'l2' | 'db' }> => {
  const { config, source } = await getOrCreateScoringConfig(caller.brokerageId)
  return { config, source }
}

export const updateScoringConfig = async (
  input: UpdateScoringConfigInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ScoringConfigResponseDto> => {
  const t0 = process.hrtime.bigint()
  const brokerageId = new mongoose.Types.ObjectId(caller.brokerageId)

  const updateFields: Record<string, any> = {}
  if (input.sourceWeights !== undefined) updateFields.sourceWeights = input.sourceWeights
  if (input.keywordWeights !== undefined) updateFields.keywordWeights = input.keywordWeights
  if (input.priceTierWeights !== undefined) updateFields.priceTierWeights = input.priceTierWeights
  if (input.financingBonus !== undefined) updateFields.financingBonus = input.financingBonus
  if (input.messageLengthBonus !== undefined) updateFields.messageLengthBonus = input.messageLengthBonus
  if (input.baseScore !== undefined) updateFields.baseScore = input.baseScore

  // Atomic upsert (DI-002)
  const config = await ScoringConfig.findOneAndUpdate(
    { brokerageId },
    { $set: updateFields },
    { new: true, upsert: true, runValidators: true }
  ).lean()

  // Invalidate caches
  invalidateLeadCaches(caller.brokerageId.toString())

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: caller.brokerageId,
    action: 'SCORING_CONFIG_UPDATE',
    resource: 'scoring_config',
    resourceId: config._id.toString(),
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging SCORING_CONFIG_UPDATE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:updateScoringConfig] ${elapsed.toFixed(3)}ms`)
  return formatScoringConfigDto(config)
}

// ═══════════════════════════════════════════
//  PAKISTAN PHONE NORMALIZATION & ADAPTERS
// ═══════════════════════════════════════════

export const normalizePakistaniPhone = (rawPhone: string): string => {
  if (!rawPhone) return ''
  const trimmed = rawPhone.trim()
  const cleaned = trimmed.replace(/[\s\-().]/g, '')

  // 03XXXXXXXXX (11 digits starting with 03) -> +923XXXXXXXXX
  if (/^03\d{9}$/.test(cleaned)) {
    return '+92' + cleaned.substring(1)
  }
  // 00923XXXXXXXXX -> +923XXXXXXXXX
  if (/^00923\d{9}$/.test(cleaned)) {
    return '+92' + cleaned.substring(4)
  }
  // 923XXXXXXXXX (12 digits starting with 923) -> +923XXXXXXXXX
  if (/^923\d{9}$/.test(cleaned)) {
    return '+' + cleaned
  }
  // +923XXXXXXXXX -> clean standard
  if (/^\+923\d{9}$/.test(cleaned)) {
    return cleaned
  }
  // 3XXXXXXXXX (10 digits starting with 3) -> +923XXXXXXXXX
  if (/^3\d{9}$/.test(cleaned)) {
    return '+92' + cleaned
  }

  // Preserve original non-Pakistani phone string
  return trimmed
}

export const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return { firstName: 'Unknown', lastName: 'Lead' }
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Lead' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export const mapGoogleAdsPayload = (body: GoogleAdsWebhookPayload): LeadIngestPayload => {
  const fields: Record<string, string> = {}
  if (Array.isArray(body.user_column_data)) {
    for (const col of body.user_column_data) {
      if (col.column_id && col.string_value) {
        fields[col.column_id.toUpperCase()] = col.string_value.trim()
      }
    }
  }

  const fullName = fields['FULL_NAME'] || ''
  let firstName = fields['FIRST_NAME'] || ''
  let lastName = fields['LAST_NAME'] || ''
  const email = fields['EMAIL'] || fields['USER_EMAIL'] || ''
  const rawPhone = fields['PHONE_NUMBER'] || fields['USER_PHONE'] || ''
  const phone = normalizePakistaniPhone(rawPhone)
  const city = fields['CITY'] || ''
  const zipCode = fields['POSTAL_CODE'] || fields['ZIP_CODE'] || ''
  const streetAddress = fields['STREET_ADDRESS'] || ''
  const propertyAddress = [streetAddress, city].filter(Boolean).join(', ')

  if ((!firstName || !lastName) && fullName) {
    const split = splitFullName(fullName)
    if (!firstName) firstName = split.firstName
    if (!lastName) lastName = split.lastName
  }

  if (!firstName) firstName = 'Google'
  if (!lastName) lastName = 'Lead'

  const nameFallback = fullName || `${firstName} ${lastName}`.trim() || 'Google Ads Lead'

  return {
    firstName,
    lastName,
    name: nameFallback,
    email,
    phone,
    propertyAddress,
    zipCode,
    source: 'google_ads',
    message: `Google Ads Lead Form #${body.form_id || ''} (Campaign #${body.campaign_id || ''})`,
    googleLeadId: body.lead_id,
    gclid: body.gclid || body.gcl_id,
  }
}

export const parseZameenEmailContent = (content: {
  subject?: string
  body?: string
  html?: string
}): LeadIngestPayload => {
  const text = (content.body || content.html || '') + '\n' + (content.subject || '')

  const nameMatch = text.match(/(?:Name|From|Inquirer|Buyer):\s*([^\r\n<]+)/i)
  const name = nameMatch ? nameMatch[1].trim() : ''

  const phoneMatch = text.match(/(?:Phone|Mobile|Contact No|Cell):\s*(\+?92[\s-]?\d{3}[\s-]?\d{7}|03\d{2}[\s-]?\d{7})/i)
  const rawPhone = phoneMatch ? phoneMatch[1].trim() : ''
  const phone = normalizePakistaniPhone(rawPhone)

  const emailMatch = text.match(/(?:Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  const email = emailMatch ? emailMatch[1].trim().toLowerCase() : ''

  const propIdMatch = text.match(/(?:Property ID|Reference ID|Listing ID):\s*(\d+)/i)
  const propertyId = propIdMatch ? propIdMatch[1].trim() : ''

  const locMatch = text.match(/(?:Location|Address|Property):\s*([^\r\n<]+)/i)
  let propertyAddress = locMatch ? locMatch[1].trim() : ''
  if (!propertyAddress && content.subject) {
    const subjMatch = content.subject.match(/(?:for|in)\s+(.+?)(?:-\s*Property ID|$)/i)
    if (subjMatch) propertyAddress = subjMatch[1].trim()
  }

  const priceMatch = text.match(/(?:Price|Demand):\s*([^\r\n<]+)/i)
  const priceStr = priceMatch ? priceMatch[1].trim() : ''

  const msgMatch = text.match(/(?:Message|Comment|Inquiry):\s*([\s\S]+?)(?=\n\s*(?:Regards|View Property|Zameen\.com|Property ID|$))/i)
  const message = msgMatch
    ? msgMatch[1].trim()
    : `Inquiry via Zameen.com${propertyId ? ` (Property ID: ${propertyId})` : ''}`

  return {
    name: name || 'Zameen Inquirer',
    phone,
    email,
    propertyAddress,
    source: 'zameen',
    message: `${message}${priceStr ? ` | Quoted: ${priceStr}` : ''}`,
    zameenPropertyId: propertyId,
  }
}

export const parseGraanaEmailContent = (content: {
  subject?: string
  body?: string
  html?: string
}): LeadIngestPayload => {
  const text = (content.body || content.html || '') + '\n' + (content.subject || '')

  const nameMatch = text.match(/(?:Name|Buyer|From):\s*([^\r\n<]+)/i)
  const name = nameMatch ? nameMatch[1].trim() : ''

  const phoneMatch = text.match(/(?:Phone|Contact|Mobile):\s*([\+0-9\s\-]+)/i)
  const rawPhone = phoneMatch ? phoneMatch[1].trim() : ''
  const phone = normalizePakistaniPhone(rawPhone)

  const emailMatch = text.match(/(?:Email):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)
  const email = emailMatch ? emailMatch[1].trim().toLowerCase() : ''

  const propIdMatch = text.match(/(?:Property\s*ID|Ref):\s*([A-Z0-9\-]+)/i)
  const propertyId = propIdMatch ? propIdMatch[1].trim() : ''

  const locMatch = text.match(/(?:Property|Location|Title):\s*([^\r\n<]+)/i)
  const propertyAddress = locMatch ? locMatch[1].trim() : ''

  const priceMatch = text.match(/(?:Price):\s*([^\r\n<]+)/i)
  const priceStr = priceMatch ? priceMatch[1].trim() : ''

  const msgMatch = text.match(/(?:Message|Query):\s*([\s\S]+?)(?=\n\s*(?:Regards|View on Graana|Graana\.com|$))/i)
  const message = msgMatch
    ? msgMatch[1].trim()
    : `Inquiry via Graana.com${propertyId ? ` (Property ID: ${propertyId})` : ''}`

  return {
    name: name || 'Graana Inquirer',
    phone,
    email,
    propertyAddress,
    source: 'graana',
    message: `${message}${priceStr ? ` | Price: ${priceStr}` : ''}`,
    graanaPropertyId: propertyId,
  }
}

export const parseOlxEmailContent = (content: {
  subject?: string
  body?: string
  html?: string
}): LeadIngestPayload => {
  const text = (content.body || content.html || '') + '\n' + (content.subject || '')

  let name = ''
  const nameMatch = text.match(/(?:message from|from)\s+([A-Za-z\s]+?)(?:\s+regarding|$|\n)/i)
  if (nameMatch) {
    name = nameMatch[1].trim()
  } else {
    const directNameMatch = text.match(/(?:Buyer|Name|User):\s*([^\r\n<]+)/i)
    if (directNameMatch) name = directNameMatch[1].trim()
  }

  let adTitle = ''
  const subjAdMatch = (content.subject || '').match(/(?:regarding:\s*|for\s+)(.+)/i)
  if (subjAdMatch) adTitle = subjAdMatch[1].trim()

  const adIdMatch = text.match(/(?:Ad ID|Listing ID):\s*(\d+)/i)
  const adId = adIdMatch ? adIdMatch[1].trim() : ''

  const chatUrlMatch = text.match(/(https:\/\/(?:www\.)?olx\.com\.pk\/myolx\/conversations\/[^\s"'>]+)/i)
  const olxChatUrl = chatUrlMatch ? chatUrlMatch[1].trim() : ''

  const pkPhoneRegex = /(?:\+92|0092|0)?\s?3[0-9]{2}[ -]?[0-9]{7}/g
  const phoneMatches = text.match(pkPhoneRegex)
  const rawPhone = phoneMatches && phoneMatches.length > 0 ? phoneMatches[0].trim() : ''
  const phone = rawPhone ? normalizePakistaniPhone(rawPhone) : ''

  const msgMatch = text.match(/(?:Message|Chat):\s*([\s\S]+?)(?=\n\s*(?:Reply|Open OLX|View conversation|$))/i)
  const messageText = msgMatch ? msgMatch[1].trim() : (content.body || '').substring(0, 500)

  return {
    name: name || 'OLX User',
    phone,
    propertyAddress: adTitle,
    source: 'olx',
    message: messageText || `OLX chat inquiry${adId ? ` (Ad ID: ${adId})` : ''}`,
    olxChatUrl,
    adId,
  }
}

// ═══════════════════════════════════════════
//  UNIVERSAL LEAD PARSER
// ═══════════════════════════════════════════

export const parseUniversalPayload = (raw: LeadIngestPayload): ParsedLead => {
  let firstName = (raw.firstName || '').trim()
  let lastName = (raw.lastName || '').trim()

  // Support Google Ads user_column_data array format if raw payload arrives from webhook simulator or direct POST
  if (Array.isArray((raw as any).user_column_data)) {
    const colFields: Record<string, string> = {}
    for (const col of (raw as any).user_column_data) {
      if (col?.column_id && col?.string_value) {
        colFields[col.column_id.toUpperCase()] = col.string_value.trim()
      }
    }
    const fullName = colFields['FULL_NAME'] || ''
    const colFirst = colFields['FIRST_NAME'] || ''
    const colLast = colFields['LAST_NAME'] || ''

    if (colFirst) firstName = colFirst
    if (colLast) lastName = colLast

    if ((!firstName || !lastName) && fullName) {
      const split = splitFullName(fullName)
      if (!firstName) firstName = split.firstName
      if (!lastName) lastName = split.lastName
    }

    if (!raw.name && fullName) {
      raw.name = fullName
    }

    if (!raw.email && (colFields['EMAIL'] || colFields['USER_EMAIL'])) {
      (raw as any).email = colFields['EMAIL'] || colFields['USER_EMAIL']
    }
    if (!raw.phone && (colFields['PHONE_NUMBER'] || colFields['USER_PHONE'])) {
      (raw as any).phone = colFields['PHONE_NUMBER'] || colFields['USER_PHONE']
    }
    if (!raw.propertyAddress && (colFields['STREET_ADDRESS'] || colFields['CITY'])) {
      (raw as any).propertyAddress = [colFields['STREET_ADDRESS'], colFields['CITY']].filter(Boolean).join(', ')
    }
    if (!raw.zipCode && (colFields['POSTAL_CODE'] || colFields['ZIP_CODE'])) {
      (raw as any).zipCode = colFields['POSTAL_CODE'] || colFields['ZIP_CODE']
    }
    if (!raw.source) {
      (raw as any).source = 'google_ads'
    }
  }

  if (!firstName && !lastName && raw.name) {
    const split = splitFullName(raw.name)
    firstName = split.firstName
    lastName = split.lastName
  }

  if (!firstName) {
    firstName = ((raw as any).first_name || (raw as any).fname || (raw as any).given_name || 'Unknown').toString().trim()
  }
  if (!lastName) {
    lastName = ((raw as any).last_name || (raw as any).lname || (raw as any).family_name || 'Lead').toString().trim()
  }
  if (!firstName) firstName = 'Unknown'
  if (!lastName) lastName = 'Lead'

  const email = (
    raw.email ||
    (raw as any).email_address ||
    (raw as any).emailAddress ||
    ''
  ).toString().trim().toLowerCase()

  const rawPhone = (
    raw.phone ||
    (raw as any).phone_number ||
    (raw as any).phoneNumber ||
    (raw as any).mobile ||
    ''
  ).toString().trim()
  const phone = normalizePakistaniPhone(rawPhone)

  const message = (
    raw.message ||
    (raw as any).comments ||
    (raw as any).notes ||
    (raw as any).inquiry ||
    ''
  ).toString().trim()

  const propertyAddress = (
    raw.propertyAddress ||
    (raw as any).property_address ||
    (raw as any).address ||
    (raw as any).listing_address ||
    ''
  ).toString().trim()

  const propertyPrice = Number(
    raw.propertyPrice ||
    (raw as any).property_price ||
    (raw as any).price ||
    (raw as any).listing_price ||
    0
  ) || 0

  const zipCode = (
    raw.zipCode ||
    (raw as any).zip_code ||
    (raw as any).zip ||
    (raw as any).postal_code ||
    ''
  ).toString().trim()

  const rawSource = (
    raw.source ||
    (raw as any).lead_source ||
    (raw as any).leadSource ||
    (raw as any).utm_source ||
    'webhook'
  ).toString().trim().toLowerCase()

  let sourceType = rawSource
  if (rawSource.includes('google')) sourceType = 'google_ads'
  else if (rawSource.includes('meta') || rawSource.includes('facebook') || rawSource.includes('instagram')) sourceType = 'meta_ads'
  else if (rawSource.includes('zameen')) sourceType = 'zameen'
  else if (rawSource.includes('graana')) sourceType = 'graana'
  else if (rawSource.includes('olx')) sourceType = 'olx'
  else if (rawSource.includes('whatsapp')) sourceType = 'whatsapp'

  return { firstName, lastName, email, phone, message, propertyAddress, propertyPrice, zipCode, sourceType }
}

// ═══════════════════════════════════════════
//  LEAD SCORING ENGINE (In-Memory Hot Path)
// ═══════════════════════════════════════════

export const calculateLeadScore = async (
  parsed: ParsedLead,
  brokerageId: mongoose.Types.ObjectId
): Promise<number> => {
  const { config } = await getOrCreateScoringConfig(brokerageId)
  let score = config.baseScore

  // 1. Source weight
  const sourceWeight = config.sourceWeights.find(
    (w: any) => w.sourceType.toLowerCase() === parsed.sourceType.toLowerCase()
  )
  if (sourceWeight) score += sourceWeight.points

  // 2. Keyword weights
  if (parsed.message) {
    const messageLower = parsed.message.toLowerCase()
    for (const kw of config.keywordWeights) {
      if (messageLower.includes(kw.keyword.toLowerCase())) {
        score += kw.points
      }
    }
  }

  // 3. Price tier weights
  if (parsed.propertyPrice > 0) {
    const tier = config.priceTierWeights.find(
      (t: any) => parsed.propertyPrice >= t.minPrice && parsed.propertyPrice < t.maxPrice
    )
    if (tier) score += tier.points
  }

  // 4. Financing bonus
  if (parsed.message) {
    const financingKeywords = ['mortgage', 'financing', 'loan', 'pre-approved', 'pre approved', 'fha', 'va loan', 'down payment']
    const msgLower = parsed.message.toLowerCase()
    if (financingKeywords.some((kw) => msgLower.includes(kw))) {
      score += config.financingBonus
    }
  }

  // 5. Message length bonus
  if (parsed.message && parsed.message.length >= config.messageLengthBonus.minLength) {
    score += config.messageLengthBonus.points
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

// ═══════════════════════════════════════════
//  ROUTING ENGINE (Fault-Tolerant & Cached)
// ═══════════════════════════════════════════

const executeRoundRobin = async (rule: any): Promise<string | null> => {
  const agents = rule.assignedAgentIds
  if (!agents || agents.length === 0) return null

  const ruleIdStr = rule._id.toString()
  const redisKey = `rr:${ruleIdStr}`
  let currentIndex = -1

  // Safe Redis lookup (DI-003)
  try {
    const cachedIndex = await cacheGet(redisKey)
    if (cachedIndex !== null) {
      currentIndex = parseInt(cachedIndex, 10)
    }
  } catch (err: any) {
    logger.warn(`[RoundRobin] Redis cacheGet failed: ${err.message}`)
  }

  if (currentIndex === -1) {
    currentIndex = rule.lastAssignedIndex ?? -1
  }

  const nextIndex = (currentIndex + 1) % agents.length
  const selectedAgent = agents[nextIndex]

  // Safe Redis update
  try {
    await cacheSet(redisKey, nextIndex.toString(), 86400)
  } catch (err: any) {
    logger.warn(`[RoundRobin] Redis cacheSet failed: ${err.message}`)
  }

  // Background DB update off critical path
  RoutingRule.updateOne(
    { _id: new mongoose.Types.ObjectId(rule._id) },
    { lastAssignedIndex: nextIndex }
  ).catch((err: any) => logger.error(`[RoundRobin] Failed to persist lastAssignedIndex: ${err.message}`))

  return selectedAgent.toString()
}

const executeWeighted = (rule: any): string | null => {
  const weights = rule.agentWeights
  if (!weights || weights.length === 0) return null

  const random = Math.random() * 100
  let cumulative = 0

  for (const entry of weights) {
    cumulative += entry.percentage
    if (random <= cumulative) {
      return entry.agentId.toString()
    }
  }

  return weights[weights.length - 1].agentId.toString()
}

const executeZipCode = (rule: any, leadZipCode: string): string | null => {
  if (!leadZipCode || !rule.zipCodeMappings || rule.zipCodeMappings.length === 0) return null

  for (const mapping of rule.zipCodeMappings) {
    if (mapping.zipCodes.includes(leadZipCode)) {
      return mapping.agentId.toString()
    }
  }

  return null
}

const executeTimeOfDay = (rule: any): string | null => {
  if (!rule.schedules || rule.schedules.length === 0) return null

  for (const schedule of rule.schedules) {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: schedule.timezone,
        hour: 'numeric',
        hour12: false,
        weekday: 'short',
      })
      const parts = formatter.formatToParts(now)
      const hourPart = parts.find((p) => p.type === 'hour')
      const dayPart = parts.find((p) => p.type === 'weekday')

      if (!hourPart || !dayPart) continue

      const currentHour = parseInt(hourPart.value, 10)
      const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
      const currentDay = dayMap[dayPart.value] ?? -1

      for (const window of schedule.windows) {
        if (
          window.dayOfWeek.includes(currentDay) &&
          currentHour >= window.startHour &&
          currentHour < window.endHour
        ) {
          return schedule.agentId.toString()
        }
      }
    } catch {
      continue
    }
  }

  return null
}

export const executeRoutingEngine = async (
  brokerageId: mongoose.Types.ObjectId,
  leadZipCode: string = ''
): Promise<RoutingResult> => {
  const t0 = process.hrtime.bigint()
  const bIdStr = brokerageId.toString()
  const cacheKey = buildCacheKey(bIdStr, 'routing_rules', 'active')

  let rules: any[] | null = activeRoutingRulesL1Cache.get(cacheKey) || null
  let source: 'l1' | 'l2' | 'db' = 'l1'

  if (!rules) {
    try {
      const cachedRaw = await cacheGet(cacheKey)
      if (cachedRaw) {
        rules = safeJsonParse<any[]>(cachedRaw)
        if (rules) {
          activeRoutingRulesL1Cache.set(cacheKey, rules)
          source = 'l2'
        }
      }
    } catch (err: any) {
      logger.warn(`[RoutingRuleCache] Redis read failed: ${err.message}`)
    }
  }

  if (!rules) {
    rules = await RoutingRule.find({
      brokerageId: new mongoose.Types.ObjectId(brokerageId),
      isActive: true,
    })
      .sort({ priority: 1 })
      .lean()

    source = 'db'
    activeRoutingRulesL1Cache.set(cacheKey, rules)
    cacheSet(cacheKey, JSON.stringify(rules), 300).catch(() => { })
  }

  for (const rule of rules) {
    let agentId: string | null = null

    switch (rule.type) {
      case 'round_robin':
        agentId = await executeRoundRobin(rule)
        break
      case 'weighted':
        agentId = executeWeighted(rule)
        break
      case 'zip_code':
        agentId = executeZipCode(rule, leadZipCode)
        break
      case 'time_of_day':
        agentId = executeTimeOfDay(rule)
        break
    }

    if (agentId) {
      const elapsed = measureExecutionMs(t0)
      console.log(`[LEADS-PERF][service:executeRoutingEngine] ${elapsed.toFixed(3)}ms (source: ${source}, matched: ${rule.name})`)
      return {
        agentId,
        ruleId: rule._id.toString(),
        ruleName: rule.name,
        ruleType: rule.type,
        matched: true,
      }
    }
  }

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:executeRoutingEngine] ${elapsed.toFixed(3)}ms (source: ${source}, matched: none)`)
  return { agentId: null, ruleId: null, ruleName: null, ruleType: null, matched: false }
}

// ═══════════════════════════════════════════
//  ESCALATION TIMER (Memory-Safe)
// ═══════════════════════════════════════════

const startEscalationTimer = (
  contactId: string,
  brokerageId: mongoose.Types.ObjectId,
  currentAgentId: string,
  timeoutSeconds: number = DEFAULT_ESCALATION_TIMEOUT
): void => {
  cancelEscalation(contactId)

  if (pendingEscalations.size >= MAX_PENDING_ESCALATIONS) {
    // Evict oldest timer to protect memory
    const firstKey = pendingEscalations.keys().next().value
    if (firstKey) cancelEscalation(firstKey)
  }

  const timer = setTimeout(async () => {
    try {
      pendingEscalations.delete(contactId)

      const contact = await Contact.findById(new mongoose.Types.ObjectId(contactId)).lean()
      if (!contact || contact.isAcknowledged || contact.isDeleted) return

      const result = await executeRoutingEngine(brokerageId, contact.zipCode || '')

      if (result.matched && result.agentId && result.agentId !== currentAgentId) {
        await Contact.updateOne(
          { _id: contact._id },
          {
            $set: {
              assignedAgentId: new mongoose.Types.ObjectId(result.agentId),
              assignedAt: new Date(),
              isAcknowledged: false,
            },
          }
        )

        Activity.create({
          contactId: contact._id,
          brokerageId,
          type: 'lead_escalated',
          description: `Lead escalated from agent ${currentAgentId} to agent ${result.agentId} after ${timeoutSeconds}s timeout (Rule: ${result.ruleName})`,
          metadata: new Map([
            ['previousAgentId', currentAgentId],
            ['newAgentId', result.agentId],
            ['ruleName', result.ruleName || ''],
            ['timeoutSeconds', timeoutSeconds.toString()],
          ]),
        }).catch(() => { })
      }
    } catch (error) {
      logger.error(`Escalation timer error for contact ${contactId}:`, error)
    }
  }, timeoutSeconds * 1000)

  pendingEscalations.set(contactId, timer)
}

export const cancelEscalation = (contactId: string): void => {
  const existing = pendingEscalations.get(contactId)
  if (existing) {
    clearTimeout(existing)
    pendingEscalations.delete(contactId)
  }
}

// ═══════════════════════════════════════════
//  SECURITY & SIGNATURE VERIFICATION
// ═══════════════════════════════════════════

export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

export const verifyApiKey = (providedKey: string, expectedKey: string): boolean => {
  if (!providedKey || !expectedKey) return false
  const providedBuffer = Buffer.from(providedKey)
  const expectedBuffer = Buffer.from(expectedKey)
  if (providedBuffer.length !== expectedBuffer.length) return false
  try {
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════
//  LEAD INGESTION PIPELINE (Single-Pass)
// ═══════════════════════════════════════════

const findExistingContact = async (
  brokerageId: mongoose.Types.ObjectId,
  email: string,
  phone: string
): Promise<any | null> => {
  if (!email && !phone) return null

  const orConditions: Record<string, any>[] = []
  if (email) orConditions.push({ email: email.toLowerCase() })
  if (phone) orConditions.push({ phone })

  return Contact.findOne({
    brokerageId: new mongoose.Types.ObjectId(brokerageId),
    isDeleted: false,
    $or: orConditions,
  })
    .select('_id email phone leadSource leadScore inquiryCount address zipCode isAcknowledged assignedAgentId')
    .lean()
}

export const ingestLead = async (
  rawPayload: LeadIngestPayload,
  brokerageId: mongoose.Types.ObjectId,
  leadSourceId?: mongoose.Types.ObjectId,
  sourceType?: string,
  clientIp: string = '127.0.0.1'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  const t0 = process.hrtime.bigint()

  // 1. Parse universal payload (in-memory)
  const parsed = parseUniversalPayload(rawPayload)
  if (sourceType) parsed.sourceType = sourceType

  // 2. Concurrently compute score & evaluate routing in-memory (using L1 caches)
  const [leadScore, routingResult] = await Promise.all([
    calculateLeadScore(parsed, brokerageId),
    executeRoutingEngine(brokerageId, parsed.zipCode),
  ])

  const assignedAgentId = routingResult.matched && routingResult.agentId
    ? new mongoose.Types.ObjectId(routingResult.agentId)
    : undefined

  // 3. Deduplication check using covered index
  const existingContact = await findExistingContact(brokerageId, parsed.email, parsed.phone)

  let contact: any
  let isNew = false

  if (existingContact) {
    // Single atomic database update
    const updateSet: Record<string, any> = {
      leadSource: parsed.sourceType || existingContact.leadSource,
      leadScore: Math.max(existingContact.leadScore || 0, leadScore),
      inquiryCount: (existingContact.inquiryCount || 1) + 1,
      originalPayload: rawPayload,
      lastContactedAt: new Date(),
    }
    if (leadSourceId) updateSet.leadSourceId = new mongoose.Types.ObjectId(leadSourceId)
    if (parsed.propertyAddress && !existingContact.address) updateSet.address = parsed.propertyAddress
    if (parsed.zipCode && !existingContact.zipCode) updateSet.zipCode = parsed.zipCode
    if (assignedAgentId) {
      updateSet.assignedAgentId = assignedAgentId
      updateSet.assignedAt = new Date()
      updateSet.isAcknowledged = false
    }

    contact = await Contact.findByIdAndUpdate(
      existingContact._id,
      { $set: updateSet },
      { new: true }
    ).lean()

    // Decoupled background activity
    Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'lead_reinquiry',
      description: `Lead reinquiry #${contact.inquiryCount} from ${parsed.sourceType}${parsed.message ? ': ' + parsed.message.substring(0, 200) : ''}`,
      metadata: new Map([
        ['sourceType', parsed.sourceType],
        ['inquiryCount', contact.inquiryCount.toString()],
        ['leadScore', leadScore.toString()],
      ]),
    }).catch((err) => logger.warn('[Activity] Lead reinquiry log failed:', err))
  } else {
    // Single new contact write with routing and scoring pre-assigned
    isNew = true
    contact = (
      await Contact.create({
        firstName: parsed.firstName || 'Unknown',
        lastName: parsed.lastName || 'Lead',
        email: parsed.email || '',
        phone: parsed.phone || '',
        address: parsed.propertyAddress || '',
        zipCode: parsed.zipCode || '',
        leadSource: parsed.sourceType || 'webhook',
        leadScore,
        status: 'active',
        brokerageId: new mongoose.Types.ObjectId(brokerageId),
        leadSourceId: leadSourceId ? new mongoose.Types.ObjectId(leadSourceId) : undefined,
        originalPayload: rawPayload,
        isAcknowledged: false,
        inquiryCount: 1,
        propertyInterests: parsed.propertyAddress ? [parsed.propertyAddress] : [],
        notes: parsed.message || '',
        assignedAgentId,
        assignedAt: assignedAgentId ? new Date() : undefined,
      })
    ).toObject()

    // Decoupled background activity & lead portal provisioning
    Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'system',
      description: `New lead ingested from ${parsed.sourceType} (score: ${leadScore})`,
      metadata: new Map([
        ['sourceType', parsed.sourceType],
        ['leadScore', leadScore.toString()],
        ['isNew', 'true'],
      ]),
    }).catch((err) => logger.warn('[Activity] New lead log failed:', err))

    provisionLeadPortalUser(contact, { firstName: 'PropPulse', lastName: 'System', brokerageId } as any)
      .catch(() => { })
  }

  // Decoupled routing activity & escalation timer
  if (routingResult.matched && routingResult.agentId) {
    Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'lead_routed',
      description: `Lead routed to agent ${routingResult.agentId} via "${routingResult.ruleName}" (${routingResult.ruleType})`,
      metadata: new Map([
        ['agentId', routingResult.agentId],
        ['ruleId', routingResult.ruleId || ''],
        ['ruleName', routingResult.ruleName || ''],
        ['ruleType', routingResult.ruleType || ''],
      ]),
    }).catch((err) => logger.warn('[Activity] Lead routed log failed:', err))

    if (routingResult.ruleType === 'time_of_day' && routingResult.ruleId) {
      RoutingRule.findById(new mongoose.Types.ObjectId(routingResult.ruleId))
        .select('escalationTimeoutSeconds')
        .lean()
        .then((rule) => {
          const timeout = rule?.escalationTimeoutSeconds || DEFAULT_ESCALATION_TIMEOUT
          startEscalationTimer(contact._id.toString(), brokerageId, routingResult.agentId!, timeout)
        })
        .catch(() => { })
    }
  }

  // Increment lead source counter asynchronously
  if (leadSourceId) {
    LeadSource.updateOne({ _id: new mongoose.Types.ObjectId(leadSourceId) }, { $inc: { leadCount: 1 } })
      .catch((err) => logger.warn('[LeadSource] Increment counter failed:', err))
  }

  // Decoupled audit logging
  logAuditEvent({
    action: 'LEAD_INGESTED',
    resource: 'leads',
    resourceId: contact._id.toString(),
    brokerageId,
    details: {
      isNew,
      sourceType: parsed.sourceType,
      leadScore,
      routedTo: routingResult.agentId,
      routingRule: routingResult.ruleName,
    },
    status: 'success',
    ipAddress: clientIp,
  }).catch((err) => logger.warn('[AuditLog] Ingestion log failed:', err))

  // Decoupled WebSocket and Push Notification
  try {
    const formatted = formatContactDto(contact)
    emitNewLead(formatted, brokerageId.toString(), contact.assignedAgentId?.toString())
    pushNotification({
      userId: contact.assignedAgentId?.toString(),
      brokerageId: brokerageId.toString(),
      type: 'new_lead',
      title: '🔥 New Lead Ingested',
      message: `${contact.firstName} ${contact.lastName} was ingested from ${parsed.sourceType} (Score: ${leadScore})`,
      linkTo: `/contacts/${contact._id}`,
      metadata: { contactId: contact._id.toString(), leadScore, sourceType: parsed.sourceType },
    }).catch((err) => logger.warn('[Notification] Push failed:', err))
  } catch (err) {
    logger.warn('Failed to emit lead ingestion notification:', err)
  }

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestLead] ${elapsed.toFixed(3)}ms (contactId: ${contact._id}, isNew: ${isNew})`)
  return { contact: formatContactDto(contact), isNew, routingResult }
}

// ═══════════════════════════════════════════
//  WEBHOOK INGESTION (with HMAC auth)
// ═══════════════════════════════════════════

export const ingestWebhookLead = async (
  rawPayload: LeadIngestPayload,
  rawBody: string,
  signature: string | undefined,
  leadSourceId: string,
  clientIp: string = '127.0.0.1',
  apiKey?: string
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(leadSourceId)) {
    throw new AppError('Invalid lead source', HTTP_STATUS.BAD_REQUEST)
  }

  const sourceObjectId = new mongoose.Types.ObjectId(leadSourceId)
  const source = await LeadSource.findById(sourceObjectId).select('+webhookSecret').lean()
  if (!source || !source.isActive) {
    throw new AppError('Lead source not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  if (!apiKey && !signature) {
    throw new AppError('Missing webhook signature or API key', HTTP_STATUS.UNAUTHORIZED)
  }

  const decryptedSecret = decrypt(source.webhookSecret)

  if (apiKey) {
    if (!verifyApiKey(apiKey, decryptedSecret)) {
      throw new AppError('Invalid API key', HTTP_STATUS.UNAUTHORIZED)
    }
  } else if (signature) {
    if (!verifyWebhookSignature(rawBody, signature, decryptedSecret)) {
      throw new AppError('Invalid webhook signature', HTTP_STATUS.UNAUTHORIZED)
    }
  }

  const result = await ingestLead(rawPayload, source.brokerageId, source._id, source.type, clientIp)
  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestWebhookLead] ${elapsed.toFixed(3)}ms`)
  return result
}

// ═══════════════════════════════════════════
//  CAPTURE WIDGET (Public, with L1 Caching)
// ═══════════════════════════════════════════

export const ingestCaptureWidgetLead = async (
  payload: LeadCapturePayload,
  clientIp: string = '127.0.0.1'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  const t0 = process.hrtime.bigint()
  const cacheKey = `capture:${payload.captureKey}`
  let sourceInfo = captureKeyL1Cache.get(cacheKey)

  if (!sourceInfo) {
    const source = await LeadSource.findOne({ captureKey: payload.captureKey, isActive: true })
      .select('_id brokerageId type')
      .lean()

    if (!source) {
      throw new AppError('Invalid or inactive capture key', HTTP_STATUS.NOT_FOUND)
    }

    sourceInfo = {
      id: source._id.toString(),
      brokerageId: source.brokerageId.toString(),
      type: source.type,
    }
    captureKeyL1Cache.set(cacheKey, sourceInfo)
  }

  const ingestPayload: LeadIngestPayload = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    message: payload.message,
    propertyAddress: payload.propertyAddress,
    propertyPrice: payload.propertyPrice,
    zipCode: payload.zipCode,
    source: 'website',
  }

  const result = await ingestLead(
    ingestPayload,
    new mongoose.Types.ObjectId(sourceInfo.brokerageId),
    new mongoose.Types.ObjectId(sourceInfo.id),
    'website',
    clientIp
  )

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestCaptureWidgetLead] ${elapsed.toFixed(3)}ms`)
  return result
}

// ═══════════════════════════════════════════
//  MANUAL LEAD ENTRY (Authenticated)
// ═══════════════════════════════════════════

export const ingestManualLead = async (
  input: ManualLeadEntryInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  _userAgent: string = 'browser'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  const t0 = process.hrtime.bigint()
  const payload: LeadIngestPayload = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    message: input.message,
    propertyAddress: input.propertyAddress,
    propertyPrice: input.propertyPrice,
    zipCode: input.zipCode,
    source: input.leadSource || 'manual',
  }

  const result = await ingestLead(
    payload,
    new mongoose.Types.ObjectId(caller.brokerageId),
    undefined,
    input.leadSource || 'manual',
    clientIp
  )

  // Explicit agent override if requested in manual entry
  if (input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)) {
    const updatedContact = await Contact.findByIdAndUpdate(
      new mongoose.Types.ObjectId(result.contact.id),
      {
        $set: {
          assignedAgentId: new mongoose.Types.ObjectId(input.assignedAgentId),
          assignedAt: new Date(),
        },
        ...(input.tags && input.tags.length > 0 ? { $addToSet: { tags: { $each: input.tags } } } : {}),
      },
      { new: true }
    ).lean()

    if (updatedContact) {
      result.contact = formatContactDto(updatedContact)
    }
  }

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestManualLead] ${elapsed.toFixed(3)}ms`)
  return result
}

// ═══════════════════════════════════════════
//  LEAD ACKNOWLEDGMENT
// ═══════════════════════════════════════════

export const acknowledgeLeads = async (
  contactIds: string[],
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<{ acknowledgedCount: number }> => {
  const t0 = process.hrtime.bigint()
  const validIds = contactIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const filter: Record<string, any> = {
    _id: { $in: validIds },
    brokerageId: new mongoose.Types.ObjectId(caller.brokerageId),
    isDeleted: false,
    isAcknowledged: false,
  }

  if (caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = new mongoose.Types.ObjectId(caller._id)
  }

  const result = await Contact.updateMany(filter, {
    $set: { isAcknowledged: true },
  })

  // Cancel escalation timers for acknowledged leads
  for (const id of validIds) {
    cancelEscalation(id.toString())
  }

  // Decoupled background audit logging
  logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: caller.brokerageId,
    action: 'LEAD_ACKNOWLEDGE',
    resource: 'leads',
    details: { acknowledgedCount: result.modifiedCount, contactIds },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch((err) => logger.error('[AuditLog] Error logging LEAD_ACKNOWLEDGE:', err))

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:acknowledgeLeads] ${elapsed.toFixed(3)}ms (count: ${result.modifiedCount})`)
  return { acknowledgedCount: result.modifiedCount }
}

// ═══════════════════════════════════════════
//  GOOGLE ADS LEAD FORM WEBHOOK INGESTION
// ═══════════════════════════════════════════

export const ingestGoogleAdsLead = async (
  payload: GoogleAdsWebhookPayload,
  leadSourceId: string,
  clientIp: string = '127.0.0.1'
): Promise<{ contact?: ContactResponseDto; isNew?: boolean; isTest?: boolean; message: string }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(leadSourceId)) {
    throw new AppError('Invalid lead source', HTTP_STATUS.BAD_REQUEST)
  }

  const sourceObjectId = new mongoose.Types.ObjectId(leadSourceId)
  const source = await LeadSource.findById(sourceObjectId).select('+webhookSecret').lean()
  if (!source || !source.isActive) {
    throw new AppError('Lead source not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  // Body-based Google Key verification (ADR-001)
  if (!payload.google_key) {
    throw new AppError('Invalid google_key', HTTP_STATUS.UNAUTHORIZED)
  }

  const decryptedSecret = decrypt(source.webhookSecret)
  const isKeyMatch =
    payload.google_key === decryptedSecret ||
    payload.google_key === decryptedSecret.substring(0, 50) ||
    decryptedSecret.startsWith(payload.google_key)
  if (!isKeyMatch) {
    throw new AppError('Invalid google_key', HTTP_STATUS.UNAUTHORIZED)
  }

  // Handle Google Ads "Send Test Data" button
  if (payload.is_test) {
    return {
      isTest: true,
      message: 'Test lead received successfully',
    }
  }

  // Map Google Ads column data to universal lead payload
  const normalized = mapGoogleAdsPayload(payload)
  const result = await ingestLead(normalized, source.brokerageId, source._id, 'google_ads', clientIp)

  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestGoogleAdsLead] ${elapsed.toFixed(3)}ms`)
  return {
    contact: result.contact,
    isNew: result.isNew,
    message: result.isNew ? 'Google Ads lead ingested successfully' : 'Google Ads lead reinquiry recorded',
  }
}

// ═══════════════════════════════════════════
//  META LEAD ADS WEBHOOK (Verification & Ingestion)
// ═══════════════════════════════════════════

export const verifyMetaWebhookChallenge = (
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  expectedToken?: string
): string => {
  const verifyToken = expectedToken || process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || 'secure_crm_token_pk_2026'
  console.log(`[META VERIFY] expected: ${verifyToken}, received: ${token}, mode: ${mode}, challenge: ${challenge}`)
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return challenge
  }
  throw new AppError(`Invalid verification token. Make sure it exactly matches your Render environment variable.`, HTTP_STATUS.FORBIDDEN)
}

export const ingestMetaAdsLead = async (
  leadgenId: string,
  leadSourceId: string,
  clientIp: string = '127.0.0.1',
  metaEventContext?: any
): Promise<{ contact?: ContactResponseDto; isNew?: boolean; isTest?: boolean; message: string }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(leadSourceId)) {
    throw new AppError('Invalid lead source', HTTP_STATUS.BAD_REQUEST)
  }

  const sourceObjectId = new mongoose.Types.ObjectId(leadSourceId)
  const source = await LeadSource.findById(sourceObjectId).lean()
  if (!source || !source.isActive) {
    throw new AppError('Lead source not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  // Graph API fetching
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN
  if (!accessToken) {
    // If no token, we can't fetch. Just log a warning and return an unpopulated lead (or throw).
    // It's better to throw so the controller logs it and we know the config is missing.
    throw new AppError('Meta Access Token is missing in environment variables (META_ACCESS_TOKEN or META_WHATSAPP_TOKEN).', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  const url = `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${accessToken}`
  let data: any
  try {
    const response = await fetch(url)
    data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || 'Unknown Graph API error')
    }
  } catch (err: any) {
    throw new AppError(`Failed to fetch Meta lead: ${err.message}`, HTTP_STATUS.BAD_REQUEST)
  }

  let name = 'Meta Lead'
  let email = ''
  let phone = ''
  let city = ''
  let message = ''

  if (data.field_data && Array.isArray(data.field_data)) {
    data.field_data.forEach((field: any) => {
      const val = field.values && field.values[0] ? field.values[0] : ''
      switch (field.name) {
        case 'full_name':
        case 'first_name':
        case 'last_name':
          if (field.name === 'full_name' && val) name = val
          else if (field.name === 'first_name' && val) name = val + ' ' + name.replace('Meta Lead', '').trim()
          else if (field.name === 'last_name' && val) name = name.replace('Meta Lead', '').trim() + ' ' + val
          break
        case 'email':
          email = val
          break
        case 'phone_number':
        case 'phone':
          phone = val
          break
        case 'city':
          city = val
          break
        default:
          if (val) message += `${field.name}: ${val}\n`
          break
      }
    })
  }

  const normalizedPayload: LeadIngestPayload = {
    name: name.trim() || 'Meta Lead',
    email,
    phone,
    city,
    message: message.trim(),
    source: 'meta_ads',
    metaEvent: { leadgenId, ...metaEventContext, graphData: data },
  }

  // Is this a test lead? 
  // Meta Lead testing tool often returns is_organic = false or leadgen_id contains "test" (though typically it's just a numeric ID).
  // If we really need to skip it, we can, but let's ingest it normally.
  const result = await ingestLead(
    normalizedPayload,
    source.brokerageId as mongoose.Types.ObjectId,
    sourceObjectId,
    'meta_ads',
    clientIp
  )
  const elapsed = measureExecutionMs(t0)
  logger.info(`[MetaAdsService] Ingestion took ${elapsed.toFixed(3)}ms for leadgen_id ${leadgenId}`)

  return {
    contact: result.contact,
    isNew: result.isNew,
    message: result.isNew ? 'Meta Ads lead ingested successfully' : 'Meta Ads lead reinquiry recorded',
  }
}

// ═══════════════════════════════════════════
//  PORTAL EMAIL PARSER INGESTION (Zameen, Graana, OLX)
// ═══════════════════════════════════════════

export const ingestEmailParserLead = async (
  provider: string,
  payload: EmailParserPayload,
  leadSourceId: string,
  clientIp: string = '127.0.0.1',
  apiKey?: string,
  signature?: string,
  rawBody?: string
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  const t0 = process.hrtime.bigint()
  if (!mongoose.Types.ObjectId.isValid(leadSourceId)) {
    throw new AppError('Invalid lead source', HTTP_STATUS.BAD_REQUEST)
  }

  const sourceObjectId = new mongoose.Types.ObjectId(leadSourceId)
  const source = await LeadSource.findById(sourceObjectId).select('+webhookSecret').lean()
  if (!source || !source.isActive) {
    throw new AppError('Lead source not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  const decryptedSecret = decrypt(source.webhookSecret)

  if (apiKey) {
    if (!verifyApiKey(apiKey, decryptedSecret)) {
      throw new AppError('Invalid API key', HTTP_STATUS.UNAUTHORIZED)
    }
  } else if (signature && rawBody) {
    if (!verifyWebhookSignature(rawBody, signature, decryptedSecret)) {
      throw new AppError('Invalid webhook signature', HTTP_STATUS.UNAUTHORIZED)
    }
  }

  let normalized: LeadIngestPayload
  const lowerProvider = provider.toLowerCase()

  switch (lowerProvider) {
    case 'zameen':
      normalized = parseZameenEmailContent(payload)
      break
    case 'graana':
      normalized = parseGraanaEmailContent(payload)
      break
    case 'olx':
      normalized = parseOlxEmailContent(payload)
      break
    default:
      normalized = {
        name: payload.sender || 'Portal Inquirer',
        email: payload.sender && payload.sender.includes('@') ? payload.sender : '',
        message: payload.body || payload.html || '',
        source: lowerProvider,
      }
      break
  }

  const result = await ingestLead(normalized, source.brokerageId, source._id, lowerProvider, clientIp)
  const elapsed = measureExecutionMs(t0)
  console.log(`[LEADS-PERF][service:ingestEmailParserLead] ${elapsed.toFixed(3)}ms (provider: ${lowerProvider})`)
  return result
}

