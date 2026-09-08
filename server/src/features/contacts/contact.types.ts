import { ContactStatus, ISocialLinks } from '../../models/Contact.js'
import { ActivityType } from '../../models/Activity.js'

export interface PortalCredentials {
  portalUserId: string
  portalEmail: string
  temporaryPassword?: string
  portalUrl: string
  loginUrl: string
  whatsappInviteMessage: string
  whatsappShareUrl: string
}

export interface ContactResponseDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource: string
  leadScore: number
  tags: string[]
  status: ContactStatus
  assignedAgentId?: string
  assignedAgentName?: string
  notes?: string
  propertyInterests: string[]
  socialLinks?: ISocialLinks
  portalUserId?: string
  portalEnabled?: boolean
  portalAccessEmail?: string
  portalCredentials?: PortalCredentials
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
}

export interface ActivityResponseDto {
  id: string
  contactId: string
  type: ActivityType
  description: string
  metadata?: Record<string, string>
  createdAt: string
  createdBy?: string
}

export interface CreateContactInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource?: string
  leadScore?: number
  tags?: string[]
  status?: ContactStatus
  assignedAgentId?: string
  notes?: string
  propertyInterests?: string[]
  socialLinks?: ISocialLinks
}

export interface UpdateContactInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource?: string
  leadScore?: number
  tags?: string[]
  status?: ContactStatus
  assignedAgentId?: string
  notes?: string
  propertyInterests?: string[]
  socialLinks?: ISocialLinks
  lastContactedAt?: string
}

export interface AddNoteInput {
  note: string
}

export interface BulkContactActionInput {
  contactIds: string[]
  action: 'add_tags' | 'remove_tags' | 'assign_agent' | 'update_status'
  tags?: string[]
  assignedAgentId?: string
  status?: ContactStatus
}

export interface ListContactsQuery {
  search?: string
  status?: string
  source?: string
  tag?: string
  assignedAgentId?: string
  minScore?: number
  maxScore?: number
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DuplicateContactWarning {
  existingContactId: string
  existingContactName: string
  matchField: 'email' | 'phone'
}
