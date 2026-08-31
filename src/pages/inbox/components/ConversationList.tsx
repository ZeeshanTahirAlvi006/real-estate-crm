import React from 'react'
import type { ConversationThread } from '@/types/communication'
import { ChannelBadge } from './ChannelBadge'
import { Button } from '@/components/ui/button'
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MegaphoneIcon,
} from '@heroicons/react/24/outline'

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
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  selectedChannelFilter,
  onChannelFilterChange,
  searchQuery,
  onSearchQueryChange,
  onStartNewConversation,
  onOpenBroadcast,
}) => {
  const channelTabs = [
    { id: 'all', label: 'All Channels' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'sms', label: 'SMS' },
    { id: 'email', label: 'Email' },
  ]

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border/80 w-full md:w-80 lg:w-96 shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Omnichannel Inbox</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {conversations.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenBroadcast && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenBroadcast}
                className="h-8 px-2 text-xs font-semibold gap-1 rounded-xl text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20"
                title="Launch WhatsApp Broadcast"
              >
                <MegaphoneIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Broadcast</span>
              </Button>
            )}

            {onStartNewConversation && (
              <Button
                size="sm"
                onClick={onStartNewConversation}
                className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl shadow-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>New</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search leads, phone, or messages..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {channelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChannelFilterChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedChannelFilter === tab.id
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-3">
            <p>No conversations found for this filter.</p>
            {onStartNewConversation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartNewConversation}
                className="text-xs font-semibold gap-1.5 rounded-xl mx-auto"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Start Conversation
              </Button>
            )}
          </div>
        ) : (
          conversations.map((thread) => {
            const isSelected = selectedConversationId === thread.id
            const lastMsg = thread.lastMessage || {
              body: (thread as any).lastMessageText || '',
              createdAt:
                (thread as any).lastMessageAt ||
                (thread as any).updatedAt ||
                new Date().toISOString(),
              senderType: 'agent',
              channel: thread.lastChannel || 'sms',
            }
            const isAI = lastMsg?.senderType === 'ai_isa'

            return (
              <div
                key={thread.id}
                onClick={() => onSelectConversation(thread.id)}
                className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 relative ${
                  isSelected
                    ? 'bg-primary/10 border-l-4 border-l-primary'
                    : 'hover:bg-muted/40'
                }`}
              >
                {/* Contact name, score, and timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {thread.contactName}
                    </span>
                    {thread.dncStatus === 'opted_out' ? (
                      <span
                        className="text-[10px] text-destructive flex items-center gap-0.5"
                        title="TCPA Opted Out"
                      >
                        <ExclamationCircleIcon className="w-3 h-3" />
                      </span>
                    ) : (
                      <span
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"
                        title="TCPA Clean"
                      >
                        <ShieldCheckIcon className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(
                      lastMsg?.createdAt || (thread as any).updatedAt || new Date().toISOString()
                    )}
                  </span>
                </div>

                {/* Last message snippet */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {isAI && (
                    <span className="text-primary font-semibold inline-flex items-center gap-0.5 mr-1">
                      <SparklesIcon className="w-3 h-3 inline" /> AI:
                    </span>
                  )}
                  {lastMsg?.body || (thread as any).lastMessageText || 'No messages yet'}
                </p>

                {/* Bottom indicators: channel badge, lead score, tags */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <ChannelBadge channel={thread.lastChannel || 'sms'} showLabel />
                    {thread.aiIsaEnabled && (
                      <span className="text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        AI Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Score {thread.leadScore ?? 50}
                    </span>
                    {(thread.unreadCount || 0) > 0 && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
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
