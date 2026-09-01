export type CommunicationChannel = 'email' | 'sms' | 'whatsapp' | 'voice'

export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered'

export interface OutboundMessageOptions {
  to: string
  from?: string
  subject?: string
  text: string
  html?: string
  mediaUrl?: string
  mediaType?: string
  templateName?: string
  templateVariables?: Record<string, string>
  brokerageId?: string
  userId?: string
  contactId?: string
  conversationId?: string
  metadata?: Record<string, any>
}

export interface ProviderSendResult {
  success: boolean
  messageId: string
  channel: CommunicationChannel
  status: DeliveryStatus
  previewUrl?: string // Ethereal Email / Sandbox preview URL
  error?: string
  carrierInfo?: string
  timestamp: string
}

export interface MessageDeliveryStatus {
  messageId: string
  status: DeliveryStatus
  deliveredAt?: string
  error?: string
}

export interface InboundWebhookResult {
  isHandled: boolean
  channel: CommunicationChannel
  from: string
  to?: string
  body?: string
  messageId?: string
  isOptOut?: boolean
  optOutKeyword?: string
  rawPayload?: any
}

export interface ICommunicationProvider {
  channel: CommunicationChannel
  send(options: OutboundMessageOptions): Promise<ProviderSendResult>
  getStatus(messageId: string): Promise<MessageDeliveryStatus>
  handleWebhook?(payload: any, headers?: Record<string, any>): Promise<InboundWebhookResult>
}
