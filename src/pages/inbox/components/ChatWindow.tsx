import React from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
  ChannelType,
} from '@/types/communication'
import { WhatsAppChatView } from './WhatsAppChatView'
import { GmailThreadView } from './GmailThreadView'
import { UnifiedChatView } from './UnifiedChatView'

interface ChatWindowProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: ChannelType, fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  onOpenDialer?: () => void
  onBackToList?: () => void
  onToggleContactInfo?: () => void
  isSending?: boolean
  channelFilter?: string
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  onBackToList,
  onToggleContactInfo,
  isSending = false,
  channelFilter = 'whatsapp',
}) => {
  if (channelFilter === 'email') {
    return (
      <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
        <GmailThreadView
          conversation={conversation}
          messages={messages}
          quickTemplates={quickTemplates}
          onSendMessage={(text, ch, flags) => onSendMessage(text, ch, flags)}
          onOpenCopilot={onOpenCopilot}
          isSending={isSending}
        />
      </div>
    )
  }

  if (channelFilter === 'all') {
    return (
      <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
        <UnifiedChatView
          conversation={conversation}
          messages={messages}
          quickTemplates={quickTemplates}
          onSendMessage={onSendMessage}
          onOpenCopilot={onOpenCopilot}
          onBackToList={onBackToList}
          onToggleContactInfo={onToggleContactInfo}
          isSending={isSending}
        />
      </div>
    )
  }

  // Default: Dedicated WhatsApp Web Chat View
  return (
    <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
      <WhatsAppChatView
        conversation={conversation}
        messages={messages}
        quickTemplates={quickTemplates}
        onSendMessage={(text, ch, flags) => onSendMessage(text, ch, flags)}
        onOpenCopilot={onOpenCopilot}
        onBackToList={onBackToList}
        onToggleContactInfo={onToggleContactInfo}
        isSending={isSending}
      />
    </div>
  )
}

