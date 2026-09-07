import React, { useState } from 'react'
import type { ConversationThread } from '@/types/communication'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useAppSelector } from '@/store/hooks'

interface ConversationListProps {
  conversations: ConversationThread[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  selectedChannelFilter: string
  onChannelFilterChange: (channel: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onStartNewConversation?: () => void
  onOpenBroadcast?: () => void
  isMobileChatActive?: boolean
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  selectedChannelFilter: _selectedChannelFilter,
  onChannelFilterChange: _onChannelFilterChange,
  searchQuery,
  onSearchQueryChange,
  onStartNewConversation,
  onOpenBroadcast,
}) => {
  const currentUser = useAppSelector((state) => state.auth.user)
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all')

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()

    if (isYesterday) return 'Yesterday'
    return d.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' })
  }

  const currentUserName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    : ''

  const userInitials = currentUser
    ? `${currentUser.firstName?.[0] || ''}${currentUser.lastName?.[0] || ''}`.toUpperCase() || 'ME'
    : 'ME'

  // Filter conversations according to search & WhatsApp filter pills
  const filteredConversations = conversations.filter((thread) => {
    if (activeFilterTab === 'unread') {
      return (thread.unreadCount || 0) > 0
    }
    if (activeFilterTab === 'favorites') {
      return (thread.leadScore ?? 0) >= 80
    }
    return true
  })

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222d34] w-full md:w-[340px] lg:w-[380px] xl:w-[400px] shrink-0 select-none relative">
      {/* ═══════ WhatsApp App Bar / Top Header ═══════ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] z-10 shrink-0">
        {/* User Profile Avatar */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-[#00a884] text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-xs"
            title={currentUserName || 'My Profile'}
          >
            {userInitials}
          </div>
          <span className="font-bold text-base text-[#111b21] dark:text-[#e9edef] md:hidden">
            WhatsApp
          </span>
        </div>

        {/* WhatsApp Header Icons */}
        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
          {/* Status / Channels icon */}
          <button
            type="button"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Status"
          >
            <MaterialIcon name="donut_large" size={20} />
          </button>

          {/* Broadcast / Campaign icon */}
          {onOpenBroadcast && (
            <button
              type="button"
              onClick={onOpenBroadcast}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="New Broadcast List"
            >
              <MaterialIcon name="campaign" size={20} />
            </button>
          )}

          {/* New Chat icon */}
          {onStartNewConversation && (
            <button
              type="button"
              onClick={onStartNewConversation}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="New Chat"
            >
              <MaterialIcon name="chat" size={20} />
            </button>
          )}

          {/* WhatsApp Menu (three vertical dots) */}
          <button
            type="button"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Menu"
          >
            <MaterialIcon name="more_vert" size={20} />
          </button>
        </div>
      </div>

      {/* ═══════ WhatsApp Search & Filter Bar ═══════ */}
      <div className="px-3 py-2 bg-white dark:bg-[#111b21] space-y-2 border-b border-[#e9edef] dark:border-[#222d34]">
        {/* Search Input Box */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:bg-white dark:focus-within:bg-[#111b21] focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
            <MaterialIcon
              name="search"
              size={18}
              className="text-[#54656f] dark:text-[#aebac1] shrink-0 mr-2"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-transparent text-xs text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white"
              >
                <MaterialIcon name="close" size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg text-[#54656f] dark:text-[#aebac1] hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors"
            title="Filter unread chats"
            onClick={() => setActiveFilterTab(activeFilterTab === 'unread' ? 'all' : 'unread')}
          >
            <MaterialIcon
              name="filter_list"
              size={20}
              className={activeFilterTab === 'unread' ? 'text-[#00a884]' : ''}
            />
          </button>
        </div>

        {/* WhatsApp Filter Pill Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setActiveFilterTab('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'all'
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#008069] dark:text-[#00a884] font-semibold'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#222d34]'
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('unread')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'unread'
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#008069] dark:text-[#00a884] font-semibold'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#222d34]'
            }`}
          >
            Unread
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('favorites')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'favorites'
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#008069] dark:text-[#00a884] font-semibold'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#222d34]'
            }`}
          >
            Favorites
          </button>

          <button
            type="button"
            onClick={() => setActiveFilterTab('groups')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
              activeFilterTab === 'groups'
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#008069] dark:text-[#00a884] font-semibold'
                : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#222d34]'
            }`}
          >
            Groups
          </button>
        </div>
      </div>

      {/* ═══════ WhatsApp Chat Thread Rows ═══════ */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e9edef]/60 dark:divide-[#222d34]">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8696a0] space-y-3">
            <MaterialIcon name="chat" size={40} className="mx-auto text-[#8696a0]/50" />
            <p>No chats found.</p>
            {onStartNewConversation && (
              <button
                type="button"
                onClick={onStartNewConversation}
                className="px-4 py-1.5 rounded-full bg-[#00a884] text-white text-xs font-bold shadow-xs hover:bg-[#008f6f] transition-colors"
              >
                Start new chat
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((thread) => {
            const isSelected = selectedConversationId === thread.id
            const lastMsg = thread.lastMessage || {
              body: (thread as any).lastMessageText || '',
              createdAt:
                (thread as any).lastMessageAt ||
                (thread as any).updatedAt ||
                new Date().toISOString(),
              senderType: 'agent' as const,
              channel: thread.lastChannel || 'whatsapp',
              direction: 'outbound' as const,
            }

            const isOutbound =
              lastMsg.direction === 'outbound' ||
              lastMsg.senderType === 'agent' ||
              lastMsg.senderType === 'ai_isa'

            const contactInitials = (thread.contactName || 'Lead')
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            const hasUnread = (thread.unreadCount || 0) > 0

            return (
              <div
                key={thread.id}
                onClick={() => onSelectConversation(thread.id)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                    : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'
                }`}
              >
                {/* Contact Avatar with Online Indicator */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-[#6b7c85] text-white font-bold text-sm flex items-center justify-center font-mono shadow-xs">
                    {contactInitials || 'WA'}
                  </div>
                  {thread.aiIsaEnabled && (
                    <span
                      className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00a884] border-2 border-white dark:border-[#111b21]"
                      title="AI ISA Active"
                    />
                  )}
                </div>

                {/* Chat Details Column */}
                <div className="flex-1 min-w-0 border-b border-transparent">
                  {/* Top row: Name & Timestamp */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[13px] text-[#111b21] dark:text-[#e9edef] truncate">
                      {thread.contactName || thread.contactPhone || 'WhatsApp Lead'}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 font-mono ${
                        hasUnread
                          ? 'text-[#00a884] font-bold'
                          : 'text-[#667781] dark:text-[#8696a0]'
                      }`}
                    >
                      {formatTimestamp(
                        lastMsg.createdAt || (thread as any).updatedAt || new Date().toISOString()
                      )}
                    </span>
                  </div>

                  {/* Bottom row: Message Snippet & Double Checks & Unread Badge */}
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <div className="flex items-center gap-1 min-w-0 text-xs text-[#667781] dark:text-[#8696a0] truncate">
                      {/* WhatsApp Double Blue Ticks if Outbound */}
                      {isOutbound && (
                        <MaterialIcon
                          name="done_all"
                          size={15}
                          className="text-[#53bdeb] shrink-0"
                        />
                      )}
                      <span className="truncate leading-tight">
                        {lastMsg.body || 'Tap to view chat'}
                      </span>
                    </div>

                    {/* Unread Counter Badge */}
                    {hasUnread && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#00a884] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══════ Mobile Floating Action Button (FAB) for New Chat ═══════ */}
      {onStartNewConversation && (
        <button
          type="button"
          onClick={onStartNewConversation}
          className="fixed md:hidden bottom-6 right-6 w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xl flex items-center justify-center z-30 active:scale-95 transition-transform cursor-pointer"
          title="New Chat"
        >
          <MaterialIcon name="chat" size={24} />
        </button>
      )}
    </div>
  )
}

export const WhatsAppConversationList = ConversationList

