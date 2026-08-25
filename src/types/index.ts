import type { UserRole } from './auth'

// ── Contact ──────────────────────────────────────────
export interface Contact {
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
  propertyInterests?: string[]
  socialLinks?: {
    linkedin?: string
    facebook?: string
    instagram?: string
  }
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
}

export type ContactStatus = 'active' | 'inactive' | 'do_not_contact' | 'archived'

// ── Activity ─────────────────────────────────────────
export interface ActivityItem {
  id: string
  contactId: string
  type: ActivityType
  description: string
  metadata?: Record<string, string>
  createdAt: string
  createdBy?: string
}

export type ActivityType = 'call' | 'email' | 'sms' | 'note' | 'stage_change' | 'whatsapp' | 'meeting' | 'system'

// ── Lead Source ──────────────────────────────────────
export interface LeadSource {
  id: string
  name: string
  type: string
  logoUrl?: string
  isActive: boolean
  leadCount: number
  lastReceivedAt?: string
  config?: Record<string, string>
}

// ── Routing Rule ─────────────────────────────────────
export interface RoutingRule {
  id: string
  name: string
  type: RoutingRuleType
  assignedAgentIds: string[]
  assignedAgentNames?: string[]
  priority: number
  isActive: boolean
  zipCodes?: string[]
  escalationTimeoutSeconds?: number
  weights?: Record<string, number>
  createdAt: string
}

export type RoutingRuleType = 'round_robin' | 'weighted' | 'zip_code' | 'time_of_day'

// ── Webhook ──────────────────────────────────────────
export interface Webhook {
  id: string
  url: string
  secretKey: string
  events: string[]
  isActive: boolean
  lastTriggeredAt?: string
  createdAt: string
}

// ── Pipeline & Deals ─────────────────────────────────
export interface Pipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

export interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  dealCount: number
  totalValue: number
}

export interface Deal {
  id: string
  contactId: string
  contactName: string
  propertyAddress: string
  dealValue: number
  stageId: string
  stageName?: string
  assignedAgentId?: string
  assignedAgentName?: string
  priority: DealPriority
  daysInStage: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type DealPriority = 'low' | 'medium' | 'high' | 'urgent'

// ── Data Health ──────────────────────────────────────
export interface DataHealthScore {
  overallScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  duplicatesFound: number
  unverifiedPhones: number
  invalidEmails: number
  missingFields: number
  lastScanAt: string
  trend: DataHealthTrend[]
}

export interface DataHealthTrend {
  date: string
  score: number
}

export interface DuplicatePair {
  id: string
  contact1: Contact
  contact2: Contact
  matchScore: number
  matchFields: string[]
  status: 'pending' | 'merged' | 'dismissed'
}

// ── Smart List ───────────────────────────────────────
export interface SmartListFilter {
  id: string
  field: string
  operator: FilterOperator
  value: string | number | string[]
}

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty'

export interface SavedSmartList {
  id: string
  name: string
  filters: SmartListFilter[]
  contactCount: number
  updatedAt: string
}

// ── Notification ─────────────────────────────────────
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: string
  linkTo?: string
}

export type NotificationType = 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system'

// ── Integration ──────────────────────────────────────
export interface Integration {
  id: string
  name: string
  type: string
  logoUrl?: string
  isConnected: boolean
  configFields?: IntegrationConfigField[]
}

export interface IntegrationConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  value?: string
  placeholder?: string
}

// ── Settings ─────────────────────────────────────────
export interface NotificationPreference {
  type: string
  label: string
  email: boolean
  push: boolean
  sms: boolean
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: 'active' | 'invited' | 'disabled'
  lastActiveAt?: string
  avatarUrl?: string
}
