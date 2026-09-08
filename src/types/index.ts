import type { UserRole } from './auth'

export interface PortalCredentials {
  portalUserId: string
  portalEmail: string
  temporaryPassword?: string
  portalUrl: string
  loginUrl: string
  whatsappInviteMessage: string
  whatsappShareUrl: string
}

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
  portalUserId?: string
  portalEnabled?: boolean
  portalAccessEmail?: string
  portalCredentials?: PortalCredentials
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
  type: LeadSourceType
  captureKey: string
  webhookSecret?: string
  isActive: boolean
  leadCount: number
  config?: {
    fieldMapping?: Record<string, string>
  }
  brokerageId?: string
  createdBy?: string
  createdAt: string
  updatedAt?: string
}

export type LeadSourceType =
  | 'zillow'
  | 'realtor'
  | 'meta_ads'
  | 'google_ads'
  | 'website'
  | 'webhook'
  | 'manual'

// ── Routing Rule ─────────────────────────────────────
export interface AgentWeight {
  agentId: string
  percentage: number
}

export interface ZipCodeMapping {
  zipCodes: string[]
  agentId: string
}

export interface ScheduleWindow {
  dayOfWeek: number[]
  startHour: number
  endHour: number
}

export interface AgentSchedule {
  agentId: string
  timezone: string
  windows: ScheduleWindow[]
}

export interface RoutingRule {
  id: string
  name: string
  type: RoutingRuleType
  isActive: boolean
  priority: number
  brokerageId?: string
  createdBy?: string
  assignedAgentIds?: string[]
  assignedAgentNames?: string[]
  lastAssignedIndex?: number
  agentWeights?: AgentWeight[]
  zipCodeMappings?: ZipCodeMapping[]
  schedules?: AgentSchedule[]
  escalationTimeoutSeconds?: number
  createdAt: string
  updatedAt?: string
}

export type RoutingRuleType = 'round_robin' | 'weighted' | 'zip_code' | 'time_of_day'

// ── Scoring Config ───────────────────────────────────
export interface SourceWeight {
  sourceType: string
  points: number
}

export interface KeywordWeight {
  keyword: string
  points: number
}

export interface PriceTierWeight {
  minPrice: number
  maxPrice: number
  points: number
}

export interface MessageLengthBonus {
  minLength: number
  points: number
}

export interface ScoringConfig {
  id: string
  brokerageId: string
  sourceWeights: SourceWeight[]
  keywordWeights: KeywordWeight[]
  priceTierWeights: PriceTierWeight[]
  financingBonus: number
  messageLengthBonus: MessageLengthBonus
  baseScore: number
  createdAt: string
  updatedAt: string
}

// ── Lead Ingestion / Simulator ───────────────────────
export interface IngestLeadPayload {
  firstName?: string
  lastName?: string
  name?: string
  email?: string
  phone?: string
  message?: string
  propertyAddress?: string
  propertyPrice?: number
  zipCode?: string
  source?: string
  [key: string]: unknown
}

export interface IngestLeadResult {
  contactId: string
  isNew: boolean
  routed?: boolean
  leadScore?: number
  assignedAgentId?: string
  assignedAgentName?: string
}

export interface CaptureLeadPayload {
  captureKey: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  message?: string
  propertyAddress?: string
  propertyPrice?: number
  zipCode?: string
}

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
  brokerageId: string
  isDefault: boolean
  stages: PipelineStage[]
  createdAt: string
  updatedAt: string
}

export interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  probability: number
  dealCount: number
  totalValue: number
  weightedValue: number
}

export interface Deal {
  id: string
  pipelineId: string
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
  stageEnteredAt?: string
  isConvertedToEscrow?: boolean
  transactionId?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type DealPriority = 'low' | 'medium' | 'high' | 'urgent'

// Kanban response types
export interface KanbanStage extends PipelineStage {
  deals: Deal[]
}

export interface KanbanResponse {
  pipelineId: string
  pipelineName: string
  stages: KanbanStage[]
  summary: {
    totalDeals: number
    totalValue: number
    weightedForecast: number
  }
}

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
  createdAt?: string
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

export interface Notification {
  id: string
  userId?: string
  brokerageId?: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  isDeleted?: boolean
  deletedAt?: string
  createdAt: string
  updatedAt?: string
  linkTo?: string
  metadata?: Record<string, any>
}

export type NotificationType =
  | 'new_lead'
  | 'stage_change'
  | 'data_health'
  | 'team_activity'
  | 'system'
  | 'new_message'

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
