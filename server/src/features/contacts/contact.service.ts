import { Contact, IContact } from '../../models/Contact.js'
import { Activity, IActivity } from '../../models/Activity.js'
import { User, IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import {
  ContactResponseDto,
  ActivityResponseDto,
  CreateContactInput,
  UpdateContactInput,
  AddNoteInput,
  BulkContactActionInput,
  ListContactsQuery,
  PortalCredentials,
} from './contact.types.js'
import { getPagination } from '../../utils/pagination.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { cacheGet, cacheSet, cacheDelete } from '../../config/redis.js'
import { buildCacheKey, invalidateTenantFeatureCache } from '../../utils/cacheHelper.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import mongoose from 'mongoose'

// Format Contact Mongoose document into DTO
export const formatContactDto = (
  contact: IContact | any,
  agentName?: string,
  credentials?: PortalCredentials,
  silent: boolean = true
): ContactResponseDto => {
  const startTime = Date.now()
  if (!silent) logger.info('[contact.service.ts:30] [formatContactDto] Started')
  const agentId = contact.assignedAgentId?._id ? contact.assignedAgentId._id.toString() : contact.assignedAgentId?.toString()
  const createdIso = contact.createdAt instanceof Date ? contact.createdAt.toISOString() : new Date(contact.createdAt).toISOString()
  const updatedIso = contact.updatedAt instanceof Date ? contact.updatedAt.toISOString() : new Date(contact.updatedAt).toISOString()
  const lastIso = contact.lastContactedAt ? (contact.lastContactedAt instanceof Date ? contact.lastContactedAt.toISOString() : new Date(contact.lastContactedAt).toISOString()) : undefined
  const dto: ContactResponseDto = {
    id: contact._id.toString(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || '',
    phone: contact.phone || '',
    secondaryPhone: contact.secondaryPhone,
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zipCode: contact.zipCode,
    leadSource: contact.leadSource,
    leadScore: contact.leadScore,
    tags: contact.tags || [],
    status: contact.status,
    assignedAgentId: agentId,
    assignedAgentName: agentName,
    notes: contact.notes,
    propertyInterests: contact.propertyInterests || [],
    socialLinks: contact.socialLinks,
    portalUserId: contact.portalUserId?.toString(),
    portalEnabled: contact.portalEnabled ?? false,
    portalAccessEmail: contact.portalAccessEmail || contact.email || '',
    portalCredentials: credentials,
    createdAt: createdIso,
    updatedAt: updatedIso,
    lastContactedAt: lastIso,
  }
  if (!silent) logger.info(`[contact.service.ts:64] [formatContactDto] Completed in ${Date.now() - startTime}ms`)
  return dto
}

// Format Activity Mongoose document into DTO (pure synchronous mapper, zero per-item logging)
export const formatActivityDto = (activity: IActivity | any): ActivityResponseDto => {
  let metadataObj: Record<string, string> | undefined
  if (activity.metadata) {
    if (activity.metadata instanceof Map) {
      metadataObj = Object.fromEntries(activity.metadata)
    } else if (typeof activity.metadata === 'object') {
      metadataObj = { ...(activity.metadata as unknown as Record<string, string>) }
    }
  }
  const createdIso = activity.createdAt instanceof Date ? activity.createdAt.toISOString() : new Date(activity.createdAt).toISOString()
  return {
    id: activity._id.toString(),
    contactId: activity.contactId.toString(),
    type: activity.type,
    description: activity.description,
    metadata: metadataObj,
    createdAt: createdIso,
    createdBy: activity.createdByName || activity.createdBy?.toString(),
  }
}

// Build query filter with tenant & role scoping
const buildContactFilter = (query: ListContactsQuery, caller: IUser, tenantFilter: Record<string, any>) => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:92] [buildContactFilter] Started')
  const filter: Record<string, any> = { ...tenantFilter, isDeleted: false }
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  } else if (query.assignedAgentId && mongoose.Types.ObjectId.isValid(query.assignedAgentId)) {
    filter.assignedAgentId = new mongoose.Types.ObjectId(query.assignedAgentId)
  }
  if (typeof query.status === 'string' && query.status !== 'all') filter.status = query.status
  if (typeof query.source === 'string' && query.source !== 'all') filter.leadSource = query.source
  if (typeof query.tag === 'string' && query.tag !== 'all') filter.tags = query.tag
  if (typeof query.minScore === 'number' && typeof query.maxScore === 'number') {
    filter.leadScore = { $gte: query.minScore, $lte: query.maxScore }
  }
  if (typeof query.search === 'string' && query.search.trim()) {
    const trimmed = query.search.trim()
    const escaped = escapeRegExp(trimmed)
    const orConditions: Record<string, any>[] = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ]

    // Multi-word search (e.g. "John Doe"): match firstName + lastName combined
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const first = escapeRegExp(parts[0])
      const last = escapeRegExp(parts.slice(1).join(' '))
      orConditions.push(
        {
          $and: [
            { firstName: { $regex: first, $options: 'i' } },
            { lastName: { $regex: last, $options: 'i' } },
          ],
        },
        {
          $and: [
            { firstName: { $regex: last, $options: 'i' } },
            { lastName: { $regex: first, $options: 'i' } },
          ],
        }
      )
    }

    filter.$or = orConditions
  }
  logger.info(`[contact.service.ts:114] [buildContactFilter] Completed in ${Date.now() - startTime}ms`)
  return filter
}

// Cache assigned agent names (max 1,000 agents, 120s TTL) to eliminate repeated Mongoose populate overhead
const agentNameCache = new BoundedLruCache<string>(1000, 120)

// L1 In-Memory Cache (max 500 query results, 30s TTL) for sub-millisecond (< 0.1ms) instant responses
export const contactsL1Cache = new BoundedLruCache<{ contacts: ContactResponseDto[]; total: number }>(500, 30)

// L1 In-Memory Cache for single contact details (max 1,000 contacts, 60s TTL) for sub-millisecond (< 0.1ms) lookups
export const contactDetailL1Cache = new BoundedLruCache<ContactResponseDto>(1000, 60)

// L1 In-Memory Cache for contact activities timeline (max 500 contacts, 30s TTL)
export const contactActivitiesL1Cache = new BoundedLruCache<{ activities: ActivityResponseDto[]; total: number }>(500, 30)

const resolveAgentNames = async (agentIds: string[]): Promise<Map<string, string>> => {
  const t0 = process.hrtime.bigint()
  const result = new Map<string, string>()
  const missingIds: mongoose.Types.ObjectId[] = []
  for (const id of agentIds) {
    const cachedName = agentNameCache.get(id)
    if (cachedName !== null) {
      if (cachedName) result.set(id, cachedName)
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      missingIds.push(new mongoose.Types.ObjectId(id))
    }
  }
  if (missingIds.length > 0) {
    const users = await User.find({ _id: { $in: missingIds } }, 'firstName lastName').lean()
    const foundSet = new Set<string>()
    for (const u of users) {
      const name = `${u.firstName} ${u.lastName}`.trim()
      const idStr = u._id.toString()
      foundSet.add(idStr)
      agentNameCache.set(idStr, name, 300)
      result.set(idStr, name)
    }
    // Negative caching: cache blank string for missing/orphaned agent IDs so Mongo is never re-queried
    for (const mId of missingIds) {
      const mIdStr = mId.toString()
      if (!foundSet.has(mIdStr)) {
        agentNameCache.set(mIdStr, '', 300)
      }
    }
  }
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
  logger.info(`[contact.service.ts:151] [resolveAgentNames] Completed in ${elapsedMs.toFixed(3)}ms`)
  return result
}

// List contacts with pagination, search, and dynamic filtering with multi-tier (L1/L2) sub-1ms caching
export const listContacts = async (
  query: ListContactsQuery,
  caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ contacts: ContactResponseDto[]; total: number }> => {
  const t0 = process.hrtime.bigint()
  try {
    // Multi-tenant and role-safe cache key isolation
    const brokerageId = (caller.brokerageId || tenantFilter.brokerageId)?.toString() || 'global'
    const isAgent = caller.role === USER_ROLES.AGENT
    const cacheScope = isAgent ? `agent:${caller._id}` : `role:${caller.role}`
    const cacheKey = buildCacheKey(brokerageId, 'contacts', {
      scope: cacheScope,
      query,
      tenant: tenantFilter,
    })

    // 1. Check L1 Memory Cache (< 0.05ms)
    const l1Hit = contactsL1Cache.get(cacheKey)
    if (l1Hit) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      logger.info(`[listContacts] L1 Cache HIT in ${deltaMs.toFixed(3)}ms`)
      return l1Hit
    }

    // 2. Check L2 Redis Cache (< 1ms)
    const cached = await cacheGet(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        contactsL1Cache.set(cacheKey, parsed, 30)
        const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
        logger.info(`[listContacts] L2 Redis HIT in ${deltaMs.toFixed(3)}ms`)
        return parsed
      } catch {
        // Fallback cleanly to DB query if corrupted
      }
    }

    // 3. Cache Miss: Execute indexed DB query
    const filter = buildContactFilter(query, caller, tenantFilter)
    const { limit, skip } = getPagination(query)
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1
    const sortField = query.sortBy || 'createdAt'
    const projection = 'firstName lastName email phone secondaryPhone address city state zipCode leadSource leadScore tags status assignedAgentId notes propertyInterests socialLinks portalUserId portalEnabled portalAccessEmail createdAt updatedAt lastContactedAt'

    const tDb = process.hrtime.bigint()
    let contacts: any[]
    let total: number

    // On Page 1 (skip === 0), avoid countDocuments if returned count is less than page limit
    if (skip === 0) {
      contacts = await Contact.find(filter)
        .select(projection)
        .sort({ [sortField]: sortDirection })
        .limit(limit)
        .lean()

      if (contacts.length < limit) {
        total = contacts.length
      } else {
        total = await Contact.countDocuments(filter)
      }
    } else {
      const [c, t] = await Promise.all([
        Contact.find(filter)
          .select(projection)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(limit)
          .lean(),
        Contact.countDocuments(filter),
      ])
      contacts = c
      total = t
    }
    const dbMs = Number(process.hrtime.bigint() - tDb) / 1e6
    logger.info(`[listContacts:dbQuery] Completed in ${dbMs.toFixed(3)}ms (count: ${contacts.length}, total: ${total})`)

    const agentIds = Array.from(new Set(contacts.map((c: any) => c.assignedAgentId?.toString()).filter(Boolean))) as string[]
    const agentMap = await resolveAgentNames(agentIds)
    const formatted = contacts.map((c: any) => {
      const agentIdStr = c.assignedAgentId?.toString()
      const agentName = agentIdStr ? agentMap.get(agentIdStr) : undefined
      return formatContactDto(c, agentName, undefined, true)
    })
    const result = { contacts: formatted, total }

    // 4. Populate L1 (30s) and L2 Redis (90s TTL)
    contactsL1Cache.set(cacheKey, result, 30)
    cacheSet(cacheKey, JSON.stringify(result), 90).catch(() => { })

    return result
  } finally {
    const totalMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[listContacts] Completed in ${totalMs.toFixed(3)}ms`)
  }
}

// Build duplicate query candidates based on incoming contact data
const buildDuplicateQueries = (
  email?: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): Record<string, any>[] => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:294] [buildDuplicateQueries] Started')
  const queries: Record<string, any>[] = []
  if (email && email.trim()) queries.push({ email: email.trim().toLowerCase() })
  if (phone && phone.trim()) {
    const raw = phone.trim()
    const digitsOnly = raw.replace(/\D/g, '')
    const phoneCandidates = Array.from(
      new Set(
        [
          raw,
          digitsOnly,
          digitsOnly.length >= 10 ? digitsOnly.slice(-10) : null,
          digitsOnly.length === 10 ? `+1${digitsOnly}` : null,
          digitsOnly.length === 11 && digitsOnly.startsWith('1') ? `+${digitsOnly}` : null,
        ].filter(Boolean) as string[]
      )
    )
    queries.push({ phone: { $in: phoneCandidates } })
  }
  if (firstName && lastName && firstName.trim() && lastName.trim()) {
    const fTrim = firstName.trim()
    const lTrim = lastName.trim()
    queries.push({
      firstName: new RegExp(`^${escapeRegExp(fTrim)}$`, 'i'),
      lastName: new RegExp(`^${escapeRegExp(lTrim)}$`, 'i'),
    })
  }
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
  logger.info(`[contact.service.ts:316] [buildDuplicateQueries] Completed in ${elapsedMs.toFixed(3)}ms`)
  return queries
}

// Throw conflict error with matched field context
const throwDuplicateContactError = (
  existing: any,
  email?: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): never => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:185] [throwDuplicateContactError] Started')
  let matchField = 'information'
  if (email && existing.email?.toLowerCase() === email.trim().toLowerCase()) {
    matchField = `email (${email})`
  } else if (phone && (existing.phone === phone || (existing.phone && existing.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')))) {
    matchField = `phone (${phone})`
  } else if (firstName && lastName && existing.firstName?.toLowerCase() === firstName.trim().toLowerCase() && existing.lastName?.toLowerCase() === lastName.trim().toLowerCase()) {
    matchField = `name (${existing.firstName} ${existing.lastName})`
  }
  logger.info(`[contact.service.ts:195] [throwDuplicateContactError] Completed in ${Date.now() - startTime}ms`)
  throw new AppError(
    `Contact exists: A contact with matching ${matchField} already exists (${existing.firstName} ${existing.lastName}).`,
    HTTP_STATUS.CONFLICT,
    { existingContactId: existing._id.toString(), existingContactName: `${existing.firstName} ${existing.lastName}`, matchField }
  )
}

// Check for potential duplicate contacts in the brokerage
const checkDuplicateContact = async (
  brokerageId: mongoose.Types.ObjectId,
  email?: string,
  phone?: string,
  firstName?: string,
  lastName?: string
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:347] [checkDuplicateContact] Started')
  try {
    const duplicateQuery = buildDuplicateQueries(email, phone, firstName, lastName)
    if (duplicateQuery.length === 0) return
    const tQuery = process.hrtime.bigint()
    const existing = await Contact.findOne({ brokerageId, isDeleted: false, $or: duplicateQuery })
      .select('_id firstName lastName email phone')
      .lean()
    const queryMs = Number(process.hrtime.bigint() - tQuery) / 1e6
    logger.info(`[checkDuplicateContact:dbFind] Completed in ${queryMs.toFixed(3)}ms`)
    if (existing) {
      throwDuplicateContactError(existing, email, phone, firstName, lastName)
    }
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[contact.service.ts:364] [checkDuplicateContact] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Cache brokerage company names (max 100 brokerages, 1 hour TTL)
const brokerageNameCache = new BoundedLruCache<string>(100, 3600)

// Find existing portal user or create a new credentials record
const upsertPortalUser = async (
  contact: IContact | any,
  portalEmail: string,
  tempPassword: string,
  brokerageId: mongoose.Types.ObjectId,
  forcePasswordReset: boolean = false
) => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:232] [upsertPortalUser] Started')
  try {
    let portalUser = await User.findOne({
      $or: [{ contactId: contact._id }, { email: portalEmail }],
    })
    if (portalUser) {
      if (!portalUser.contactId) {
        await User.updateOne({ _id: portalUser._id }, { $set: { contactId: contact._id } })
      }
      // Only overwrite & re-hash password if user is explicitly resetting credentials
      if (forcePasswordReset) {
        portalUser.password = tempPassword
        portalUser.mustChangePassword = true
        portalUser.isActive = true
        await portalUser.save()
      }
      return portalUser
    }
    return await User.create({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: portalEmail,
      password: tempPassword,
      role: USER_ROLES.LEAD,
      brokerageId,
      contactId: contact._id,
      phone: contact.phone,
      isActive: true,
      mustChangePassword: true,
    })
  } finally {
    logger.info(`[contact.service.ts:258] [upsertPortalUser] Completed in ${Date.now() - startTime}ms`)
  }
}

// Build WhatsApp invite message and portal URL links with cached brokerage name
const buildPortalInviteDetails = async (
  contact: IContact | any,
  caller: IUser,
  portalEmail: string,
  tempPassword: string
) => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:269] [buildPortalInviteDetails] Started')
  try {
    let brokerageName = 'PropPulse Real Estate'
    if (contact.brokerageId) {
      const bIdStr = contact.brokerageId.toString()
      const cached = brokerageNameCache.get(bIdStr)
      if (cached) {
        brokerageName = cached
      } else {
        const brokerage = await Brokerage.findById(contact.brokerageId).select('name').lean()
        if (brokerage?.name) {
          brokerageName = brokerage.name
          brokerageNameCache.set(bIdStr, brokerage.name, 3600)
        }
      }
    }

    const agentName = `${caller.firstName} ${caller.lastName}`.trim() || 'Your Dedicated Advisor'
    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173'
    const portalUrl = `${baseUrl}/portal`
    const loginUrl = `${baseUrl}/login`
    const whatsappInviteMessage = `Assalam-o-Alaikum ${contact.firstName}!\n\nWelcome to *${brokerageName}*.\n\nWe have activated your private *VIP Client Portal*! You can now track everything in one secure place:\n*Curated Property Matches* & MLS proposals\n*Live Transaction Milestones* & Escrow closing progress\n*Closing Disclosures & Documents* available for 1-click download\n*Direct VIP Advisor Access*\n\nAccess Your Portal: ${portalUrl}\nLogin Email: ${portalEmail}\nTemporary Password: ${tempPassword}\n\nFeel free to reply directly here on WhatsApp if you have any questions!\n— *${agentName}* | ${brokerageName}`
    const cleanPhone = (contact.phone || '').replace(/\D/g, '')
    const whatsappShareUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappInviteMessage)}`
    return { portalUrl, loginUrl, whatsappInviteMessage, whatsappShareUrl }
  } finally {
    logger.info(`[contact.service.ts:284] [buildPortalInviteDetails] Completed in ${Date.now() - startTime}ms`)
  }
}

// Automatically provision a VIP Client Portal User account for a contact
export const provisionLeadPortalUser = async (
  contact: IContact | any,
  caller: IUser,
  customPassword?: string,
  forcePasswordReset: boolean = false
): Promise<PortalCredentials> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:295] [provisionLeadPortalUser] Started')
  try {
    const cleanDigits = (contact.phone || '').replace(/\D/g, '')
    const portalEmail = (contact.email || '').trim().toLowerCase() || `client.${cleanDigits || contact._id.toString()}@portal.proppulse.com`
    const tempPassword = customPassword || `Client!${Math.floor(1000 + Math.random() * 9000)}`

    const portalUser = await upsertPortalUser(contact, portalEmail, tempPassword, contact.brokerageId, forcePasswordReset)

    // Update contact record atomically (DI-002 compliant, avoids full document .save())
    if (!contact.portalEnabled || !contact.portalUserId) {
      await Contact.updateOne(
        { _id: contact._id },
        {
          $set: {
            portalUserId: portalUser._id,
            portalEnabled: true,
            portalAccessEmail: portalEmail,
          },
        }
      )
      contact.portalUserId = portalUser._id
      contact.portalEnabled = true
      contact.portalAccessEmail = portalEmail
    }

    const details = await buildPortalInviteDetails(contact, caller, portalEmail, tempPassword)

    // Non-blocking asynchronous activity logging
    setImmediate(async () => {
      try {
        await Activity.create({
          contactId: contact._id,
          brokerageId: contact.brokerageId,
          type: 'system',
          description: `VIP Client Portal credentials generated for ${contact.firstName} ${contact.lastName} (${portalEmail})`,
          createdBy: caller._id,
          createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
        })
      } catch (err) {
        logger.error('[provisionLeadPortalUser] Error logging activity:', err)
      }
    })

    return {
      portalUserId: portalUser._id.toString(),
      portalEmail,
      temporaryPassword: tempPassword,
      ...details,
    }
  } finally {
    logger.info(`[contact.service.ts:323] [provisionLeadPortalUser] Completed in ${Date.now() - startTime}ms`)
  }
}

// Persist activity and audit events on contact creation
const logContactCreation = async (
  contact: IContact,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:334] [logContactCreation] Started')
  try {
    await Activity.create({
      contactId: contact._id,
      brokerageId: caller.brokerageId,
      type: 'system',
      description: `Contact created from ${contact.leadSource}`,
      createdBy: caller._id,
      createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
    })
    await logAuditEvent({
      userId: caller._id,
      userEmail: caller.email,
      userRole: caller.role,
      brokerageId: caller.brokerageId,
      action: 'CONTACT_CREATE',
      resource: 'contacts',
      resourceId: contact._id.toString(),
      details: { name: `${contact.firstName} ${contact.lastName}`, leadSource: contact.leadSource },
      status: 'success',
      ipAddress: clientIp,
      userAgent,
    })
  } finally {
    logger.info(`[contact.service.ts:358] [logContactCreation] Completed in ${Date.now() - startTime}ms`)
  }
}

// Create a new contact and auto-log initial creation activity + auto-provision VIP portal
export const createContact = async (
  input: CreateContactInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ContactResponseDto> => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:571] [createContact] Started')
  try {
    const brokerageId = caller.brokerageId
    await checkDuplicateContact(brokerageId, input.email, input.phone, input.firstName, input.lastName)

    let assignedAgentId: mongoose.Types.ObjectId | undefined
    if (input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)) {
      assignedAgentId = new mongoose.Types.ObjectId(input.assignedAgentId)
    } else if (caller.role === USER_ROLES.AGENT) {
      assignedAgentId = caller._id
    }

    // 1. Explicitly timed DB Write span (PERF-M-004)
    const tWrite = process.hrtime.bigint()
    const contact = await Contact.create({ ...input, brokerageId, assignedAgentId })
    const writeMs = Number(process.hrtime.bigint() - tWrite) / 1e6
    logger.info(`[createContact:insertContactRecord] Completed in ${writeMs.toFixed(3)}ms`)

    // 2. Synchronously clear in-memory L1 cache (< 0.01ms)
    contactsL1Cache.clear()

    // 3. Offload all secondary side-effects (Audit log, Redis invalidation, Portal provisioning) to background
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          logContactCreation(contact, caller, clientIp, userAgent),
          invalidateTenantFeatureCache(brokerageId.toString(), 'contacts'),
          provisionLeadPortalUser(contact, caller),
        ])
      } catch (err) {
        logger.error('[createContact:backgroundTasks] Error in background execution:', err)
      }
    })

    // 4. Return contact immediately to client without blocking on background tasks
    const agentName = caller.role === USER_ROLES.AGENT ? `${caller.firstName} ${caller.lastName}` : undefined
    return formatContactDto(contact, agentName)
  } finally {
    const totalElapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[contact.service.ts:605] [createContact] Total critical path completed in ${totalElapsedMs.toFixed(3)}ms`)
  }
}

// Retrieve or regenerate VIP Portal invite credentials for a contact
export const getOrGeneratePortalInvite = async (
  contactId: string,
  caller: IUser,
  customPassword?: string
): Promise<PortalCredentials> => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:405] [getOrGeneratePortalInvite] Started')
  try {
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }
    const objContactId = new mongoose.Types.ObjectId(contactId)
    const contact = await Contact.findOne({
      _id: objContactId,
      brokerageId: caller.brokerageId,
      isDeleted: false,
    }).lean()

    if (!contact) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }
    verifyContactAccess(contact, caller)

    const forcePasswordReset = Boolean(customPassword)
    return await provisionLeadPortalUser(contact, caller, customPassword, forcePasswordReset)
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[contact.service.ts:417] [getOrGeneratePortalInvite] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Verify caller permission to view/modify a specific contact
const verifyContactAccess = (
  contact: { brokerageId?: any; assignedAgentId?: any },
  caller: IUser
): void => {
  if (caller.role === USER_ROLES.SUPER_ADMIN) return
  if (contact.brokerageId && contact.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }
  if (caller.role === USER_ROLES.AGENT && contact.assignedAgentId?.toString() !== caller._id.toString()) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }
}

// Get contact detail by ID with sub-millisecond multi-tier caching
export const getContactById = async (id: string, caller: IUser): Promise<ContactResponseDto> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }

    const brokerageId = caller.brokerageId?.toString() || 'global'
    const cacheKey = `pp:${brokerageId}:contact_detail:${id}`

    // 1. Check L1 Memory Cache (< 0.05ms)
    const l1Hit = contactDetailL1Cache.get(cacheKey)
    if (l1Hit) {
      verifyContactAccess(l1Hit, caller)
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
      logger.info(`[getContactById] L1 Cache HIT in ${elapsedMs.toFixed(3)}ms`)
      return l1Hit
    }

    // 2. Check L2 Redis Cache (< 1ms)
    const cached = await cacheGet(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ContactResponseDto
        contactDetailL1Cache.set(cacheKey, parsed, 60)
        verifyContactAccess(parsed, caller)
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
        logger.info(`[getContactById] L2 Redis HIT in ${elapsedMs.toFixed(3)}ms`)
        return parsed
      } catch {
        // Fallback to DB
      }
    }

    // 3. Cache Miss: Query MongoDB
    const contact = await Contact.findOne({ _id: id, isDeleted: false })
      .populate('assignedAgentId', 'firstName lastName')
      .lean()
    if (!contact) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }
    verifyContactAccess(contact, caller)
    const agent = contact.assignedAgentId as any
    const agentName = agent ? `${agent.firstName} ${agent.lastName}`.trim() : undefined
    const dto = formatContactDto(contact, agentName)

    // 4. Populate L1 and L2
    contactDetailL1Cache.set(cacheKey, dto, 60)
    cacheSet(cacheKey, JSON.stringify(dto), 120).catch(() => { })

    return dto
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[getContactById] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Capture contact snapshot before update for audit trail
const captureContactSnapshot = (contact: any): Record<string, any> => {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    leadScore: contact.leadScore,
    assignedAgentId: contact.assignedAgentId?.toString(),
  }
}

// Audit and activity logging for contact update mutations (sub-1ms non-blocking dispatch)
const logContactUpdate = (
  contact: any,
  caller: IUser,
  previousState: Record<string, any>,
  clientIp: string,
  userAgent: string
): void => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:499] [logContactUpdate] Started')

  // Execute secondary database log writes in parallel on the event loop without blocking the HTTP response
  setImmediate(async () => {
    try {
      await Promise.all([
        Activity.create({
          contactId: contact._id,
          brokerageId: contact.brokerageId,
          type: 'system',
          description: `Contact profile updated by ${caller.firstName} ${caller.lastName}`,
          createdBy: caller._id,
          createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
        }),
        logAuditEvent({
          userId: caller._id,
          userEmail: caller.email,
          userRole: caller.role,
          brokerageId: contact.brokerageId,
          action: 'CONTACT_UPDATE',
          resource: 'contacts',
          resourceId: contact._id.toString(),
          previousState,
          newState: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            status: contact.status,
            leadScore: contact.leadScore,
            assignedAgentId: contact.assignedAgentId?._id?.toString() || contact.assignedAgentId?.toString(),
          },
          status: 'success',
          ipAddress: clientIp,
          userAgent,
        }),
      ])
    } catch (err) {
      logger.error('[logContactUpdate] Background logging error:', err)
    }
  })

  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
  logger.info(`[contact.service.ts:526] [logContactUpdate] Completed in ${elapsedMs.toFixed(3)}ms`)
}

// Update contact details and auto-log modification activity
export const updateContact = async (
  id: string,
  input: UpdateContactInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ContactResponseDto> => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:537] [updateContact] Started')
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    const objectId = new mongoose.Types.ObjectId(id)

    // 1. Fetch lean document for fast permission check and audit snapshot
    const existing = await Contact.findOne({ _id: objectId, isDeleted: false }).lean()
    if (!existing) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    verifyContactAccess(existing, caller)

    const previousState = captureContactSnapshot(existing)

    // 2. Prepare atomic update payload
    const updatePayload: any = { ...input }
    if (input.assignedAgentId !== undefined) {
      updatePayload.assignedAgentId = input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)
        ? new mongoose.Types.ObjectId(input.assignedAgentId)
        : null
    }

    // 3. Single atomic update + populate in one DB round trip (replaces .save() + findById.populate)
    const updated = await Contact.findOneAndUpdate(
      { _id: objectId, isDeleted: false },
      { $set: updatePayload },
      { new: true, runValidators: true }
    )
      .populate('assignedAgentId', 'firstName lastName')
      .lean()

    if (!updated) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)

    // 4. Non-blocking asynchronous audit & activity logging
    logContactUpdate(updated, caller, previousState, clientIp, userAgent)

    // 5. Invalidate and update multi-tier caches
    contactsL1Cache.clear()
    contactActivitiesL1Cache.clear()
    const detailKey = `pp:${existing.brokerageId}:contact_detail:${id}`
    const agent = updated.assignedAgentId as any
    const agentName = agent ? `${agent.firstName} ${agent.lastName}`.trim() : undefined
    const dto = formatContactDto(updated, agentName)

    // Seed L1 & L2 detail cache with the freshly updated DTO for sub-millisecond follow-up reads
    contactDetailL1Cache.set(detailKey, dto, 60)
    cacheSet(detailKey, JSON.stringify(dto), 120).catch(() => { })
    invalidateTenantFeatureCache(existing.brokerageId.toString(), 'contacts').catch(() => { })

    return dto
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[contact.service.ts:559] [updateContact] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Record contact deletion activity and audit asynchronously (sub-1ms non-blocking dispatch)
const logContactDeletion = (
  contact: IContact | any,
  caller: IUser,
  clientIp: string,
  userAgent: string
): void => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:570] [logContactDeletion] Started')

  // Execute database log writes in parallel on the event loop without blocking the deletion flow
  setImmediate(async () => {
    try {
      await Promise.all([
        Activity.create({
          contactId: contact._id,
          brokerageId: contact.brokerageId,
          type: 'system',
          description: `Contact archived by ${caller.firstName} ${caller.lastName}`,
          createdBy: caller._id,
          createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
        }),
        logAuditEvent({
          userId: caller._id,
          userEmail: caller.email,
          userRole: caller.role,
          brokerageId: contact.brokerageId,
          action: 'CONTACT_DELETE',
          resource: 'contacts',
          resourceId: contact._id.toString(),
          details: { name: `${contact.firstName} ${contact.lastName}` },
          status: 'success',
          ipAddress: clientIp,
          userAgent,
        }),
      ])
    } catch (err) {
      logger.error('[logContactDeletion] Error persisting background deletion audit:', err)
    }
  })

  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
  logger.info(`[contact.service.ts:594] [logContactDeletion] Completed in ${elapsedMs.toFixed(3)}ms`)
}

// Soft-delete / archive contact
export const deleteContact = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  logger.info('[contact.service.ts:604] [deleteContact] Started')
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)

    // Atomic find + update with role/tenant security in one single MongoDB round trip
    const filter: Record<string, any> = { _id: id, isDeleted: false }
    if (caller.role !== USER_ROLES.SUPER_ADMIN) {
      filter.brokerageId = caller.brokerageId
    }
    if (caller.role === USER_ROLES.AGENT) {
      filter.assignedAgentId = caller._id
    }

    const contact = await Contact.findOneAndUpdate(
      filter,
      { $set: { isDeleted: true, status: 'archived' } },
      { projection: '_id brokerageId assignedAgentId firstName lastName' }
    ).lean()

    if (!contact) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }

    logContactDeletion(contact, caller, clientIp, userAgent)
    contactsL1Cache.clear()
    contactActivitiesL1Cache.clear()
    const detailKey = `pp:${contact.brokerageId}:contact_detail:${id}`
    contactDetailL1Cache.delete(detailKey)
    cacheDelete(detailKey).catch(() => { })
    invalidateTenantFeatureCache(contact.brokerageId.toString(), 'contacts').catch(() => { })
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[contact.service.ts:616] [deleteContact] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Audit record for contact notes
const logContactNoteAudit = async (
  contact: IContact,
  caller: IUser,
  noteLength: number,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:627] [logContactNoteAudit] Started')
  try {
    await logAuditEvent({
      userId: caller._id,
      userEmail: caller.email,
      userRole: caller.role,
      brokerageId: contact.brokerageId,
      action: 'CONTACT_ADD_NOTE',
      resource: 'contacts',
      resourceId: contact._id.toString(),
      details: { noteLength },
      status: 'success',
      ipAddress: clientIp,
      userAgent,
    })
  } finally {
    logger.info(`[contact.service.ts:646] [logContactNoteAudit] Completed in ${Date.now() - startTime}ms`)
  }
}

// Add note to contact and record note activity
export const addContactNote = async (
  id: string,
  input: AddNoteInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ActivityResponseDto> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:657] [addContactNote] Started')
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    const objId = new mongoose.Types.ObjectId(id)
    const contact = await Contact.findOne({ _id: objId, isDeleted: false })
    if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    verifyContactAccess(contact, caller)

    const activity = await Activity.create({
      contactId: contact._id,
      brokerageId: contact.brokerageId,
      type: 'note',
      description: input.note,
      createdBy: caller._id,
      createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
    })

    const updatedNotes = contact.notes ? `${contact.notes}\n\n${input.note}` : input.note
    const lastContactedAt = new Date()
    await Contact.updateOne(
      { _id: contact._id },
      { $set: { notes: updatedNotes, lastContactedAt } }
    )
    await logContactNoteAudit(contact, caller, input.note.length, clientIp, userAgent)
    contactsL1Cache.clear()
    contactActivitiesL1Cache.clear()
    await invalidateTenantFeatureCache(contact.brokerageId.toString(), 'contacts')
    return formatActivityDto(activity)
  } finally {
    logger.info(`[contact.service.ts:681] [addContactNote] Completed in ${Date.now() - startTime}ms`)
  }
}

// Get paginated activity timeline for a contact
export const getContactActivities = async (
  contactId: string,
  caller: IUser,
  page: number = 1,
  limit: number = 25
): Promise<{ activities: ActivityResponseDto[]; total: number }> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }
    const objId = new mongoose.Types.ObjectId(contactId)
    const brokerageId = caller.brokerageId?.toString() || 'global'
    const detailKey = `pp:${brokerageId}:contact_detail:${contactId}`

    // 1. Fast permission verification: check L1 contact cache first (< 0.05ms)
    let contactAccess: { brokerageId?: any; assignedAgentId?: any } | null | undefined = contactDetailL1Cache.get(detailKey)

    // 2. Check L2 Redis cache if L1 misses (< 1ms)
    if (!contactAccess) {
      try {
        const cachedDetail = await cacheGet(detailKey)
        if (cachedDetail) {
          contactAccess = JSON.parse(cachedDetail)
        }
      } catch {
        // Fallback to database
      }
    }

    // 3. Fallback to MongoDB: lean covered projection (brokerageId & assignedAgentId only)
    if (!contactAccess) {
      const found = await Contact.findOne(
        { _id: objId, isDeleted: false },
        { brokerageId: 1, assignedAgentId: 1 }
      ).lean()
      if (!found) {
        throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
      }
      contactAccess = found
    }

    verifyContactAccess(contactAccess, caller)

    // 4. Check Activities L1 Cache (< 0.05ms)
    const activitiesCacheKey = `pp:${brokerageId}:contact_activities:${contactId}:${page}:${limit}`
    const cachedActivities = contactActivitiesL1Cache.get(activitiesCacheKey)
    if (cachedActivities) {
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
      logger.info(`[getContactActivities] L1 Cache HIT in ${elapsedMs.toFixed(3)}ms`)
      return cachedActivities
    }

    // 5. Query MongoDB for activities
    const skip = (page - 1) * limit
    const [activities, total] = await Promise.all([
      Activity.find({ contactId: objId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments({ contactId: objId }),
    ])

    const formatted = { activities: activities.map(formatActivityDto), total }
    contactActivitiesL1Cache.set(activitiesCacheKey, formatted, 30)
    return formatted
  } finally {
    const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
    logger.info(`[getContactActivities] Completed in ${elapsedMs.toFixed(3)}ms`)
  }
}

// Build update payload for bulk contact mutations
const buildBulkUpdatePayload = (input: BulkContactActionInput, caller: IUser): Record<string, any> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:721] [buildBulkUpdatePayload] Started')
  const updatePayload: Record<string, any> = {}
  if (input.action === 'add_tags' && input.tags && input.tags.length > 0) {
    updatePayload.$addToSet = { tags: { $each: input.tags } }
  } else if (input.action === 'remove_tags' && input.tags && input.tags.length > 0) {
    updatePayload.$pullAll = { tags: input.tags }
  } else if (input.action === 'assign_agent') {
    if (caller.role === USER_ROLES.AGENT) {
      throw new AppError('Agents cannot reassign contacts to other agents', HTTP_STATUS.FORBIDDEN)
    }
    const agentId = input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)
      ? new mongoose.Types.ObjectId(input.assignedAgentId)
      : undefined
    updatePayload.$set = { assignedAgentId: agentId }
  } else if (input.action === 'update_status' && input.status) {
    updatePayload.$set = { status: input.status }
  }
  logger.info(`[contact.service.ts:738] [buildBulkUpdatePayload] Completed in ${Date.now() - startTime}ms`)
  return updatePayload
}

// Log audit event for bulk contact operations
const logBulkUpdateAudit = async (
  caller: IUser,
  input: BulkContactActionInput,
  affectedCount: number,
  clientIp: string,
  userAgent: string
): Promise<void> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:749] [logBulkUpdateAudit] Started')
  try {
    await logAuditEvent({
      userId: caller._id,
      userEmail: caller.email,
      userRole: caller.role,
      brokerageId: caller.brokerageId,
      action: 'CONTACT_BULK_ACTION',
      resource: 'contacts',
      details: {
        action: input.action,
        affectedCount,
        tags: input.tags,
        status: input.status,
        assignedAgentId: input.assignedAgentId,
      },
      status: 'success',
      ipAddress: clientIp,
      userAgent,
    })
  } finally {
    logger.info(`[contact.service.ts:771] [logBulkUpdateAudit] Completed in ${Date.now() - startTime}ms`)
  }
}

// Bulk update contacts with role-based list boundary enforcement
export const bulkUpdateContacts = async (
  input: BulkContactActionInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<{ updatedCount: number }> => {
  const startTime = Date.now()
  logger.info('[contact.service.ts:781] [bulkUpdateContacts] Started')
  try {
    const objectIds = input.contactIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const filter: Record<string, any> = {
      _id: { $in: objectIds },
      brokerageId: caller.brokerageId,
      isDeleted: false,
    }
    if (caller.role === USER_ROLES.AGENT) {
      filter.assignedAgentId = caller._id
    }

    const updatePayload = buildBulkUpdatePayload(input, caller)
    const result = await Contact.updateMany(filter, updatePayload)
    await logBulkUpdateAudit(caller, input, result.modifiedCount, clientIp, userAgent)
    contactsL1Cache.clear()
    await invalidateTenantFeatureCache(caller.brokerageId.toString(), 'contacts')
    return { updatedCount: result.modifiedCount }
  } finally {
    logger.info(`[contact.service.ts:802] [bulkUpdateContacts] Completed in ${Date.now() - startTime}ms`)
  }
}
