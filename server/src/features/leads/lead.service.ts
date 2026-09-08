import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { LeadSource, ILeadSource } from '../../models/LeadSource.js'
import { RoutingRule, IRoutingRule } from '../../models/RoutingRule.js'
import { ScoringConfig, IScoringConfig } from '../../models/ScoringConfig.js'
import { Contact, IContact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { User, IUser } from '../../models/User.js'
import { encrypt, decrypt, generateSecureToken } from '../../utils/cryptoHelper.js'
import { cacheGet, cacheSet } from '../../config/redis.js'
import { getPagination } from '../../utils/pagination.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES, DEFAULT_ESCALATION_TIMEOUT } from '../../utils/constants.js'
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
} from './lead.types.js'
import { formatContactDto, provisionLeadPortalUser } from '../contacts/contact.service.js'
import { ContactResponseDto } from '../contacts/contact.types.js'
import { emitNewLead } from '../../config/socket.js'
import { pushNotification } from '../notifications/notification.service.js'

// ═══════════════════════════════════════════
//  In-process escalation timer store (demo)
//  TODO: Replace with Bull/Redis queue in production
// ═══════════════════════════════════════════
const pendingEscalations = new Map<string, ReturnType<typeof setTimeout>>()

// ═══════════════════════════════════════════
//  LEAD SOURCE CRUD
// ═══════════════════════════════════════════

const formatLeadSourceDto = (source: ILeadSource, includeSecret: boolean = false): LeadSourceResponseDto => {
  const dto: LeadSourceResponseDto = {
    id: source._id.toString(),
    name: source.name,
    type: source.type,
    captureKey: source.captureKey,
    isActive: source.isActive,
    leadCount: source.leadCount,
    config: {
      fieldMapping: source.config?.fieldMapping instanceof Map
        ? Object.fromEntries(source.config.fieldMapping)
        : source.config?.fieldMapping || {},
    },
    brokerageId: source.brokerageId.toString(),
    createdBy: source.createdBy.toString(),
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
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
  const rawSecret = generateSecureToken(32)
  const encryptedSecret = encrypt(rawSecret)
  const captureKey = uuidv4()

  const source = await LeadSource.create({
    ...input,
    webhookSecret: encryptedSecret,
    captureKey,
    brokerageId: caller.brokerageId,
    createdBy: caller._id,
  })

  await logAuditEvent({
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
  })

  // Return with decrypted secret on creation so user can configure their webhook
  const dto = formatLeadSourceDto(source)
  dto.webhookSecret = rawSecret
  return dto
}

export const listLeadSources = async (
  query: ListLeadSourcesQuery,
  _caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ leadSources: LeadSourceResponseDto[]; total: number }> => {
  const filter: Record<string, any> = { ...tenantFilter }

  if (query.type && query.type !== 'all' && query.type !== 'undefined') filter.type = query.type
  if (query.isActive === 'true') filter.isActive = true
  else if (query.isActive === 'false') filter.isActive = false

  if (query.search && query.search.trim() && query.search !== 'undefined') {
    const escaped = escapeRegExp(query.search.trim())
    filter.name = { $regex: escaped, $options: 'i' }
  }

  const { limit, skip } = getPagination(query)
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'createdAt'

  const [sources, total] = await Promise.all([
    LeadSource.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit),
    LeadSource.countDocuments(filter),
  ])

  return { leadSources: sources.map((s) => formatLeadSourceDto(s)), total }
}

export const getLeadSourceById = async (
  id: string,
  caller: IUser,
  includeSecret: boolean = false
): Promise<LeadSourceResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const selectFields = includeSecret ? '+webhookSecret' : ''
  const source = await LeadSource.findById(id).select(selectFields)
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && source.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  return formatLeadSourceDto(source, includeSecret)
}

export const updateLeadSource = async (
  id: string,
  input: UpdateLeadSourceInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<LeadSourceResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const source = await LeadSource.findById(id)
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && source.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  Object.assign(source, input)
  await source.save()

  await logAuditEvent({
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
  })

  return formatLeadSourceDto(source)
}

export const deleteLeadSource = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const source = await LeadSource.findById(id)
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && source.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  await LeadSource.deleteOne({ _id: id })

  await logAuditEvent({
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
  })
}

export const rotateWebhookSecret = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<{ webhookSecret: string }> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const source = await LeadSource.findById(id).select('+webhookSecret')
  if (!source) throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && source.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Lead source not found', HTTP_STATUS.NOT_FOUND)
  }

  const newRawSecret = generateSecureToken(32)
  source.webhookSecret = encrypt(newRawSecret)
  await source.save()

  await logAuditEvent({
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
  })

  return { webhookSecret: newRawSecret }
}

// ═══════════════════════════════════════════
//  ROUTING RULE CRUD
// ═══════════════════════════════════════════

const formatRoutingRuleDto = (rule: IRoutingRule): RoutingRuleResponseDto => ({
  id: rule._id.toString(),
  name: rule.name,
  type: rule.type,
  isActive: rule.isActive,
  priority: rule.priority,
  brokerageId: rule.brokerageId.toString(),
  createdBy: rule.createdBy.toString(),
  assignedAgentIds: (rule.assignedAgentIds || []).map((id) => id.toString()),
  lastAssignedIndex: rule.lastAssignedIndex,
  agentWeights: (rule.agentWeights || []).map((w) => ({
    agentId: w.agentId.toString(),
    percentage: w.percentage,
  })),
  zipCodeMappings: (rule.zipCodeMappings || []).map((m) => ({
    zipCodes: m.zipCodes,
    agentId: m.agentId.toString(),
  })),
  schedules: (rule.schedules || []).map((s) => ({
    agentId: s.agentId.toString(),
    timezone: s.timezone,
    windows: s.windows.map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startHour: w.startHour,
      endHour: w.endHour,
    })),
  })),
  escalationTimeoutSeconds: rule.escalationTimeoutSeconds,
  createdAt: rule.createdAt.toISOString(),
  updatedAt: rule.updatedAt.toISOString(),
})

// Validate that all agent IDs exist, are active, and belong to the same brokerage
const validateAgentIds = async (agentIds: string[], brokerageId: mongoose.Types.ObjectId): Promise<void> => {
  if (agentIds.length === 0) return

  const uniqueIds = [...new Set(agentIds)].filter((id) => mongoose.Types.ObjectId.isValid(id))
  const agents = await User.find({
    _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isActive: true,
    brokerageId,
  }).select('_id')

  const foundIds = new Set(agents.map((a) => a._id.toString()))
  const missing = uniqueIds.filter((id) => !foundIds.has(id))

  if (missing.length > 0) {
    throw new AppError(
      `The following agent IDs are invalid, inactive, or do not belong to this brokerage: ${missing.join(', ')}`,
      HTTP_STATUS.UNPROCESSABLE_ENTITY
    )
  }
}

// Extract all agent IDs from a routing rule input for validation
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
    brokerageId: caller.brokerageId,
    createdBy: caller._id,
  })

  await logAuditEvent({
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
  })

  return formatRoutingRuleDto(rule)
}

export const listRoutingRules = async (
  query: ListRoutingRulesQuery,
  _caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ routingRules: RoutingRuleResponseDto[]; total: number }> => {
  const filter: Record<string, any> = { ...tenantFilter }

  if (query.type && query.type !== 'all' && query.type !== 'undefined') filter.type = query.type
  if (query.isActive === 'true') filter.isActive = true
  else if (query.isActive === 'false') filter.isActive = false

  const { limit, skip } = getPagination(query)
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'priority'

  const [rules, total] = await Promise.all([
    RoutingRule.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit),
    RoutingRule.countDocuments(filter),
  ])

  return { routingRules: rules.map(formatRoutingRuleDto), total }
}

export const getRoutingRuleById = async (id: string, caller: IUser): Promise<RoutingRuleResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const rule = await RoutingRule.findById(id)
  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && rule.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  return formatRoutingRuleDto(rule)
}

export const updateRoutingRule = async (
  id: string,
  input: UpdateRoutingRuleInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<RoutingRuleResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const rule = await RoutingRule.findById(id)
  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && rule.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const agentIds = extractAgentIdsFromInput(input)
  await validateAgentIds(agentIds, rule.brokerageId)

  if (input.name !== undefined) rule.name = input.name
  if (input.isActive !== undefined) rule.isActive = input.isActive
  if (input.priority !== undefined) rule.priority = input.priority
  if (input.escalationTimeoutSeconds !== undefined) rule.escalationTimeoutSeconds = input.escalationTimeoutSeconds

  if (input.assignedAgentIds) {
    rule.assignedAgentIds = input.assignedAgentIds.map((id) => new mongoose.Types.ObjectId(id))
  }
  if (input.agentWeights) {
    rule.agentWeights = input.agentWeights.map((w) => ({
      agentId: new mongoose.Types.ObjectId(w.agentId),
      percentage: w.percentage,
    })) as any
  }
  if (input.zipCodeMappings) {
    rule.zipCodeMappings = input.zipCodeMappings.map((m) => ({
      zipCodes: m.zipCodes,
      agentId: new mongoose.Types.ObjectId(m.agentId),
    })) as any
  }
  if (input.schedules) {
    rule.schedules = input.schedules.map((s) => ({
      agentId: new mongoose.Types.ObjectId(s.agentId),
      timezone: s.timezone,
      windows: s.windows,
    })) as any
  }

  await rule.save()

  await logAuditEvent({
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
  })

  return formatRoutingRuleDto(rule)
}

export const deleteRoutingRule = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  const rule = await RoutingRule.findById(id)
  if (!rule) throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)

  if (caller.role !== USER_ROLES.SUPER_ADMIN && rule.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Routing rule not found', HTTP_STATUS.NOT_FOUND)
  }

  await RoutingRule.deleteOne({ _id: id })

  await logAuditEvent({
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
  })
}

// ═══════════════════════════════════════════
//  SCORING CONFIG
// ═══════════════════════════════════════════

const formatScoringConfigDto = (config: IScoringConfig): ScoringConfigResponseDto => ({
  id: config._id.toString(),
  brokerageId: config.brokerageId.toString(),
  sourceWeights: config.sourceWeights.map((w) => ({
    sourceType: w.sourceType,
    points: w.points,
  })),
  keywordWeights: config.keywordWeights.map((w) => ({
    keyword: w.keyword,
    points: w.points,
  })),
  priceTierWeights: config.priceTierWeights.map((w) => ({
    minPrice: w.minPrice,
    maxPrice: w.maxPrice,
    points: w.points,
  })),
  financingBonus: config.financingBonus,
  messageLengthBonus: {
    minLength: config.messageLengthBonus.minLength,
    points: config.messageLengthBonus.points,
  },
  baseScore: config.baseScore,
  createdAt: config.createdAt.toISOString(),
  updatedAt: config.updatedAt.toISOString(),
})

export const getOrCreateScoringConfig = async (
  brokerageId: mongoose.Types.ObjectId
): Promise<IScoringConfig> => {
  let config = await ScoringConfig.findOne({ brokerageId })
  if (!config) {
    config = await ScoringConfig.create({ brokerageId })
  }
  return config
}

export const getScoringConfig = async (caller: IUser): Promise<ScoringConfigResponseDto> => {
  const config = await getOrCreateScoringConfig(caller.brokerageId)
  return formatScoringConfigDto(config)
}

export const updateScoringConfig = async (
  input: UpdateScoringConfigInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ScoringConfigResponseDto> => {
  const config = await getOrCreateScoringConfig(caller.brokerageId)

  if (input.sourceWeights !== undefined) config.sourceWeights = input.sourceWeights as any
  if (input.keywordWeights !== undefined) config.keywordWeights = input.keywordWeights as any
  if (input.priceTierWeights !== undefined) config.priceTierWeights = input.priceTierWeights as any
  if (input.financingBonus !== undefined) config.financingBonus = input.financingBonus
  if (input.messageLengthBonus !== undefined) config.messageLengthBonus = input.messageLengthBonus as any
  if (input.baseScore !== undefined) config.baseScore = input.baseScore

  await config.save()

  await logAuditEvent({
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
  })

  return formatScoringConfigDto(config)
}

// ═══════════════════════════════════════════
//  UNIVERSAL LEAD PARSER
// ═══════════════════════════════════════════

const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export const parseUniversalPayload = (raw: LeadIngestPayload): ParsedLead => {
  let firstName = (raw.firstName || '').trim()
  let lastName = (raw.lastName || '').trim()

  // Fallback: try splitting full name
  if (!firstName && !lastName && raw.name) {
    const split = splitFullName(raw.name)
    firstName = split.firstName
    lastName = split.lastName
  }

  // Best-effort field extraction from unknown payloads
  if (!firstName) {
    firstName = ((raw as any).first_name || (raw as any).fname || (raw as any).given_name || 'Unknown').toString().trim()
  }
  if (!lastName) {
    lastName = ((raw as any).last_name || (raw as any).lname || (raw as any).family_name || '').toString().trim()
  }

  const email = (
    raw.email ||
    (raw as any).email_address ||
    (raw as any).emailAddress ||
    ''
  ).toString().trim().toLowerCase()

  const phone = (
    raw.phone ||
    (raw as any).phone_number ||
    (raw as any).phoneNumber ||
    (raw as any).mobile ||
    ''
  ).toString().trim()

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

  const sourceType = (
    raw.source ||
    (raw as any).lead_source ||
    (raw as any).leadSource ||
    (raw as any).utm_source ||
    'webhook'
  ).toString().trim().toLowerCase()

  return { firstName, lastName, email, phone, message, propertyAddress, propertyPrice, zipCode, sourceType }
}

// ═══════════════════════════════════════════
//  LEAD SCORING ENGINE
// ═══════════════════════════════════════════

export const calculateLeadScore = async (
  parsed: ParsedLead,
  brokerageId: mongoose.Types.ObjectId
): Promise<number> => {
  const config = await getOrCreateScoringConfig(brokerageId)
  let score = config.baseScore

  // 1. Source weight
  const sourceWeight = config.sourceWeights.find(
    (w) => w.sourceType.toLowerCase() === parsed.sourceType.toLowerCase()
  )
  if (sourceWeight) score += sourceWeight.points

  // 2. Keyword weights (check message for keywords)
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
      (t) => parsed.propertyPrice >= t.minPrice && parsed.propertyPrice < t.maxPrice
    )
    if (tier) score += tier.points
  }

  // 4. Financing bonus — check message for financing-related keywords
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

  // Clamp score to 0-100
  return Math.max(0, Math.min(100, Math.round(score)))
}

// ═══════════════════════════════════════════
//  ROUTING ENGINE
// ═══════════════════════════════════════════

const executeRoundRobin = async (rule: IRoutingRule): Promise<string | null> => {
  const agents = rule.assignedAgentIds
  if (!agents || agents.length === 0) return null

  // Try Redis first for fast read
  const redisKey = `rr:${rule._id.toString()}`
  let currentIndex = -1

  const cachedIndex = await cacheGet(redisKey)
  if (cachedIndex !== null) {
    currentIndex = parseInt(cachedIndex, 10)
  } else {
    currentIndex = rule.lastAssignedIndex
  }

  const nextIndex = (currentIndex + 1) % agents.length
  const selectedAgent = agents[nextIndex]

  // Write to both Redis and MongoDB
  await cacheSet(redisKey, nextIndex.toString(), 86400) // 24h TTL
  await RoutingRule.updateOne({ _id: rule._id }, { lastAssignedIndex: nextIndex })

  return selectedAgent.toString()
}

const executeWeighted = (rule: IRoutingRule): string | null => {
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

  // Fallback to last agent (handles floating point edge case)
  return weights[weights.length - 1].agentId.toString()
}

const executeZipCode = (rule: IRoutingRule, leadZipCode: string): string | null => {
  if (!leadZipCode || !rule.zipCodeMappings || rule.zipCodeMappings.length === 0) return null

  for (const mapping of rule.zipCodeMappings) {
    if (mapping.zipCodes.includes(leadZipCode)) {
      return mapping.agentId.toString()
    }
  }

  return null // No zip match — rule doesn't apply
}

const executeTimeOfDay = (rule: IRoutingRule): string | null => {
  if (!rule.schedules || rule.schedules.length === 0) return null

  for (const schedule of rule.schedules) {
    try {
      // Get current time in agent's timezone
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
      // Invalid timezone — skip this schedule
      continue
    }
  }

  return null // No schedule match — rule doesn't apply
}

export const executeRoutingEngine = async (
  brokerageId: mongoose.Types.ObjectId,
  leadZipCode: string = ''
): Promise<RoutingResult> => {
  // Fetch all active rules sorted by priority (ascending = lower number first)
  const rules = await RoutingRule.find({
    brokerageId,
    isActive: true,
  }).sort({ priority: 1 })

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
      return {
        agentId,
        ruleId: rule._id.toString(),
        ruleName: rule.name,
        ruleType: rule.type,
        matched: true,
      }
    }
    // Rule didn't match → fall through to next priority
  }

  // No rule matched
  return { agentId: null, ruleId: null, ruleName: null, ruleType: null, matched: false }
}

// ═══════════════════════════════════════════
//  ESCALATION TIMER (in-process demo)
// ═══════════════════════════════════════════

const startEscalationTimer = (
  contactId: string,
  brokerageId: mongoose.Types.ObjectId,
  currentAgentId: string,
  timeoutSeconds: number = DEFAULT_ESCALATION_TIMEOUT
): void => {
  // Cancel any existing timer for this contact
  cancelEscalation(contactId)

  const timer = setTimeout(async () => {
    try {
      pendingEscalations.delete(contactId)

      // Check if the lead was acknowledged
      const contact = await Contact.findById(contactId)
      if (!contact || contact.isAcknowledged || contact.isDeleted) return

      logger.info(`Escalation triggered for contact ${contactId} — agent ${currentAgentId} did not acknowledge within ${timeoutSeconds}s`)

      // Re-run routing engine excluding the current agent
      const result = await executeRoutingEngine(brokerageId, contact.zipCode || '')

      if (result.matched && result.agentId && result.agentId !== currentAgentId) {
        contact.assignedAgentId = new mongoose.Types.ObjectId(result.agentId)
        contact.assignedAt = new Date()
        contact.isAcknowledged = false
        await contact.save()

        await Activity.create({
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
        })

        logger.info(`Lead ${contactId} re-routed to agent ${result.agentId} via ${result.ruleName}`)
      } else {
        logger.warn(`Escalation for contact ${contactId}: no alternative agent available`)
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
//  WEBHOOK HMAC VERIFICATION
// ═══════════════════════════════════════════

export const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

// ═══════════════════════════════════════════
//  LEAD INGESTION PIPELINE
// ═══════════════════════════════════════════

// Check for existing contact and handle deduplication
const findExistingContact = async (
  brokerageId: mongoose.Types.ObjectId,
  email: string,
  phone: string
): Promise<IContact | null> => {
  if (!email && !phone) return null

  const orConditions: Record<string, any>[] = []
  if (email) orConditions.push({ email: email.toLowerCase() })
  if (phone) orConditions.push({ phone })

  return Contact.findOne({
    brokerageId,
    isDeleted: false,
    $or: orConditions,
  })
}

export const ingestLead = async (
  rawPayload: LeadIngestPayload,
  brokerageId: mongoose.Types.ObjectId,
  leadSourceId?: mongoose.Types.ObjectId,
  sourceType?: string,
  clientIp: string = '127.0.0.1'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  // 1. Parse the universal payload
  const parsed = parseUniversalPayload(rawPayload)
  if (sourceType) parsed.sourceType = sourceType

  // 2. Calculate lead score
  const leadScore = await calculateLeadScore(parsed, brokerageId)

  // 3. Check for existing contact (dedup)
  const existingContact = await findExistingContact(brokerageId, parsed.email, parsed.phone)

  let contact: IContact
  let isNew = false

  if (existingContact) {
    // Update existing contact with reinquiry data
    existingContact.leadSource = parsed.sourceType || existingContact.leadSource
    existingContact.leadScore = Math.max(existingContact.leadScore, leadScore)
    existingContact.inquiryCount = (existingContact.inquiryCount || 1) + 1
    if (leadSourceId) existingContact.leadSourceId = leadSourceId
    if (parsed.propertyAddress && !existingContact.address) existingContact.address = parsed.propertyAddress
    if (parsed.zipCode && !existingContact.zipCode) existingContact.zipCode = parsed.zipCode
    existingContact.originalPayload = rawPayload as any
    existingContact.lastContactedAt = new Date()
    await existingContact.save()

    contact = existingContact

    // Log reinquiry activity
    await Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'lead_reinquiry',
      description: `Lead reinquiry #${contact.inquiryCount} from ${parsed.sourceType}${parsed.message ? ': ' + parsed.message.substring(0, 200) : ''}`,
      metadata: new Map([
        ['sourceType', parsed.sourceType],
        ['inquiryCount', contact.inquiryCount.toString()],
        ['leadScore', leadScore.toString()],
      ]),
    })
  } else {
    // Create new contact
    contact = await Contact.create({
      firstName: parsed.firstName || 'Unknown',
      lastName: parsed.lastName || '',
      email: parsed.email || '',
      phone: parsed.phone || '',
      address: parsed.propertyAddress || '',
      zipCode: parsed.zipCode || '',
      leadSource: parsed.sourceType || 'webhook',
      leadScore,
      status: 'active',
      brokerageId,
      leadSourceId,
      originalPayload: rawPayload,
      isAcknowledged: false,
      inquiryCount: 1,
      propertyInterests: parsed.propertyAddress ? [parsed.propertyAddress] : [],
      notes: parsed.message || '',
    })
    isNew = true

    await Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'system',
      description: `New lead ingested from ${parsed.sourceType} (score: ${leadScore})`,
      metadata: new Map([
        ['sourceType', parsed.sourceType],
        ['leadScore', leadScore.toString()],
        ['isNew', 'true'],
      ]),
    })

    // Auto-provision VIP Lead Portal account
    try {
      await provisionLeadPortalUser(contact, { firstName: 'PropPulse', lastName: 'System', brokerageId } as any)
    } catch {
      // Non-blocking
    }
  }

  // 4. Route lead to agent
  const routingResult = await executeRoutingEngine(brokerageId, parsed.zipCode)

  if (routingResult.matched && routingResult.agentId) {
    contact.assignedAgentId = new mongoose.Types.ObjectId(routingResult.agentId)
    contact.assignedAt = new Date()
    contact.isAcknowledged = false
    await contact.save()

    await Activity.create({
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
    })

    // 5. Start escalation timer if time-of-day routing
    if (routingResult.ruleType === 'time_of_day' && routingResult.ruleId) {
      const rule = await RoutingRule.findById(routingResult.ruleId)
      const timeout = rule?.escalationTimeoutSeconds || DEFAULT_ESCALATION_TIMEOUT
      startEscalationTimer(contact._id.toString(), brokerageId, routingResult.agentId, timeout)
    }
  }

  // 6. Increment lead source counter
  if (leadSourceId) {
    await LeadSource.updateOne({ _id: leadSourceId }, { $inc: { leadCount: 1 } })
  }

  await logAuditEvent({
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
  })

  // 8. Real-Time WebSocket & Push Notification Alert
  try {
    const formatted = formatContactDto(contact)
    emitNewLead(formatted, brokerageId.toString(), contact.assignedAgentId?.toString())
    await pushNotification({
      userId: contact.assignedAgentId?.toString(),
      brokerageId: brokerageId.toString(),
      type: 'new_lead',
      title: '🔥 New Lead Ingested',
      message: `${contact.firstName} ${contact.lastName} was ingested from ${parsed.sourceType} (Score: ${leadScore})`,
      linkTo: `/contacts/${contact._id}`,
      metadata: { contactId: contact._id.toString(), leadScore, sourceType: parsed.sourceType },
    })
  } catch (err) {
    logger.warn('Failed to emit lead ingestion notification:', err)
  }

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
  clientIp: string = '127.0.0.1'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  if (!mongoose.Types.ObjectId.isValid(leadSourceId)) {
    throw new AppError('Invalid lead source', HTTP_STATUS.BAD_REQUEST)
  }

  const source = await LeadSource.findById(leadSourceId).select('+webhookSecret')
  if (!source || !source.isActive) {
    throw new AppError('Lead source not found or inactive', HTTP_STATUS.NOT_FOUND)
  }

  // Verify HMAC signature
  if (!signature) {
    throw new AppError('Missing webhook signature', HTTP_STATUS.UNAUTHORIZED)
  }

  const decryptedSecret = decrypt(source.webhookSecret)
  if (!verifyWebhookSignature(rawBody, signature, decryptedSecret)) {
    throw new AppError('Invalid webhook signature', HTTP_STATUS.UNAUTHORIZED)
  }

  return ingestLead(rawPayload, source.brokerageId, source._id, source.type, clientIp)
}

// ═══════════════════════════════════════════
//  CAPTURE WIDGET (public, no auth)
// ═══════════════════════════════════════════

export const ingestCaptureWidgetLead = async (
  payload: LeadCapturePayload,
  clientIp: string = '127.0.0.1'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
  // Look up the LeadSource by captureKey
  const source = await LeadSource.findOne({ captureKey: payload.captureKey, isActive: true })
  if (!source) {
    throw new AppError('Invalid or inactive capture key', HTTP_STATUS.NOT_FOUND)
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

  return ingestLead(ingestPayload, source.brokerageId, source._id, 'website', clientIp)
}

// ═══════════════════════════════════════════
//  MANUAL LEAD ENTRY (authenticated)
// ═══════════════════════════════════════════

export const ingestManualLead = async (
  input: ManualLeadEntryInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  _userAgent: string = 'browser'
): Promise<{ contact: ContactResponseDto; isNew: boolean; routingResult: RoutingResult }> => {
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

  const result = await ingestLead(payload, caller.brokerageId, undefined, input.leadSource || 'manual', clientIp)

  // If manual entry has a specific assignedAgentId, override routing
  if (input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)) {
    const contact = await Contact.findById(result.contact.id)
    if (contact) {
      contact.assignedAgentId = new mongoose.Types.ObjectId(input.assignedAgentId)
      contact.assignedAt = new Date()
      if (input.tags && input.tags.length > 0) {
        contact.tags = [...new Set([...contact.tags, ...input.tags])]
      }
      await contact.save()
      result.contact = formatContactDto(contact)
    }
  }

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
  const validIds = contactIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const filter: Record<string, any> = {
    _id: { $in: validIds },
    brokerageId: caller.brokerageId,
    isDeleted: false,
    isAcknowledged: false,
  }

  // Agents can only acknowledge their own assigned leads
  if (caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  }

  const result = await Contact.updateMany(filter, {
    $set: { isAcknowledged: true },
  })

  // Cancel escalation timers for acknowledged leads
  for (const id of validIds) {
    cancelEscalation(id.toString())
  }

  await logAuditEvent({
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
  })

  return { acknowledgedCount: result.modifiedCount }
}
