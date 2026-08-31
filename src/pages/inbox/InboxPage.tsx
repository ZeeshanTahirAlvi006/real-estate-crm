import { useState, useEffect } from 'react'
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useToggleAiIsaMutation,
  useGetQuickTemplatesQuery,
} from '@/store/api/communicationApi'
import { ConversationList } from './components/ConversationList'
import { ChatWindow } from './components/ChatWindow'
import { ContactInfoPane } from './components/ContactInfoPane'
import { StartConversationModal } from './components/StartConversationModal'
import { WhatsAppBroadcastModal } from './components/WhatsAppBroadcastModal'
import { CopilotDrawer } from '@/components/ai-copilot/CopilotDrawer'
import { useSocket } from '@/providers/SocketProvider'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChatBubbleLeftRightIcon, PlusIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import type { ChannelType } from '@/types/communication'
import { toast } from 'sonner'

export function InboxPage() {
  const dispatch = useAppDispatch()
  const { socket } = useSocket()

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)

  // 1. Fetch Conversations List
  const {
    data: conversations = [],
    isLoading: loadingConversations,
  } = useGetConversationsQuery({
    channel: selectedChannelFilter !== 'all' ? selectedChannelFilter : undefined,
    search: searchQuery.trim() || undefined,
  })

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (
      conversations.length > 0 &&
      (!selectedConversationId || !conversations.some((c) => c.id === selectedConversationId))
    ) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  // Join/Leave socket room for active conversation
  useEffect(() => {
    if (!socket || !selectedConversationId) return

    socket.emit('join:conversation', selectedConversationId)

    return () => {
      socket.emit('leave:conversation', selectedConversationId)
    }
  }, [socket, selectedConversationId])

  // 2. Fetch Messages for Selected Conversation
  const {
    data: messages = [],
    isLoading: loadingMessages,
  } = useGetMessagesQuery(selectedConversationId || '', {
    skip: !selectedConversationId,
  })

  // 3. Quick Reply Templates
  const { data: quickTemplates = [] } = useGetQuickTemplatesQuery()

  // 4. Send Message Mutation & Toggle AI ISA
  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation()
  const [toggleAiIsaMutation] = useToggleAiIsaMutation()

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null

  const handleSendMessage = async (
    text: string,
    channel: ChannelType,
    fairHousingFlags?: string[]
  ) => {
    if (!selectedConversationId) return

    try {
      await sendMessageMutation({
        conversationId: selectedConversationId,
        body: text,
        channel,
        fairHousingFlags,
      }).unwrap()
    } catch {
      toast.error('Failed to send message. Please check connection.')
    }
  }

  const handleToggleAiIsa = async (enabled: boolean) => {
    if (!selectedConversationId) return
    try {
      await toggleAiIsaMutation({ conversationId: selectedConversationId, enabled }).unwrap()
      toast.success(enabled ? 'AI ISA Autonomous Mode enabled' : 'AI ISA Autonomous Mode paused')
    } catch {
      toast.error('Failed to update AI ISA status')
    }
  }

  const handleOpenDialerForContact = () => {
    if (!selectedConversation) return
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [
          {
            id: selectedConversation.contactId,
            name: selectedConversation.contactName,
            phone: selectedConversation.contactPhone,
          },
        ],
      })
    )
  }

  const handleOpenCopilot = () => {
    setIsCopilotOpen(true)
  }

  if (loadingConversations && conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-6rem)] rounded-2xl border border-border/80 bg-card overflow-hidden">
        <div className="w-80 border-r border-border/80 p-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-6.5rem)] rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs relative">
      {/* Left Pane: Conversation List */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        selectedChannelFilter={selectedChannelFilter}
        onChannelFilterChange={setSelectedChannelFilter}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onStartNewConversation={() => setIsStartModalOpen(true)}
        onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
      />

      {/* Center Pane: Chat Window */}
      {selectedConversation ? (
        <ChatWindow
          conversation={selectedConversation}
          messages={messages}
          quickTemplates={quickTemplates}
          onSendMessage={handleSendMessage}
          onOpenCopilot={handleOpenCopilot}
          onOpenDialer={handleOpenDialerForContact}
          isSending={isSending || loadingMessages}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-muted/10">
          <div className="p-4 rounded-3xl bg-primary/10 text-primary">
            <ChatBubbleLeftRightIcon className="w-12 h-12" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">No Conversation Selected</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Select a thread from the left or initiate a new conversation or WhatsApp broadcast with any contact in your directory.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsStartModalOpen(true)}
              className="text-xs font-bold gap-1.5 rounded-xl shadow-sm"
            >
              <PlusIcon className="w-4 h-4" /> Start New Conversation
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsBroadcastModalOpen(true)}
              className="text-xs font-semibold gap-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <MegaphoneIcon className="w-4 h-4" /> WhatsApp Broadcast
            </Button>
          </div>
        </div>
      )}

      {/* Right Pane: Contact Info / Details */}
      {selectedConversation && (
        <ContactInfoPane
          conversation={selectedConversation}
          onOpenDialerForContact={handleOpenDialerForContact}
          onOpenCopilot={handleOpenCopilot}
        />
      )}

      {/* AI Copilot Drawer */}
      {selectedConversation && (
        <CopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          conversation={selectedConversation}
          onApplyDraft={(draftText) =>
            handleSendMessage(draftText, selectedConversation.lastChannel)
          }
          onToggleAiIsa={handleToggleAiIsa}
        />
      )}

      {/* Start Conversation Modal */}
      <StartConversationModal
        open={isStartModalOpen}
        onOpenChange={setIsStartModalOpen}
        onConversationCreated={(id) => {
          setSelectedConversationId(id)
        }}
        quickTemplates={quickTemplates}
      />

      {/* WhatsApp Broadcast Modal */}
      <WhatsAppBroadcastModal
        open={isBroadcastModalOpen}
        onOpenChange={setIsBroadcastModalOpen}
      />
    </div>
  )
}
