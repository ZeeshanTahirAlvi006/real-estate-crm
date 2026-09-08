export interface ConversationDto {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  contactAvatar?: string
  assignedAgentId?: string
  assignedAgentName?: string
  lastMessageText: string
  lastMessageAt: string
  lastChannel: 'sms' | 'whatsapp' | 'email'
  unreadCount: number
  aiIsaEnabled: boolean
  status: 'active' | 'archived' | 'snoozed'
  tags: string[]
  leadScore?: number
  dncStatus?: string
  createdAt: string
  updatedAt: string
}

export interface MessageDto {
  id: string
  conversationId: string
  contactId: string
  sender: 'lead' | 'agent' | 'ai_isa' | 'system'
  senderName: string
  senderId?: string
  channel: 'sms' | 'whatsapp' | 'email'
  body: string
  direction: 'inbound' | 'outbound'
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed'
  fairHousingFlags?: string[]
  createdAt: string
  updatedAt: string
}

export interface SendMessageInput {
  body: string
  channel?: 'sms' | 'whatsapp' | 'email'
  fairHousingFlags?: string[]
}

export interface StartConversationInput {
  contactId: string
  initialMessage?: string
  channel?: 'sms' | 'whatsapp' | 'email'
}

export interface ListConversationsQuery {
  channel?: string
  search?: string
  status?: string
  page?: number
  limit?: number
}
