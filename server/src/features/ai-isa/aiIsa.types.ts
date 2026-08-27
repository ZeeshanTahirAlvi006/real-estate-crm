import type { CriteriaCategory } from '../../models/QualificationCriteria.js'
import type { CampaignStatus, CampaignChannel } from '../../models/ReactivationCampaign.js'

export interface QualificationCriteriaDto {
  id: string
  category: CriteriaCategory
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
  order: number
}

export interface ReactivationCampaignDto {
  id: string
  name: string
  status: CampaignStatus
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  totalLeads: number
  contactedCount: number
  engagedCount: number
  convertedCount: number
  lastExecutedAt?: string
}

export interface SpeedToLeadMetricDto {
  medianResponseSeconds: number
  sub30sRatePercent: number
  engagementRatePercent: number
  qualificationConversionRatePercent: number
  totalAiConversations: number
}

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

export interface CreateCampaignInput {
  name: string
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  totalLeads?: number
}

export interface UpdateCriteriaInput {
  isRequired?: boolean
  promptDirective?: string
  options?: string[]
}
