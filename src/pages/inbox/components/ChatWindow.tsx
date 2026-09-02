import React, { useState, useEffect } from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
  ChannelType,
} from '@/types/communication'
import { WhatsAppChatView } from './WhatsAppChatView'
import { GmailThreadView } from './GmailThreadView'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

interface ChatWindowProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: ChannelType, fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  onOpenDialer?: () => void
  isSending?: boolean
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  isSending = false,
}) => {
  // Mode switcher: 'whatsapp' or 'email'
  const [activeMode, setActiveMode] = useState<'whatsapp' | 'email'>(
    conversation.lastChannel === 'email' ? 'email' : 'whatsapp'
  )

  useEffect(() => {
    if (conversation.lastChannel === 'email') {
      setActiveMode('email')
    } else {
      setActiveMode('whatsapp')
    }
  }, [conversation.id, conversation.lastChannel])

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
      {/* Top Channel / Mode Switcher Pill */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border/60 bg-muted/30 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Inbox Mode:
          </span>
          <div className="inline-flex rounded-xl p-1 bg-muted/60 border border-border/70">
            <button
              type="button"
              onClick={() => setActiveMode('whatsapp')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>WhatsApp Web</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('email')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeMode === 'email'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <EnvelopeIcon className="w-3.5 h-3.5" />
              <span>Gmail Inbox</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground hidden sm:block">
          {activeMode === 'whatsapp' ? (
            <span className="text-emerald-500 font-semibold">⚡ Connected to Meta Cloud API</span>
          ) : (
            <span className="text-blue-500 font-semibold">⚡ Connected to Gmail IMAP Listener</span>
          )}
        </div>
      </div>

      {/* Render Mode-Specific View */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeMode === 'whatsapp' ? (
          <WhatsAppChatView
            conversation={conversation}
            messages={messages}
            quickTemplates={quickTemplates}
            onSendMessage={(text, ch, flags) => onSendMessage(text, ch, flags)}
            onOpenCopilot={onOpenCopilot}
            isSending={isSending}
          />
        ) : (
          <GmailThreadView
            conversation={conversation}
            messages={messages}
            quickTemplates={quickTemplates}
            onSendMessage={(text, ch, flags) => onSendMessage(text, ch, flags)}
            onOpenCopilot={onOpenCopilot}
            isSending={isSending}
          />
        )}
      </div>
    </div>
  )
}
