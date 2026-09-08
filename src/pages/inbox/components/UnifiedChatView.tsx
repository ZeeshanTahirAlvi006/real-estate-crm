import React, { useState, useRef, useEffect } from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
  ChannelType,
} from '@/types/communication'
import { ChannelBadge } from './ChannelBadge'
import {
  FairHousingWarning,
  checkFairHousingCompliance,
} from '@/components/ai-copilot/FairHousingWarning'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  ArrowLeftIcon,
  InformationCircleIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'

interface UnifiedChatViewProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: ChannelType, fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  onBackToList?: () => void
  onToggleContactInfo?: () => void
  isSending?: boolean
}

export const UnifiedChatView: React.FC<UnifiedChatViewProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  onBackToList,
  onToggleContactInfo,
  isSending = false,
}) => {
  // Selected dispatch channel for the next message
  const [dispatchChannel, setDispatchChannel] = useState<ChannelType>(
    conversation.lastChannel === 'email' ? 'email' : 'whatsapp'
  )
  const [inputText, setInputText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keep dispatch channel in sync when conversation changes
  useEffect(() => {
    setDispatchChannel(conversation.lastChannel === 'email' ? 'email' : 'whatsapp')
  }, [conversation.id, conversation.lastChannel])

  const handleSend = () => {
    if (!inputText.trim() || isSending) return

    const complianceIssues = checkFairHousingCompliance(inputText)
    const flags = complianceIssues.map((c) => c.phrase)

    onSendMessage(inputText.trim(), dispatchChannel, flags.length > 0 ? flags : undefined)
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
    body = body.replace(/{{firstName}}/g, conversation.contactName.split(' ')[0] || 'Client')
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
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const contactInitials =
    (conversation.contactName || 'Lead')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'UN'

  const isBlockedDNC = conversation.dncStatus === 'opted_out'

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 dark:bg-[#11171d] text-foreground relative overflow-hidden font-sans">
      {/* ═══════ Unified Top Header Bar ═══════ */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#182026] border-b border-slate-200 dark:border-slate-800 z-10 shrink-0 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to conversation list"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}

          {/* Contact Avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {contactInitials}
            </div>
            {conversation.aiIsaEnabled && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#182026]"
                title="AI ISA Active"
              />
            )}
          </div>

          {/* Contact Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {conversation.contactName || 'Lead Profile'}
              </h2>
              {conversation.leadScore !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  Score: {conversation.leadScore}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {conversation.contactPhone && <span>{conversation.contactPhone}</span>}
              {conversation.contactPhone && conversation.contactEmail && <span>•</span>}
              {conversation.contactEmail && <span className="truncate">{conversation.contactEmail}</span>}
            </div>
          </div>
        </div>

        {/* Right Actions: AI Copilot & Info Pane Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCopilot}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white flex items-center gap-1.5 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="Open AI Copilot Assistant"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Copilot</span>
          </button>

          {onToggleContactInfo && (
            <button
              type="button"
              onClick={onToggleContactInfo}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Contact Details"
            >
              <InformationCircleIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ═══════ Multi-Channel Messages Timeline ═══════ */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Channel Indicator Banner */}
        <div className="flex justify-center my-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Unified Multi-Channel Interaction History</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500 space-y-2">
            <p>No messages yet in this unified thread.</p>
            <p className="text-[11px]">Send a WhatsApp message or an Email below to start.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.direction === 'outbound'
            const isAI = msg.senderType === 'ai_isa'
            const isEmailMsg = msg.channel === 'email'
            const prevMsg = messages[index - 1]
            const showDateHeader =
              !prevMsg ||
              new Date(msg.createdAt).toDateString() !==
                new Date(prevMsg.createdAt).toDateString()

            return (
              <React.Fragment key={msg.id || index}>
                {showDateHeader && (
                  <div className="flex justify-center my-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                      {formatDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* If it's an Email message, render as an Email Card */}
                {isEmailMsg ? (
                  <div
                    className={`flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    } max-w-2xl mx-auto w-full`}
                  >
                    <div className="w-full rounded-xl border border-blue-200 dark:border-blue-900/40 bg-white dark:bg-[#182026] p-3.5 shadow-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <ChannelBadge channel="email" showLabel={true} />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {isMe ? 'You (via Email)' : `${msg.senderName || 'Contact'} (via Email)`}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {msg.body}
                      </div>

                      {/* AI ISA attribution if applicable */}
                      {isAI && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 pt-1">
                          <MaterialIcon name="auto_awesome" size={12} />
                          <span>Sent automatically by AI ISA</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* If it's a WhatsApp / Chat message, render as chat bubble with channel badge */
                  <div
                    className={`flex flex-col ${
                      isMe ? 'items-end' : 'items-start'
                    } max-w-xl ${isMe ? 'ml-auto' : 'mr-auto'}`}
                  >
                    <div
                      className={`relative px-3.5 py-2 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                        isMe
                          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-tr-none'
                          : 'bg-white dark:bg-[#1e272e] text-slate-900 dark:text-slate-100 rounded-tl-none border border-slate-200/70 dark:border-transparent'
                      }`}
                    >
                      {/* Channel & AI indicator */}
                      <div className="flex items-center gap-1.5 text-[10px] font-bold mb-1">
                        <ChannelBadge
                          channel={msg.channel || 'whatsapp'}
                          className="text-[9px] px-1.5 py-0"
                          showLabel={true}
                        />
                        {isAI && (
                          <span className="text-[#008069] dark:text-[#25d366] flex items-center gap-0.5">
                            <MaterialIcon name="auto_awesome" size={11} />
                            <span>AI ISA</span>
                          </span>
                        )}
                      </div>

                      {/* Media attachments */}
                      {msg.mediaUrl && (
                        <div className="mb-2">
                          {msg.mediaType === 'image' ? (
                            <img
                              src={msg.mediaUrl}
                              alt="Media Attachment"
                              className="rounded-lg max-h-56 object-cover border border-black/10 dark:border-white/10"
                            />
                          ) : (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-black/30 text-emerald-700 dark:text-emerald-400"
                            >
                              <MaterialIcon name="description" size={18} />
                              <span className="text-xs font-medium">Attachment</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message text */}
                      <p className="whitespace-pre-wrap">{msg.body}</p>

                      {/* Footer time & status */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMe && (
                          <MaterialIcon
                            name="done_all"
                            size={14}
                            className="text-[#53bdeb]"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ═══════ Omnichannel Dispatch Composer ═══════ */}
      <div className="bg-white dark:bg-[#182026] border-t border-slate-200 dark:border-slate-800 p-3 space-y-2.5 shrink-0">
        {/* Fair Housing Compliance Live Warning */}
        {inputText.trim() && (
          <FairHousingWarning
            text={inputText}
            onApplyAlternative={handleReplaceFairHousing}
          />
        )}

        {/* Quick Templates Drawer */}
        {showTemplates && (
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1e272e] space-y-1.5 max-h-48 overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Quick Reply Templates
              </span>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className="text-left p-2 rounded-lg bg-white dark:bg-[#151c22] hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-slate-200 dark:border-slate-800 transition-colors text-xs"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {tmpl.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{tmpl.body}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Channel Switcher + Composer Tools */}
        <div className="flex items-center justify-between gap-2">
          {/* Dispatch Channel Switcher Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#12181d] p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setDispatchChannel('whatsapp')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                dispatchChannel === 'whatsapp'
                  ? 'bg-[#008069] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MaterialIcon name="chat" size={13} />
              <span>Reply via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => setDispatchChannel('email')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                dispatchChannel === 'email'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <EnvelopeIcon className="w-3.5 h-3.5" />
              <span>Reply via Email</span>
            </button>
          </div>

          {/* Quick Template Button */}
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </button>
        </div>

        {/* Textarea Input + Send Action */}
        <div className="flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isBlockedDNC}
            placeholder={
              isBlockedDNC
                ? 'Contact has opted out of communications (DNC)'
                : dispatchChannel === 'whatsapp'
                  ? 'Type a WhatsApp message... (Press Enter to send, Shift+Enter for newline)'
                  : 'Type an email message... (Press Enter to send, Shift+Enter for newline)'
            }
            rows={2}
            className="flex-1 p-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#12181d] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-all disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isSending || isBlockedDNC}
            className={`p-3 rounded-xl text-white font-bold transition-all shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              dispatchChannel === 'whatsapp'
                ? 'bg-[#00a884] hover:bg-[#008f6f]'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            title="Send Message"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
