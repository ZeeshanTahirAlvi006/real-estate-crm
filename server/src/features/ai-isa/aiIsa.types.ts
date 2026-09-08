import type { CriteriaCategory } from '../../models/QualificationCriteria.js'
import type { CampaignStatus, CampaignChannel } from '../../models/ReactivationCampaign.js'
import type { IsaTone } from '../../models/AiIsaConfig.js'

export interface AiIsaConfigDto {
  brokerageId: string
  isEnabled: boolean
  persona: {
    name: string
    tone: IsaTone
    agentName: string
    brokerageName: string
    customInstructions?: string
  }
  officeHoursOnly: boolean
  autoReplyChannels: Array<'sms' | 'whatsapp' | 'email'>
  autoPilotEnabled: boolean
  humanHandoffDelaySeconds: number
  qualificationThresholdScore: number
}

export interface UpdateAiIsaConfigInput {
  isEnabled?: boolean
  persona?: {
    name?: string
    tone?: IsaTone
    agentName?: string
    brokerageName?: string
    customInstructions?: string
  }
  officeHoursOnly?: boolean
  autoReplyChannels?: Array<'sms' | 'whatsapp' | 'email'>
  autoPilotEnabled?: boolean
  humanHandoffDelaySeconds?: number
  qualificationThresholdScore?: number
}

// Qualification Criteria DTOs

export interface QualificationCriteriaDto {
  id: string
  category: CriteriaCategory
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
  order: number
}

export interface CreateQualificationCriteriaInput {
  category: CriteriaCategory
  label: string
  isRequired?: boolean
  promptDirective: string
  options?: string[]
  order?: number
}

export interface UpdateCriteriaInput {
  isRequired?: boolean
  promptDirective?: string
  options?: string[]
}

// Reactivation Campaign DTOs

export interface ReactivationCampaignDto {
  id: string
  name: string
  status: CampaignStatus
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  dormantDaysThreshold: number
  totalLeads: number
  contactedCount: number
  respondedCount: number
  engagedCount: number
  convertedCount: number
  meetingsBookedCount: number
  lastExecutedAt?: string
  lastRunAt?: string
}

export interface CreateCampaignInput {
  name: string
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  dormantDaysThreshold?: number
  totalLeads?: number
}

export interface UpdateCampaignInput {
  name?: string
  targetSegment?: string
  channel?: CampaignChannel
  messageTemplate?: string
  dormantDaysThreshold?: number
}

export interface CampaignMetricsDto {
  campaignId: string
  name: string
  status: CampaignStatus
  totalLeads: number
  contactedCount: number
  respondedCount: number
  engagedCount: number
  convertedCount: number
  meetingsBookedCount: number
  responseRatePercent: number
  engagementRatePercent: number
  conversionRatePercent: number
  lastRunAt?: string
}

// Speed-to-Lead DTOs

export interface SpeedToLeadMetricDto {
  medianResponseSeconds: number
  sub30sRatePercent: number
  engagementRatePercent: number
  qualificationConversionRatePercent: number
  totalAiConversations: number
}

// AI Chat Simulation DTOs

export interface ExtractedCriteriaState {
  budget?: string
  timeline?: string
  preApproval?: 'approved' | 'cash' | 'needs_lender' | 'not_started'
  location?: string
  homeToSell?: 'yes' | 'no' | 'selling_first'
}

export interface AiChatSimulateInput {
  leadMessage: string
  contactId?: string
  conversationHistory?: Array<{ role: 'lead' | 'assistant'; text: string }>
  currentCriteriaState?: ExtractedCriteriaState
}

export interface AiChatSimulateResponse {
  reply: string
  extractedCriteria: ExtractedCriteriaState
  isQualified: boolean
  handoffTriggered: boolean
  handoffReason?: string
  fairHousingPassed: boolean
  fairHousingFlags: string[]
  confidenceScore: number
}
