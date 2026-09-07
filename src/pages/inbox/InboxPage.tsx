import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useToggleAiIsaMutation,
  useGetQuickTemplatesQuery,
} from '@/store/api/communicationApi'
import { ConversationList } from './components/ConversationList'
import { EmailConversationList } from './components/EmailConversationList'
import { UnifiedConversationList } from './components/UnifiedConversationList'
import { ChatWindow } from './components/ChatWindow'
import { ContactInfoPane } from './components/ContactInfoPane'
import { StartConversationModal } from './components/StartConversationModal'
import { WhatsAppBroadcastModal } from './components/WhatsAppBroadcastModal'
import { CopilotDrawer } from '@/components/ai-copilot/CopilotDrawer'
import { useSocket } from '@/providers/SocketProvider'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Skeleton } from '@/components/ui/skeleton'
import type { ChannelType } from '@/types/communication'
import { toast } from 'sonner'

export function InboxPage() {
  const { socket } = useSocket()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeChannelParam = searchParams.get('channel') || 'whatsapp'
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>(activeChannelParam)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCopilotOpen, setIsCopilotOpen] = useState(false)
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false)

  // Mobile layout state: 'list' | 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  // Keep internal filter state synced when URL param changes
  useEffect(() => {
    const urlChannel = searchParams.get('channel')
    if (urlChannel && urlChannel !== selectedChannelFilter) {
      setSelectedChannelFilter(urlChannel)
    }
  }, [searchParams, selectedChannelFilter])

  const handleChannelSwitch = (channel: string) => {
    setSelectedChannelFilter(channel)
    setSelectedConversationId(null)
    setMobileView('list')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('channel', channel)
      return next
    })
  }

  // 1. Fetch Conversations List for Active Channel
  const {
    data: conversations = [],
    isLoading: loadingConversations,
  } = useGetConversationsQuery({
    channel: selectedChannelFilter !== 'all' ? selectedChannelFilter : undefined,
    search: searchQuery.trim() || undefined,
  })

  // Auto-select first conversation on tablet & desktop if none selected
  useEffect(() => {
    if (
      conversations.length > 0 &&
      (!selectedConversationId || !conversations.some((c) => c.id === selectedConversationId))
    ) {
      // Only auto-select on desktop/tablet (width >= 768)
      if (window.innerWidth >= 768) {
        setSelectedConversationId(conversations[0].id)
      }
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

  // 2. Fetch Messages for Selected Conversation in Active Channel
  const {
    data: messages = [],
    isLoading: loadingMessages,
  } = useGetMessagesQuery(
    {
      conversationId: selectedConversationId || '',
      channel: selectedChannelFilter !== 'all' ? selectedChannelFilter : undefined,
    },
    {
      skip: !selectedConversationId,
    }
  )

  // 3. Quick Reply Templates
  const { data: quickTemplates = [] } = useGetQuickTemplatesQuery()

  // 4. Send Message Mutation & Toggle AI ISA
  const [sendMessageMutation, { isLoading: isSending }] = useSendMessageMutation()
  const [toggleAiIsaMutation] = useToggleAiIsaMutation()

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id)
    setMobileView('chat')
  }

  const handleSendMessage = async (
    text: string,
    channel: ChannelType,
    fairHousingFlags?: string[]
  ) => {
    if (!selectedConversationId) return

    const dispatchChannel =
      selectedChannelFilter === 'whatsapp'
        ? 'whatsapp'
        : selectedChannelFilter === 'email'
          ? 'email'
          : channel

    try {
      await sendMessageMutation({
        conversationId: selectedConversationId,
        body: text,
        channel: dispatchChannel,
        fairHousingFlags,
      }).unwrap()
    } catch {
      toast.error('Failed to send message.')
    }
  }

  const handleToggleAiIsa = async (enabled: boolean) => {
    if (!selectedConversationId) return
    try {
      await toggleAiIsaMutation({ conversationId: selectedConversationId, enabled }).unwrap()
      toast.success(enabled ? 'AI ISA Mode enabled' : 'AI ISA Mode paused')
    } catch {
      toast.error('Failed to update AI ISA status')
    }
  }

  const handleOpenCopilot = () => {
    setIsCopilotOpen(true)
  }

  if (loadingConversations && conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-6rem)] rounded-none md:rounded-2xl border border-[#e9edef] dark:border-[#222d34] bg-white dark:bg-[#111b21] overflow-hidden">
        <div className="w-full md:w-80 border-r border-[#e9edef] dark:border-[#222d34] p-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-16 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-16 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-16 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="hidden md:flex flex-1 p-6 space-y-4 flex-col">
          <Skeleton className="h-14 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-64 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
          <Skeleton className="h-12 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const isWhatsApp = selectedChannelFilter === 'whatsapp'
  const isEmail = selectedChannelFilter === 'email'
  const isAll = selectedChannelFilter === 'all' || (!isWhatsApp && !isEmail)

  return (
    <div className="-m-4 sm:-m-6 h-[calc(100vh-4rem)] flex flex-col bg-[#f0f2f5] dark:bg-[#0c1317] overflow-hidden font-sans select-none">
      {/* ═══════ Top Dedicated Screen Navigation Strip ═══════ */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 text-white z-20 shrink-0 shadow-xs transition-colors ${
          isWhatsApp
            ? 'bg-[#008069] dark:bg-[#202c33]'
            : isEmail
            ? 'bg-blue-600 dark:bg-slate-800'
            : 'bg-slate-800 dark:bg-[#18222d]'
        }`}
      >
        {/* Left: Dedicated Screen Brand & Title */}
        <div className="flex items-center gap-2.5">
          <MaterialIcon
            name={isWhatsApp ? 'chat' : isEmail ? 'mail' : 'forum'}
            size={22}
            className="text-white"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide">
              {isWhatsApp ? 'WhatsApp' : isEmail ? 'Email Inbox' : 'Unified Inbox'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-white/15 text-white">
              {conversations.length}
            </span>
          </div>
        </div>


      </div>

      {/* ═══════ Main Responsive Layout Body ═══════ */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden bg-white dark:bg-[#111b21]">
        {/* ─── PANE 1: Dedicated Channel Conversation List ─── */}
        {/* On Mobile: Hidden when mobileView === 'chat' */}
        {/* On Tablet & Desktop: Always visible as left pane */}
        <div
          className={`${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          } flex-col h-full shrink-0 w-full md:w-[340px] lg:w-[380px] xl:w-[400px] border-r border-[#e9edef] dark:border-[#222d34]`}
        >
          {isEmail ? (
            <EmailConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onComposeEmail={() => setIsStartModalOpen(true)}
              isMobileChatActive={mobileView === 'chat'}
            />
          ) : isAll ? (
            <UnifiedConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onStartConversation={() => setIsStartModalOpen(true)}
              isMobileChatActive={mobileView === 'chat'}
            />
          ) : (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              selectedChannelFilter={selectedChannelFilter}
              onChannelFilterChange={handleChannelSwitch}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onStartNewConversation={() => setIsStartModalOpen(true)}
              onOpenBroadcast={() => setIsBroadcastModalOpen(true)}
              isMobileChatActive={mobileView === 'chat'}
            />
          )}
        </div>

        {/* ─── PANE 2: Chat Canvas / Window ─── */}
        {/* On Mobile: Only visible when mobileView === 'chat' */}
        {/* On Tablet & Desktop: Takes remaining flexible width */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col h-full min-w-0 relative`}
        >
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              quickTemplates={quickTemplates}
              onSendMessage={handleSendMessage}
              onOpenCopilot={handleOpenCopilot}
              onBackToList={() => setMobileView('list')}
              onToggleContactInfo={() => setIsContactInfoOpen(!isContactInfoOpen)}
              isSending={isSending || loadingMessages}
              channelFilter={selectedChannelFilter}
            />
          ) : (
            /* ═══════ Dedicated Splash Screen (Desktop/Tablet) ═══════ */
            <div
              className={`flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-[#f0f2f5] dark:bg-[#222e35] select-none space-y-6 border-b-[6px] ${
                isWhatsApp
                  ? 'border-b-[#00a884]'
                  : isEmail
                  ? 'border-b-blue-600'
                  : 'border-b-slate-800'
              }`}
            >
              {/* Illustration Icon */}
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-sm animate-in fade-in zoom-in-95 duration-200 ${
                  isWhatsApp
                    ? 'bg-[#00a884]/15 text-[#00a884]'
                    : isEmail
                    ? 'bg-blue-500/15 text-blue-600'
                    : 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
                }`}
              >
                <MaterialIcon
                  name={isWhatsApp ? 'chat' : isEmail ? 'mail' : 'forum'}
                  size={56}
                />
              </div>

              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef]">
                  {isWhatsApp ? 'WhatsApp' : isEmail ? 'Email Inbox' : 'Unified Inbox'}
                </h2>
                <p className="text-sm text-[#667781] dark:text-[#8696a0] leading-relaxed">
                  {isWhatsApp
                    ? 'Send and receive WhatsApp messages without keeping your phone online.'
                    : isEmail
                    ? 'Send and receive client emails synchronized directly with your CRM.'
                    : 'Consolidated omnichannel communications across WhatsApp, Email, SMS, and Calls.'}
                </p>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setIsStartModalOpen(true)}
                className={`px-5 py-2 rounded-full text-white text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                  isWhatsApp
                    ? 'bg-[#00a884] hover:bg-[#008f6f]'
                    : isEmail
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'
                }`}
              >
                <MaterialIcon
                  name={isWhatsApp ? 'chat' : isEmail ? 'mail' : 'forum'}
                  size={16}
                />
                <span>
                  {isWhatsApp
                    ? 'Start New WhatsApp Chat'
                    : isEmail
                    ? 'Compose New Email'
                    : 'Start New Conversation'}
                </span>
              </button>

              {/* Encryption / Sync Banner */}
              <div className="flex items-center gap-1.5 text-xs text-[#8696a0] pt-8">
                <MaterialIcon name="lock" size={14} />
                <span>
                  {isWhatsApp ? 'End-to-end encrypted' : 'Encrypted & Synced in Real-Time'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ─── PANE 3: WhatsApp Contact Info Drawer (Desktop/Tablet) ─── */}
        {selectedConversation && isContactInfoOpen && (
          <div className="absolute right-0 top-0 bottom-0 z-30 md:static flex flex-col h-full animate-in slide-in-from-right-4 duration-200 shadow-2xl md:shadow-none">
            <ContactInfoPane
              conversation={selectedConversation}
              onOpenCopilot={handleOpenCopilot}
              onClose={() => setIsContactInfoOpen(false)}
            />
          </div>
        )}
      </div>

      {/* ═══════ AI Copilot Drawer ═══════ */}
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

      {/* ═══════ Start Conversation Modal ═══════ */}
      <StartConversationModal
        open={isStartModalOpen}
        onOpenChange={setIsStartModalOpen}
        onConversationCreated={(id) => {
          setSelectedConversationId(id)
          setMobileView('chat')
        }}
        quickTemplates={quickTemplates}
        defaultChannel={isEmail ? 'email' : 'whatsapp'}
      />

      {/* ═══════ WhatsApp Broadcast Modal ═══════ */}
      <WhatsAppBroadcastModal
        open={isBroadcastModalOpen}
        onOpenChange={setIsBroadcastModalOpen}
      />
    </div>
  )
}
