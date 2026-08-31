import React, { useState, useRef, useEffect } from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
  ChannelType,
} from '@/types/communication'
import { ChannelBadge } from './ChannelBadge'
import { WhatsAppTemplateModal } from './WhatsAppTemplateModal'
import {
  FairHousingWarning,
  checkFairHousingCompliance,
} from '@/components/ai-copilot/FairHousingWarning'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  CheckIcon,
  ShieldExclamationIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentArrowDownIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline'

interface ChatWindowProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: ChannelType, fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  onOpenDialer: () => void
  isSending?: boolean
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  onOpenDialer,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(conversation.lastChannel)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isWhatsAppTemplateModalOpen, setIsWhatsAppTemplateModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    setSelectedChannel(conversation.lastChannel)
  }, [conversation.id, conversation.lastChannel])

  const handleSend = () => {
    if (!inputText.trim() || isSending) return

    const complianceIssues = checkFairHousingCompliance(inputText)
    const flags = complianceIssues.map((c) => c.phrase)

    onSendMessage(inputText.trim(), selectedChannel, flags.length > 0 ? flags : undefined)
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const applyTemplate = (template: QuickReplyTemplate) => {
    let body = template.body
    body = body.replace(/{{firstName}}/g, conversation.contactName.split(' ')[0])
    body = body.replace(/{{propertyAddress}}/g, '742 Evergreen Terrace')
    body = body.replace(/{{neighborhood}}/g, 'West Hills')
    body = body.replace(/{{cmaLink}}/g, 'https://proppulse.io/cma/742-evergreen')
    body = body.replace(/{{agentName}}/g, 'Sarah Jenkins')
    setInputText(body)
    setShowTemplates(false)
  }

  const handleReplaceFairHousing = (original: string, replacement: string) => {
    const regex = new RegExp(original, 'gi')
    setInputText((prev) => prev.replace(regex, replacement))
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isBlockedDNC = conversation.dncStatus === 'opted_out'

  const contactInitials =
    (conversation.contactName || 'Lead')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'L'

  return (
    <div className="flex flex-col flex-1 h-full bg-background relative overflow-hidden">
      {/* Top Conversation Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20">
            {contactInitials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-foreground">
                {conversation.contactName || 'Lead'}
              </h2>
              <ChannelBadge channel={selectedChannel || 'sms'} showLabel />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {conversation.contactPhone || 'No Phone'} • {conversation.contactEmail || 'No Email'}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDialer}
            className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Start Call with Lead"
          >
            <PhoneIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Call</span>
          </button>

          <button
            type="button"
            onClick={onOpenCopilot}
            className="p-2 rounded-xl bg-gradient-to-r from-primary to-chart-3 text-primary-foreground transition-all hover:opacity-90 flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>

      {/* Messages Thread Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.direction === 'outbound'
          const isAI = msg.senderType === 'ai_isa'

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-2xl ${
                isMe ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-muted-foreground">
                <span className="font-medium">
                  {isAI ? 'PropPulse AI ISA' : isMe ? 'Sarah Jenkins (You)' : msg.senderName}
                </span>
                <span>•</span>
                <span>{formatTime(msg.createdAt)}</span>
                <ChannelBadge channel={msg.channel} />
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-full shadow-sm ${
                  isAI
                    ? 'bg-gradient-to-br from-primary/15 via-chart-3/15 to-chart-2/15 text-foreground border border-primary/30 rounded-tr-sm'
                    : isMe
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted/70 text-foreground border border-border/60 rounded-tl-sm'
                }`}
              >
                {isAI && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary mb-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>Autonomous AI Response (&lt;30s speed-to-lead)</span>
                  </div>
                )}

                {/* Media Attachment Rendering */}
                {msg.mediaUrl && (
                  <div className="mb-2">
                    {msg.mediaType === 'image' ? (
                      <img
                        src={msg.mediaUrl}
                        alt="WhatsApp Attachment"
                        className="rounded-lg max-h-48 object-cover border border-white/20"
                      />
                    ) : msg.mediaType === 'audio' ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20">
                        <MusicalNoteIcon className="w-4 h-4" />
                        <span className="text-[11px] font-mono">Voice Message</span>
                        <audio controls src={msg.mediaUrl} className="h-6 w-40" />
                      </div>
                    ) : (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:underline"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span className="text-[11px]">Download Document</span>
                      </a>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-line">{msg.body}</p>

                {msg.fairHousingFlags && msg.fairHousingFlags.length > 0 && (
                  <div className="mt-2 text-[10px] bg-amber-500/20 text-amber-900 dark:text-amber-200 p-1.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <ShieldExclamationIcon className="w-3 h-3 shrink-0" />
                    <span>Flagged phrase: {msg.fairHousingFlags.join(', ')}</span>
                  </div>
                )}
              </div>

              {isMe && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70 pr-1">
                  <CheckIcon className="w-3 h-3" />
                  <span className="capitalize">{msg.status}</span>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="p-4 border-t border-border/60 bg-card/50 backdrop-blur-md space-y-3">
        {/* Fair Housing Real-Time Pre-Send Checker Alert */}
        <FairHousingWarning
          text={inputText}
          onApplyAlternative={handleReplaceFairHousing}
        />

        {/* Quick Templates Drawer / Popover */}
        {showTemplates && (
          <div className="bg-background border border-border/80 rounded-xl p-3 shadow-xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs font-bold text-foreground">Quick Response Templates</span>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="p-2 rounded-lg bg-muted/40 hover:bg-primary/10 hover:border-primary/40 border border-border/40 cursor-pointer transition-all text-xs"
                >
                  <p className="font-semibold text-foreground truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channel Switcher Tabs & Tools */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">Send via:</span>
            {(['whatsapp', 'sms', 'email'] as ChannelType[]).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setSelectedChannel(ch)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedChannel === ch
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {ch === 'whatsapp' ? 'WhatsApp' : ch.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedChannel === 'whatsapp' && (
              <button
                type="button"
                onClick={() => setIsWhatsAppTemplateModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors"
              >
                <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" />
                <span>WhatsApp Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
              <span>Quick Replies</span>
            </button>
          </div>
        </div>

        {/* Textarea Input + Send */}
        {isBlockedDNC ? (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-center text-xs text-destructive font-semibold">
            TCPA Block: This contact has opted out of communication (STOP keyword received). Outbound messaging is disabled.
          </div>
        ) : (
          <div className="relative flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type a ${selectedChannel.toUpperCase()} message to ${conversation.contactName}... (Shift+Enter for new line)`}
              rows={2}
              className="flex-1 resize-none rounded-xl bg-background border border-border/80 p-3 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="h-11 w-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center shadow-md shadow-primary/20 transition-all hover:scale-[1.03] disabled:opacity-50"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Template Modal */}
      <WhatsAppTemplateModal
        open={isWhatsAppTemplateModalOpen}
        onOpenChange={setIsWhatsAppTemplateModalOpen}
        conversation={conversation}
      />
    </div>
  )
}
