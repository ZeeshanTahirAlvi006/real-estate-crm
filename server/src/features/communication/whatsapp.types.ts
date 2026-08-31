export interface WhatsAppTemplateDto {
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

export interface SendWhatsAppInput {
  contactId?: string
  toPhone?: string
  type: 'text' | 'template' | 'media'
  text?: string
  templateName?: string
  languageCode?: string
  templateVariables?: Record<string, string>
  mediaType?: 'image' | 'document' | 'audio' | 'video'
  mediaUrl?: string
  caption?: string
}

export interface WhatsAppBroadcastDto {
  id: string
  title: string
  templateName: string
  targetAudience: string
  targetTag?: string
  recipientCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  status: 'draft' | 'queued' | 'processing' | 'completed' | 'failed'
  createdAt: string
}

export interface CreateBroadcastInput {
  title: string
  templateName: string
  targetAudience: 'all' | 'dormant' | 'high_score' | 'buyers' | 'sellers' | 'custom_tag'
  targetTag?: string
  customVariables?: Record<string, string>
}
