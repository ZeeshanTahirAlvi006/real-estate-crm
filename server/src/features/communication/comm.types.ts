import { CommunicationChannel } from './providers/ICommunicationProvider.js'

export interface UnifiedSendInput {
  channel: CommunicationChannel
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

export interface QuickTemplateDto {
  id: string
  title: string
  channel: 'all' | 'email' | 'sms' | 'whatsapp'
  category: string
  subject?: string
  body: string
  variables: string[]
}

export interface OptOutInput {
  phone?: string
  email?: string
  contactId?: string
  reason?: string
}

export interface OptBackInInput {
  phone?: string
  email?: string
  contactId?: string
}

export interface DncCheckResult {
  phone: string
  isClean: boolean
  dncStatus: 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'
  reason?: string
  checkedAt: string
}
