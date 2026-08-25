import React, { useState } from 'react'
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useToggleAiIsaMutation,
  useGetQuickTemplatesQuery,
} from '@/store/api/communicationApi'
import { useAppDispatch } from '@/store/hooks'
import { openDialer } from '@/store/slices/dialerSlice'
import { ConversationList } from './components/ConversationList'
import { ChatWindow } from './components/ChatWindow'
import { ContactInfoPane } from './components/ContactInfoPane'
import { CopilotDrawer } from '@/components/ai-copilot/CopilotDrawer'
import type { ChannelType } from '@/types/communication'
import { toast } from 'sonner'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export const InboxPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConvId, setSelectedConvId] = useState<string | null>('conv-1')
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)

  const { data: conversations = [] } = useGetConversationsQuery({
    channel: selectedChannelFilter,
    search: searchQuery,
  })

  const activeConversation =
    conversations.find((c) => c.id === selectedConvId) || conversations[0] || null

  const { data: messages = [] } = useGetMessagesQuery(
    activeConversation?.id ?? '',
    { skip: !activeConversation }
  )

  const { data: quickTemplates = [] } = useGetQuickTemplatesQuery()
  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation()
  const [toggleAiIsaMutation] = useToggleAiIsaMutation()

  const handleSendMessage = async (text: string, channel: ChannelType, flags?: string[]) => {
    if (!activeConversation) return

    try {
      await sendMessageMutation({
        conversationId: activeConversation.id,
        body: text,
        channel,
        fairHousingFlags: flags,
      }).unwrap()

      toast.success(`Message sent via ${channel.toUpperCase()}`)
    } catch (err) {
      toast.error('Failed to send message')
    }
  }

  const handleToggleAiIsa = async (enabled: boolean) => {
    if (!activeConversation) return
    try {
      await toggleAiIsaMutation({
        conversationId: activeConversation.id,
        enabled,
      }).unwrap()
      toast.success(`AI ISA ${enabled ? 'activated' : 'paused'} for ${activeConversation.contactName}`)
    } catch (err) {
      toast.error('Failed to update AI ISA status')
    }
  }

  const handleOpenDialer = () => {
    dispatch(openDialer({ lineCount: 3 }))
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6 overflow-hidden bg-background">
      {/* 1. Left: Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={activeConversation?.id || null}
        onSelectConversation={(id) => setSelectedConvId(id)}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={setSelectedChannelFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* 2. Center: Chat Window */}
      {activeConversation ? (
        <ChatWindow
          conversation={activeConversation}
          messages={messages}
          quickTemplates={quickTemplates}
          onSendMessage={handleSendMessage}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenDialer={handleOpenDialer}
          isSending={isSending}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
          <ChatBubbleLeftRightIcon className="w-12 h-12 mb-3 text-muted-foreground/40" />
          <h3 className="text-base font-semibold text-foreground">No Conversation Selected</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Choose a lead thread from the left to start omnichannel messaging across WhatsApp, SMS, and Email.
          </p>
        </div>
      )}

      {/* 3. Right: Contact Info Pane */}
      {activeConversation && (
        <ContactInfoPane
          conversation={activeConversation}
          onOpenDialerForContact={handleOpenDialer}
          onOpenCopilot={() => setIsCopilotOpen(true)}
        />
      )}

      {/* 4. AI Copilot Drawer */}
      {activeConversation && (
        <CopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          conversation={activeConversation}
          onApplyDraft={(text) => handleSendMessage(text, activeConversation.lastChannel)}
          onToggleAiIsa={handleToggleAiIsa}
        />
      )}
    </div>
  )
}
