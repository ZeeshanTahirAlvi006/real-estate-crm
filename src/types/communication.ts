// ── Communication & Omnichannel Inbox Types ─────────────────────────

export type ChannelType = 'whatsapp' | 'sms' | 'email' | 'call'

export type MessageDirection = 'inbound' | 'outbound'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'queued'

export type DncStatus = 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'

export interface MessageAttachment {
  id: string
  url: string
  name: string
  type: 'image' | 'pdf' | 'audio' | 'video'
  sizeBytes: number
}

export interface ConversationMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  senderType: 'agent' | 'lead' | 'ai_isa'
  channel: ChannelType
  direction: MessageDirection
  body: string
  mediaUrl?: string
  mediaType?: string
  attachments?: MessageAttachment[]
  status: MessageStatus
  createdAt: string
  aiGenerated?: boolean
  aiConfidence?: number
  fairHousingFlags?: string[]
}

export interface ConversationThread {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail: string
  contactAvatar?: string
  lastChannel: ChannelType
  unreadCount: number
  isStarred: boolean
  lastMessage: {
    body: string
    createdAt: string
    senderType: 'agent' | 'lead' | 'ai_isa'
    channel: ChannelType
  }
  dncStatus: DncStatus
  aiIsaEnabled: boolean
  leadScore: number
  pipelineStage?: string
  tags: string[]
  assignedAgentName?: string
}

export interface QuickReplyTemplate {
  id: string
  title: string
  channel: ChannelType | 'all'
  category: 'intro' | 'followup' | 'showing' | 'cma' | 'offer'
  body: string
  variables: string[]
}

// ── WhatsApp Cloud API Types ──────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string
  name: string
  title: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE'
  headerText?: string
  bodyText: string
  footerText?: string
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
    text: string
    url?: string
    phoneNumber?: string
  }>
  variables: string[]
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  isDefault: boolean
  createdAt: string
}

export interface WhatsAppBroadcast {
  id: string
  title: string
  templateName: string
  targetAudience: 'all' | 'dormant' | 'high_score' | 'buyers' | 'sellers' | 'custom_tag'
  targetTag?: string
  recipientCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  status: 'draft' | 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
}

export interface LocalPresenceInfo {
  areaCode: string
  city: string
  state: string
  metro: string
  callerIdPhone: string
  callerIdFormatted: string
  isExactMatch: boolean
}

// ── Multi-Line Parallel Dialer Types ──────────────────────────────────

export type DialerLineCount = 1 | 3 | 5

export type LineState =
  | 'idle'
  | 'dialing'
  | 'ringing'
  | 'connected'
  | 'busy'
  | 'no_answer'
  | 'voicemail_dropped'
  | 'completed'

export interface DialerLine {
  lineIndex: number
  contactId?: string
  contactName?: string
  contactPhone?: string
  state: LineState
  callDurationSeconds: number
  isMuted: boolean
  isRecording: boolean
  localPresence?: LocalPresenceInfo
}

export type CallDisposition =
  | 'interested'
  | 'showing_requested'
  | 'nurture_long_term'
  | 'wrong_number'
  | 'not_interested'
  | 'dnc_requested'
  | 'voicemail_left'
  | 'call_back_later'
  | 'no_answer'

export interface CallLog {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  durationSeconds: number
  direction: MessageDirection
  disposition: CallDisposition
  recordingUrl?: string
  liveTranscript?: string
  sentiment: 'positive' | 'neutral' | 'negative'
  aiSummary?: string
  linesUsed: DialerLineCount
  createdAt: string
  agentName: string
}

export interface VoicemailAudioDrop {
  id: string
  title: string
  audioUrl: string
  durationSeconds: number
  category: 'general' | 'seller_equity' | 'price_drop' | 'followup'
}

export interface DialerQueueContact {
  id: string
  contactId?: string
  firstName: string
  lastName: string
  phone: string
  leadScore: number
  leadSource: string
  dncStatus: DncStatus
  lastContactedAt?: string
  propertyInterest?: string
  notes?: string
  priority?: number
  localPresence?: LocalPresenceInfo
}

// Sub-30s Omnichannel AI ISA Engine Types 

export interface AiIsaConfig {
  brokerageId: string
  isEnabled: boolean
  persona: {
    name: string
    tone: 'professional' | 'friendly' | 'concise' | 'consultative'
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

export interface QualificationCriteria {
  id: string
  category: 'budget' | 'timeline' | 'pre_approval' | 'location' | 'home_to_sell'
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
  order?: number
}

export interface ReactivationCampaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft' | 'completed'
  targetSegment: string
  channel: ChannelType
  messageTemplate: string
  dormantDaysThreshold: number
  totalLeads: number
  contactedCount: number
  respondedCount: number
  engagedCount: number
  convertedCount: number
  responseRatePercent: number
  meetingsBookedCount: number
  createdAt: string
  lastExecutedAt?: string
  lastRunAt?: string
}

export interface CampaignMetrics {
  campaignId: string
  name: string
  status: 'active' | 'paused' | 'draft' | 'completed'
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

export interface SpeedToLeadMetric {
  channel: ChannelType
  avgResponseTimeSeconds: number
  sub30sConversionRatePercent: number
  totalInboundLeadsToday: number
  aiAutonomousHandledCount: number
  warmTransfersCount: number
}

// AI Copilot Types 

export interface CopilotSuggestion {
  id: string
  conversationId: string
  suggestedText: string
  intent: 'schedule_showing' | 'answer_pricing' | 'request_preapproval' | 'send_cma' | 'confirm_availability'
  confidenceScore: number
  reasoning: string
}

export interface FairHousingCheckResult {
  hasWarning: boolean
  flaggedPhrases: string[]
  recommendedAlternative?: string
  explanation?: string
}

export interface WhatsAppTenantConfig {
  wabaId: string
  phoneNumberId: string
  displayPhoneNumber: string
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  tier: 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED'
  status: 'connected' | 'disconnected' | 'pending'
  verifiedName: string
  lastTestedAt: string | null
  hasTokenConfigured: boolean
  isUsingSystemFallback: boolean
}

export interface UnifiedSendPayload {
  channel: ChannelType
  to: string
  subject?: string
  text: string
  html?: string
  contactId?: string
  conversationId?: string
  mediaUrl?: string
  mediaType?: 'image' | 'document' | 'audio' | 'video'
  templateName?: string
  templateVariables?: Record<string, string>
}

export interface DncCheckResponse {
  phone: string
  isClean: boolean
  dncStatus: DncStatus
  canCall: boolean
  canText: boolean
  safeCallingHours: {
    start: string
    end: string
    isCurrentlySafe: boolean
  }
  reason?: string
  checkedAt: string
}
