export interface QualifyLeadInput {
  leadMessage: string
  contactId?: string
  conversationHistory?: Array<{ role: 'lead' | 'assistant'; text: string }>
  currentCriteriaState?: {
    budget?: string
    timeline?: string
    preApproval?: 'approved' | 'cash' | 'needs_lender' | 'not_started'
    location?: string
    homeToSell?: 'yes' | 'no' | 'selling_first'
  }
}

export interface QualifyLeadResult {
  reply: string
  extractedCriteria: {
    budget?: string
    timeline?: string
    preApproval?: 'approved' | 'cash' | 'needs_lender' | 'not_started'
    location?: string
    homeToSell?: 'yes' | 'no' | 'selling_first'
  }
  isQualified: boolean
  handoffTriggered: boolean
  handoffReason?: string
  fairHousingPassed: boolean
  fairHousingFlags: string[]
  confidenceScore: number
}

export interface DraftResponseInput {
  conversationId?: string
  contactId?: string
  messages: Array<{ sender: string; body: string }>
  intentHint?: string
}

export interface DraftResponseOption {
  title: string
  text: string
  confidence: number
  intent: string
}

export interface DraftResponseResult {
  drafts: DraftResponseOption[]
}

export interface SummarizeInput {
  text?: string
  conversationId?: string
  contactId?: string
  messages?: Array<{ sender: string; senderName?: string; body: string }>
}

export interface SummarizeResult {
  summary: string
  keyTakeaways: string[]
  actionItems: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface SuggestNextActionInput {
  contactId?: string
  stage?: string
  leadScore?: number
  daysSinceLastContact?: number
  notes?: string
}

export interface SuggestedActionItem {
  action: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  timeFrame: string
}

export interface SuggestNextActionResult {
  suggestedActions: SuggestedActionItem[]
}

export interface FairHousingCheckInput {
  text: string
}

export interface FairHousingCheckResult {
  hasWarning: boolean
  flaggedPhrases: Array<{
    phrase: string
    reason: string
    replacement: string
    severity: 'high' | 'medium' | 'low'
  }>
  recommendedText?: string
  explanation?: string
}
