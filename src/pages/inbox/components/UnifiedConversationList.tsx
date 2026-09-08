import React, { useState } from 'react'
import type { ConversationThread } from '@/types/communication'
import { ChannelBadge } from './ChannelBadge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

interface UnifiedConversationListProps {
  conversations: ConversationThread[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onStartConversation?: () => void
  isMobileChatActive?: boolean
}

type ChannelFilterTab = 'all' | 'unread' | 'favorites'

export const UnifiedConversationList: React.FC<UnifiedConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
  onSearchQueryChange,
  onStartConversation,
}) => {
  const [activeChannelTab, setActiveChannelTab] = useState<ChannelFilterTab>('all')

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
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // Filter conversations
  const filteredConversations = conversations.filter((thread) => {
    if (activeChannelTab === 'unread') {
      return (thread.unreadCount || 0) > 0
    }
    if (activeChannelTab === 'favorites') {
      return (thread.leadScore ?? 0) >= 80
    }
    return true
  })

  const whatsAppTotal = conversations.filter((c) => c.lastChannel === 'whatsapp').length
  const emailTotal = conversations.filter((c) => c.lastChannel === 'email').length
  const unreadTotal = conversations.filter((c) => (c.unreadCount || 0) > 0).length

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#151c22] border-r border-slate-200 dark:border-slate-800 w-full md:w-[340px] lg:w-[380px] xl:w-[410px] shrink-0 select-none relative">
      {/* ═══════ Unified Header & Search ═══════ */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#10171d] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                All Channels
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {conversations.length}
                </span>
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {whatsAppTotal} WA
                </span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {emailTotal} Email
                </span>
                {unreadTotal > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-500 font-medium">
                      {unreadTotal} Unread
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Start New Conversation Button */}
          {onStartConversation && (
            <button
              type="button"
              onClick={onStartConversation}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Start New Conversation"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Search All Conversations */}
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search all conversations & leads..."
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-white dark:bg-[#1a232a] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Chips: All, Unread, Hot Leads */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-medium pt-0.5">
          <button
            type="button"
            onClick={() => setActiveChannelTab('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeChannelTab === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveChannelTab('unread')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeChannelTab === 'unread'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setActiveChannelTab('favorites')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeChannelTab === 'favorites'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Hot Leads</span>
          </button>
        </div>
      </div>

      {/* ═══════ Unified Conversation Threads List ═══════ */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
            <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p>No conversations found for selected channel.</p>
            {onStartConversation && (
              <button
                type="button"
                onClick={onStartConversation}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs hover:bg-emerald-700 transition-colors"
              >
                Start Conversation
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((thread) => {
            const isSelected = selectedConversationId === thread.id
            const hasUnread = (thread.unreadCount || 0) > 0
            const lastMsg = thread.lastMessage || {
              body: (thread as any).lastMessageText || '',
              createdAt: (thread as any).updatedAt || new Date().toISOString(),
              senderType: 'agent',
              channel: thread.lastChannel,
            }

            const contactInitials = (thread.contactName || 'Lead')
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            const isHighScore = (thread.leadScore ?? 0) >= 80

            return (
              <div
                key={thread.id}
                onClick={() => onSelectConversation(thread.id)}
                className={`flex items-start gap-3 px-3.5 py-3 cursor-pointer transition-colors relative border-l-3 ${
                  isSelected
                    ? 'bg-slate-100/90 dark:bg-slate-800/60 border-l-emerald-600'
                    : hasUnread
                      ? 'bg-white dark:bg-[#151c22] hover:bg-slate-50 dark:hover:bg-[#1b242b] border-l-emerald-500 font-semibold'
                      : 'bg-white dark:bg-[#151c22] hover:bg-slate-50/70 dark:hover:bg-[#182026] border-l-transparent text-slate-600 dark:text-slate-300'
                }`}
              >
                {/* Avatar with Status & Channel Overlay */}
                <div className="relative shrink-0 mt-0.5">
                  <div
                    className={`w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shadow-xs ${
                      thread.lastChannel === 'whatsapp'
                        ? 'bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25 dark:text-[#25d366]'
                        : 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400'
                    }`}
                  >
                    {contactInitials || 'OM'}
                  </div>

                  {/* Tiny Channel Icon Overlay */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white shadow-xs ${
                      thread.lastChannel === 'whatsapp'
                        ? 'bg-[#25d366]'
                        : 'bg-blue-600'
                    }`}
                    title={thread.lastChannel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  >
                    {thread.lastChannel === 'whatsapp' ? (
                      <MaterialIcon name="chat" size={10} />
                    ) : (
                      <MaterialIcon name="mail" size={10} />
                    )}
                  </span>
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  {/* Top Row: Contact Name & Timestamp */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span
                        className={`text-xs truncate ${
                          hasUnread
                            ? 'font-bold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {thread.contactName || thread.contactPhone || thread.contactEmail || 'Lead'}
                      </span>
                      {isHighScore && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                          {thread.leadScore} 🔥
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] shrink-0 font-mono ${
                        hasUnread
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {formatTimestamp(lastMsg.createdAt)}
                    </span>
                  </div>

                  {/* Second Row: Channel Badge & AI ISA Badge */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <ChannelBadge channel={thread.lastChannel} showLabel={true} />
                    {thread.aiIsaEnabled && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                        <MaterialIcon name="smart_toy" size={11} />
                        <span>AI ISA</span>
                      </span>
                    )}
                  </div>

                  {/* Third Row: Message Snippet & Unread Badge */}
                  <div className="flex items-center justify-between gap-1.5 mt-1">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight flex-1">
                      {lastMsg.body || 'No messages yet'}
                    </p>
                    {hasUnread && (
                      <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
    </div>
  )
}
