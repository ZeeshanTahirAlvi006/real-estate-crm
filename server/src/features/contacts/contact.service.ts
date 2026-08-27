import { Contact, IContact } from '../../models/Contact.js'
import { Activity, IActivity } from '../../models/Activity.js'
import { IUser } from '../../models/User.js'
import {
  ContactResponseDto,
  ActivityResponseDto,
  CreateContactInput,
  UpdateContactInput,
  AddNoteInput,
  BulkContactActionInput,
  ListContactsQuery,
} from './contact.types.js'
import { getPagination } from '../../utils/pagination.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import mongoose from 'mongoose'

// Format Contact Mongoose document into DTO
export const formatContactDto = (contact: IContact, agentName?: string): ContactResponseDto => ({
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
  assignedAgentId: contact.assignedAgentId?.toString(),
  assignedAgentName: agentName,
  notes: contact.notes,
  propertyInterests: contact.propertyInterests || [],
  socialLinks: contact.socialLinks,
  createdAt: contact.createdAt.toISOString(),
  updatedAt: contact.updatedAt.toISOString(),
  lastContactedAt: contact.lastContactedAt?.toISOString(),
})

// Format Activity Mongoose document into DTO
export const formatActivityDto = (activity: IActivity): ActivityResponseDto => {
  let metadataObj: Record<string, string> | undefined
  if (activity.metadata) {
    if (activity.metadata instanceof Map) {
      metadataObj = Object.fromEntries(activity.metadata)
    } else if (typeof activity.metadata === 'object') {
      metadataObj = { ...(activity.metadata as unknown as Record<string, string>) }
    }
  }

  return {
    id: activity._id.toString(),
    contactId: activity.contactId.toString(),
    type: activity.type,
    description: activity.description,
    metadata: metadataObj,
    createdAt: activity.createdAt.toISOString(),
    createdBy: activity.createdByName || activity.createdBy?.toString(),
  }
}

// Build query filter with tenant & role scoping
const buildContactFilter = (query: ListContactsQuery, caller: IUser, tenantFilter: Record<string, any>) => {
  const filter: Record<string, any> = { ...tenantFilter, isDeleted: false }

  // Agents only see their assigned contacts
  if (typeof caller.role === 'string' && caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  } else if (query.assignedAgentId && mongoose.Types.ObjectId.isValid(query.assignedAgentId)) {
    filter.assignedAgentId = new mongoose.Types.ObjectId(query.assignedAgentId)
  }

  if (typeof query.status === 'string' && query.status !== 'all') filter.status = query.status
  if (typeof query.source === 'string' && query.source !== 'all') filter.leadSource = query.source
  if (typeof query.tag === 'string' && query.tag !== 'all') filter.tags = query.tag

  if (typeof query.minScore === 'number' && typeof query.maxScore === 'number') {
    filter.leadScore = {}
    if (query.minScore !== undefined) filter.leadScore.$gte = query.minScore
    if (query.maxScore !== undefined) filter.leadScore.$lte = query.maxScore
  }

  if (typeof query.search === 'string' && query.search) {
    const escaped = escapeRegExp(query.search)
    filter.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
    ]
  }

  return filter
}

// List contacts with pagination, search, and dynamic filtering
export const listContacts = async (
  query: ListContactsQuery,
  caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ contacts: ContactResponseDto[]; total: number }> => {
  const filter = buildContactFilter(query, caller, tenantFilter)
  const { limit, skip } = getPagination(query)
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'createdAt'

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .populate('assignedAgentId', 'firstName lastName'),
    Contact.countDocuments(filter),
  ])

  const formatted = contacts.map((c) => {
    const agent = c.assignedAgentId as any
    const agentName = agent ? `${agent.firstName} ${agent.lastName}`.trim() : undefined
    return formatContactDto(c, agentName)
  })

  return { contacts: formatted, total }
}

// Check for potential duplicate contacts in the brokerage
const checkDuplicateContact = async (
  brokerageId: mongoose.Types.ObjectId,
  email?: string,
  phone?: string,
  firstName?: string,
  lastName?: string
) => {
  const duplicateQuery: Record<string, any>[] = []
  if (email && email.trim()) {
    duplicateQuery.push({ email: email.trim().toLowerCase() })
  }
  if (phone && phone.trim()) {
    const raw = phone.trim()
    const digitsOnly = raw.replace(/\D/g, '')
    duplicateQuery.push({ phone: raw })
    if (digitsOnly.length >= 7) {
      duplicateQuery.push({ phone: new RegExp(digitsOnly.slice(-10)) })
    }
  }
  if (firstName && lastName && firstName.trim() && lastName.trim()) {
    duplicateQuery.push({
      firstName: new RegExp(`^${escapeRegExp(firstName.trim())}$`, 'i'),
      lastName: new RegExp(`^${escapeRegExp(lastName.trim())}$`, 'i'),
    })
  }

  if (duplicateQuery.length === 0) return

  const existing = await Contact.findOne({
    brokerageId,
    isDeleted: false,
    $or: duplicateQuery,
  })

  if (existing) {
    let matchField = 'information'
    if (email && existing.email?.toLowerCase() === email.trim().toLowerCase()) {
      matchField = `email (${email})`
    } else if (phone && (existing.phone === phone || (existing.phone && existing.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')))) {
      matchField = `phone (${phone})`
    } else if (firstName && lastName && existing.firstName.toLowerCase() === firstName.trim().toLowerCase() && existing.lastName.toLowerCase() === lastName.trim().toLowerCase()) {
      matchField = `name (${existing.firstName} ${existing.lastName})`
    }

    throw new AppError(
      `Contact exists: A contact with matching ${matchField} already exists (${existing.firstName} ${existing.lastName}).`,
      HTTP_STATUS.CONFLICT,
      {
        existingContactId: existing._id.toString(),
        existingContactName: `${existing.firstName} ${existing.lastName}`,
        matchField,
      }
    )
  }
}

// Create a new contact and auto-log initial creation activity
export const createContact = async (
  input: CreateContactInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ContactResponseDto> => {
  const brokerageId = caller.brokerageId
  await checkDuplicateContact(brokerageId, input.email, input.phone, input.firstName, input.lastName)

  let assignedAgentId: mongoose.Types.ObjectId | undefined
  if (input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)) {
    assignedAgentId = new mongoose.Types.ObjectId(input.assignedAgentId)
  } else if (caller.role === USER_ROLES.AGENT) {
    assignedAgentId = caller._id
  }

  const contact = await Contact.create({
    ...input,
    brokerageId,
    assignedAgentId,
  })

  await Activity.create({
    contactId: contact._id,
    brokerageId,
    type: 'system',
    description: `Contact created from ${contact.leadSource}`,
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
  })

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId,
    action: 'CONTACT_CREATE',
    resource: 'contacts',
    resourceId: contact._id.toString(),
    details: { name: `${contact.firstName} ${contact.lastName}`, leadSource: contact.leadSource },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  return formatContactDto(contact, caller.role === USER_ROLES.AGENT ? `${caller.firstName} ${caller.lastName}` : undefined)
}

// Verify caller permission to view/modify a specific contact
const verifyContactAccess = (contact: IContact, caller: IUser): void => {
  if (caller.role === USER_ROLES.SUPER_ADMIN) return
  if (contact.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }
  if (caller.role === USER_ROLES.AGENT && contact.assignedAgentId?.toString() !== caller._id.toString()) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }
}

// Get contact detail by ID
export const getContactById = async (id: string, caller: IUser): Promise<ContactResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  const contact = await Contact.findOne({ _id: id, isDeleted: false }).populate('assignedAgentId', 'firstName lastName')
  if (!contact) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  verifyContactAccess(contact, caller)
  const agent = contact.assignedAgentId as any
  const agentName = agent ? `${agent.firstName} ${agent.lastName}`.trim() : undefined
  return formatContactDto(contact, agentName)
}

// Update contact details and auto-log modification activity
export const updateContact = async (
  id: string,
  input: UpdateContactInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ContactResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  const contact = await Contact.findOne({ _id: id, isDeleted: false })
  if (!contact) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  verifyContactAccess(contact, caller)

  const previousState = {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    status: contact.status,
    leadScore: contact.leadScore,
    assignedAgentId: contact.assignedAgentId?.toString(),
  }

  Object.assign(contact, input)
  if (input.assignedAgentId !== undefined) {
    contact.assignedAgentId = input.assignedAgentId && mongoose.Types.ObjectId.isValid(input.assignedAgentId)
      ? new mongoose.Types.ObjectId(input.assignedAgentId)
      : undefined
  }

  await contact.save()

  await Activity.create({
    contactId: contact._id,
    brokerageId: contact.brokerageId,
    type: 'system',
    description: `Contact profile updated by ${caller.firstName} ${caller.lastName}`,
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
  })

  await logAuditEvent({
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
      assignedAgentId: contact.assignedAgentId?.toString(),
    },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const populated = await Contact.findById(contact._id).populate('assignedAgentId', 'firstName lastName')
  const agent = populated?.assignedAgentId as any
  return formatContactDto(populated || contact, agent ? `${agent.firstName} ${agent.lastName}` : undefined)
}

// Soft-delete / archive contact
export const deleteContact = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  const contact = await Contact.findOne({ _id: id, isDeleted: false })
  if (!contact) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  verifyContactAccess(contact, caller)
  contact.isDeleted = true
  contact.status = 'archived'
  await contact.save()

  await Activity.create({
    contactId: contact._id,
    brokerageId: contact.brokerageId,
    type: 'system',
    description: `Contact archived by ${caller.firstName} ${caller.lastName}`,
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
  })

  await logAuditEvent({
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
  })
}

// Add note to contact and record note activity
export const addContactNote = async (
  id: string,
  input: AddNoteInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<ActivityResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  const contact = await Contact.findOne({ _id: id, isDeleted: false })
  if (!contact) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  verifyContactAccess(contact, caller)

  const activity = await Activity.create({
    contactId: contact._id,
    brokerageId: contact.brokerageId,
    type: 'note',
    description: input.note,
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`.trim(),
  })

  // Append note to contact notes summary
  contact.notes = contact.notes ? `${contact.notes}\n\n${input.note}` : input.note
  contact.lastContactedAt = new Date()
  await contact.save()

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: contact.brokerageId,
    action: 'CONTACT_ADD_NOTE',
    resource: 'contacts',
    resourceId: contact._id.toString(),
    details: { noteLength: input.note.length },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  return formatActivityDto(activity)
}

// Get paginated activity timeline for a contact
export const getContactActivities = async (
  contactId: string,
  caller: IUser,
  page: number = 1,
  limit: number = 25
): Promise<{ activities: ActivityResponseDto[]; total: number }> => {
  if (!mongoose.Types.ObjectId.isValid(contactId)) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  const contact = await Contact.findOne({ _id: contactId, isDeleted: false })
  if (!contact) {
    throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  }

  verifyContactAccess(contact, caller)
  const skip = (page - 1) * limit

  const [activities, total] = await Promise.all([
    Activity.find({ contactId: contact._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Activity.countDocuments({ contactId: contact._id }),
  ])

  return { activities: activities.map(formatActivityDto), total }
}

// Bulk update contacts with role-based list boundary enforcement
export const bulkUpdateContacts = async (
  input: BulkContactActionInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<{ updatedCount: number }> => {
  const objectIds = input.contactIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const filter: Record<string, any> = {
    _id: { $in: objectIds },
    brokerageId: caller.brokerageId,
    isDeleted: false,
  }

  // Agents can only bulk-update their own assigned contacts
  if (caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  }

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

  const result = await Contact.updateMany(filter, updatePayload)

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: caller.brokerageId,
    action: 'CONTACT_BULK_ACTION',
    resource: 'contacts',
    details: {
      action: input.action,
      affectedCount: result.modifiedCount,
      tags: input.tags,
      status: input.status,
      assignedAgentId: input.assignedAgentId,
    },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  return { updatedCount: result.modifiedCount }
}
