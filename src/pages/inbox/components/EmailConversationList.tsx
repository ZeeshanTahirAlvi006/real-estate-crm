import React, { useState } from 'react'
import type { ConversationThread } from '@/types/communication'
import {
  StarIcon as StarOutlineIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PaperClipIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

interface EmailConversationListProps {
  conversations: ConversationThread[]
  selectedConversationId: string | null
  onSelectConversation: (id: string) => void
  searchQuery: string
  onSearchQueryChange: (q: string) => void
  onComposeEmail?: () => void
  isMobileChatActive?: boolean
}

type EmailFolderTab = 'all' | 'unread' | 'starred' | 'sent'

export const EmailConversationList: React.FC<EmailConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery,
  onSearchQueryChange,
  onComposeEmail,
}) => {
  const [activeTab, setActiveTab] = useState<EmailFolderTab>('all')
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({})

  const toggleStar = (e: React.MouseEvent, id: string, initialStarred: boolean) => {
    e.stopPropagation()
    setStarredMap((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? !prev[id] : !initialStarred,
    }))
  }

  const formatEmailDate = (dateStr: string) => {
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
    const isStarred = starredMap[thread.id] ?? thread.isStarred
    if (activeTab === 'unread') {
      return (thread.unreadCount || 0) > 0
    }
    if (activeTab === 'starred') {
      return Boolean(isStarred)
    }
    if (activeTab === 'sent') {
      return thread.lastMessage?.senderType === 'agent'
    }
    return true
  })

  const unreadTotal = conversations.filter((c) => (c.unreadCount || 0) > 0).length

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#182026] border-r border-slate-200 dark:border-slate-800 w-full md:w-[340px] lg:w-[380px] xl:w-[410px] shrink-0 select-none relative">
      {/* ═══════ Email Header & Compose Bar ═══════ */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#131a1f] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <EnvelopeIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                Mailbox
                {unreadTotal > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                    {unreadTotal}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">IMAP / SMTP Synced</p>
            </div>
          </div>

          {/* Compose Email Button */}
          {onComposeEmail && (
            <button
              type="button"
              onClick={onComposeEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Compose New Email"
            >
              <PencilSquareIcon className="w-3.5 h-3.5" />
              <span>Compose</span>
            </button>
          )}
        </div>

        {/* Search Email Input */}
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search email threads & contacts..."
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-xs bg-white dark:bg-[#1a232a] border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
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

        {/* Email Folder Filters */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-medium pt-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Inbox
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('unread')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'unread'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('starred')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'starred'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <StarSolidIcon className="w-3 h-3 text-amber-400" />
            <span>Starred</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Sent
          </button>
        </div>
      </div>

      {/* ═══════ Email Threads List ═══════ */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
            <EnvelopeIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <p>No email threads found in {activeTab}.</p>
            {onComposeEmail && (
              <button
                type="button"
                onClick={onComposeEmail}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition-colors"
              >
                Compose Email
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((thread) => {
            const isSelected = selectedConversationId === thread.id
            const isStarred = starredMap[thread.id] ?? thread.isStarred
            const hasUnread = (thread.unreadCount || 0) > 0
            const lastMsg = thread.lastMessage || {
              body: (thread as any).lastMessageText || '',
              createdAt: (thread as any).updatedAt || new Date().toISOString(),
              senderType: 'agent',
            }

            const subject =
              (thread as any).subject ||
              `Re: Consultation & Property Details — ${thread.contactName || 'Lead'}`

            const contactInitials = (thread.contactName || 'Lead')
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={thread.id}
                onClick={() => onSelectConversation(thread.id)}
                className={`flex items-start gap-2.5 px-3.5 py-3 cursor-pointer transition-colors relative border-l-3 ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/25 border-l-blue-600'
                    : hasUnread
                      ? 'bg-white dark:bg-[#182026] hover:bg-slate-50 dark:hover:bg-[#1f2933] border-l-blue-500 font-semibold'
                      : 'bg-white dark:bg-[#182026] hover:bg-slate-50/70 dark:hover:bg-[#1c242c] border-l-transparent text-slate-600 dark:text-slate-300'
                }`}
              >
                {/* Star Action */}
                <button
                  type="button"
                  onClick={(e) => toggleStar(e, thread.id, thread.isStarred)}
                  className="mt-0.5 text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-400 transition-colors shrink-0"
                  title={isStarred ? 'Unstar' : 'Star'}
                >
                  {isStarred ? (
                    <StarSolidIcon className="w-4 h-4 text-amber-400" />
                  ) : (
                    <StarOutlineIcon className="w-4 h-4" />
                  )}
                </button>

                {/* Avatar with Initials */}
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {contactInitials || 'EM'}
                </div>

                {/* Email Info Content */}
                <div className="flex-1 min-w-0">
                  {/* Top Row: Sender & Timestamp */}
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs truncate ${
                        hasUnread
                          ? 'font-bold text-slate-900 dark:text-slate-100'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {thread.contactName || thread.contactEmail || 'Client'}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 font-mono ${
                        hasUnread
                          ? 'text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {formatEmailDate(lastMsg.createdAt)}
                    </span>
                  </div>

                  {/* Subject Line */}
                  <div
                    className={`text-xs truncate mt-0.5 ${
                      hasUnread
                        ? 'font-bold text-slate-900 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    {subject}
                  </div>

                  {/* Snippet & Badges */}
                  <div className="flex items-center justify-between gap-1.5 mt-0.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight flex-1">
                      {lastMsg.body || 'No message content'}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {(thread as any).hasAttachments && (
                        <PaperClipIcon className="w-3 h-3 text-slate-400" />
                      )}
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
                      )}
                    </div>
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
