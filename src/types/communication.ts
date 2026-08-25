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

// ── Multi-Line Parallel Dialer Types ──────────────────────────────────

export type DialerLineCount = 1 | 3 | 5

export type LineState = 'idle' | 'dialing' | 'ringing' | 'connected' | 'busy' | 'no_answer' | 'voicemail_dropped' | 'completed'

export interface DialerLine {
  lineIndex: number
  contactId?: string
  contactName?: string
  contactPhone?: string
  state: LineState
  callDurationSeconds: number
  isMuted: boolean
  isRecording: boolean
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
  firstName: string
  lastName: string
  phone: string
  leadScore: number
  leadSource: string
  dncStatus: DncStatus
  lastContactedAt?: string
  propertyInterest?: string
  notes?: string
}

// ── Sub-30s Omnichannel AI ISA Engine Types ─────────────────────────

export interface QualificationCriteria {
  id: string
  category: 'budget' | 'timeline' | 'pre_approval' | 'location' | 'home_to_sell'
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
}

export interface ReactivationCampaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft' | 'completed'
  targetSegment: string
  channel: ChannelType
  dormantDaysThreshold: number
  totalLeads: number
  contactedCount: number
  respondedCount: number
  responseRatePercent: number
  meetingsBookedCount: number
  createdAt: string
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

// ── AI Copilot Types ─────────────────────────────────────────────────

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
