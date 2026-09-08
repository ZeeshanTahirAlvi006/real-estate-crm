import { LeadSourceType, RoutingRuleType } from '../../utils/constants.js'

// ── LeadSource DTOs ──

export interface LeadSourceResponseDto {
  id: string
  name: string
  type: LeadSourceType
  captureKey: string
  isActive: boolean
  leadCount: number
  config: {
    fieldMapping?: Record<string, string>
  }
  brokerageId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  webhookSecret?: string // Only populated when explicitly requested by owner+
}

export interface CreateLeadSourceInput {
  name: string
  type: LeadSourceType
  isActive?: boolean
  config?: {
    fieldMapping?: Record<string, string>
  }
}

export interface UpdateLeadSourceInput {
  name?: string
  type?: LeadSourceType
  isActive?: boolean
  config?: {
    fieldMapping?: Record<string, string>
  }
}

// ── RoutingRule DTOs ──

export interface AgentWeightInput {
  agentId: string
  percentage: number
}

export interface ZipCodeMappingInput {
  zipCodes: string[]
  agentId: string
}

export interface ScheduleWindowInput {
  dayOfWeek: number[]
  startHour: number
  endHour: number
}

export interface AgentScheduleInput {
  agentId: string
  timezone: string
  windows: ScheduleWindowInput[]
}

export interface RoutingRuleResponseDto {
  id: string
  name: string
  type: RoutingRuleType
  isActive: boolean
  priority: number
  brokerageId: string
  createdBy: string
  assignedAgentIds: string[]
  lastAssignedIndex: number
  agentWeights: { agentId: string; percentage: number }[]
  zipCodeMappings: { zipCodes: string[]; agentId: string }[]
  schedules: {
    agentId: string
    timezone: string
    windows: ScheduleWindowInput[]
  }[]
  escalationTimeoutSeconds: number
  createdAt: string
  updatedAt: string
}

export interface CreateRoutingRuleInput {
  name: string
  type: RoutingRuleType
  isActive?: boolean
  priority?: number
  assignedAgentIds?: string[]
  agentWeights?: AgentWeightInput[]
  zipCodeMappings?: ZipCodeMappingInput[]
  schedules?: AgentScheduleInput[]
  escalationTimeoutSeconds?: number
}

export interface UpdateRoutingRuleInput {
  name?: string
  isActive?: boolean
  priority?: number
  assignedAgentIds?: string[]
  agentWeights?: AgentWeightInput[]
  zipCodeMappings?: ZipCodeMappingInput[]
  schedules?: AgentScheduleInput[]
  escalationTimeoutSeconds?: number
}

// ── Lead Ingestion DTOs ──

export interface LeadIngestPayload {
  // Universal fields that the parser will try to extract
  firstName?: string
  lastName?: string
  name?: string // Fallback: full name to be split
  email?: string
  phone?: string
  message?: string
  propertyAddress?: string
  propertyPrice?: number
  zipCode?: string
  source?: string
  [key: string]: unknown // Allow any extra fields from webhooks
}

export interface LeadCapturePayload {
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

export interface ManualLeadEntryInput {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  message?: string
  propertyAddress?: string
  propertyPrice?: number
  zipCode?: string
  leadSource?: string
  tags?: string[]
  assignedAgentId?: string
}

export interface LeadAcknowledgeInput {
  contactIds: string[]
}

// ── ScoringConfig DTOs ──

export interface SourceWeightInput {
  sourceType: string
  points: number
}

export interface KeywordWeightInput {
  keyword: string
  points: number
}

export interface PriceTierWeightInput {
  minPrice: number
  maxPrice: number
  points: number
}

export interface MessageLengthBonusInput {
  minLength: number
  points: number
}

export interface ScoringConfigResponseDto {
  id: string
  brokerageId: string
  sourceWeights: SourceWeightInput[]
  keywordWeights: KeywordWeightInput[]
  priceTierWeights: PriceTierWeightInput[]
  financingBonus: number
  messageLengthBonus: MessageLengthBonusInput
  baseScore: number
  createdAt: string
  updatedAt: string
}

export interface UpdateScoringConfigInput {
  sourceWeights?: SourceWeightInput[]
  keywordWeights?: KeywordWeightInput[]
  priceTierWeights?: PriceTierWeightInput[]
  financingBonus?: number
  messageLengthBonus?: MessageLengthBonusInput
  baseScore?: number
}

// ── Parsed Lead (internal) ──

export interface ParsedLead {
  firstName: string
  lastName: string
  email: string
  phone: string
  message: string
  propertyAddress: string
  propertyPrice: number
  zipCode: string
  sourceType: string
}

// ── Routing Result (internal) ──

export interface RoutingResult {
  agentId: string | null
  ruleId: string | null
  ruleName: string | null
  ruleType: RoutingRuleType | null
  matched: boolean
}

// ── Query types ──

export interface ListLeadSourcesQuery {
  search?: string
  type?: string
  isActive?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ListRoutingRulesQuery {
  type?: string
  isActive?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
