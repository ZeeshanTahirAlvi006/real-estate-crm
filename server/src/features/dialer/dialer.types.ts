import type { CallDisposition } from '../../models/CallLog.js'

export interface CallLogResponseDto {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  agentId: string
  agentName: string
  durationSeconds: number
  direction: 'inbound' | 'outbound'
  disposition: CallDisposition
  recordingUrl?: string
  liveTranscript?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  aiSummary?: string
  notes?: string
  linesUsed: number
  lineIndex?: number
  createdAt: string
}

export interface VoicemailDropDto {
  id: string
  name: string
  title: string
  audioUrl: string
  durationSeconds: number
  category: 'general' | 'seller_equity' | 'price_drop' | 'followup'
  isDefault: boolean
}

export interface DialerQueueContactDto {
  id: string
  contactId: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  leadScore: number
  leadSource: string
  dncStatus: 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'
  lastContactedAt?: string
  propertyInterest?: string
  notes?: string
  priority: number
}

export interface SaveDispositionInput {
  contactId: string
  contactName: string
  contactPhone: string
  durationSeconds: number
  direction?: 'inbound' | 'outbound'
  disposition: CallDisposition
  notes?: string
  recordingUrl?: string
  liveTranscript?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  aiSummary?: string
  linesUsed?: number
  lineIndex?: number
}

export interface DialerStatsDto {
  totalCallsToday: number
  connectRatePercent: number
  totalTalkTimeSeconds: number
  avgDurationSeconds: number
  dispositionsBreakdown: Record<string, number>
}

export interface EnqueueContactsInput {
  contactIds: string[]
  priority?: number
}
