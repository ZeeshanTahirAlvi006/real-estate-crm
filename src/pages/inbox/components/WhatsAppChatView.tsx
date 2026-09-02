import React, { useState, useRef, useEffect } from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
} from '@/types/communication'
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
  VideoCameraIcon,
  ShieldExclamationIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentArrowDownIcon,
  MusicalNoteIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

interface WhatsAppChatViewProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: 'whatsapp', fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  isSending?: boolean
}

export const WhatsAppChatView: React.FC<WhatsAppChatViewProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [isWhatsAppTemplateModalOpen, setIsWhatsAppTemplateModalOpen] = useState(false)
  const [searchInChat, setSearchInChat] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim() || isSending) return

    const complianceIssues = checkFairHousingCompliance(inputText)
    const flags = complianceIssues.map((c) => c.phrase)

    onSendMessage(inputText.trim(), 'whatsapp', flags.length > 0 ? flags : undefined)
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
      .toUpperCase() || 'WA'

  const cleanPhone = (conversation.contactPhone || '').replace(/\D/g, '')

  const filteredMessages = searchFilter.trim()
    ? messages.filter((m) => m.body.toLowerCase().includes(searchFilter.toLowerCase()))
    : messages

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0b141a] dark:bg-[#0b141a] text-slate-100 relative overflow-hidden font-sans">
      {/* WhatsApp Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#202c33] border-b border-[#2a3942] z-10 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white font-bold text-sm shadow-sm">
              {contactInitials}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#202c33] rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-slate-100 truncate">
                {conversation.contactName || 'WhatsApp Contact'}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                WhatsApp
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  (conversation.leadScore ?? 50) >= 80
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : (conversation.leadScore ?? 50) >= 60
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : (conversation.leadScore ?? 50) >= 40
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                Score {conversation.leadScore ?? 50}/100
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {conversation.contactPhone || 'Online • tap to call'}
            </p>
          </div>
        </div>

        {/* WhatsApp Top Action Bar (Voice Call, Video Call, Templates, Copilot) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {searchInChat && (
            <div className="relative animate-in fade-in slide-in-from-right-2 duration-150">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search chat..."
                className="w-36 sm:w-48 px-2.5 py-1 text-xs bg-[#111b21] border border-[#2a3942] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setSearchInChat(!searchInChat)}
            className="p-2 rounded-full hover:bg-[#374248] text-slate-300 transition-colors"
            title="Search conversation"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>

          {/* 1-Click WhatsApp VoIP Voice Call */}
          {cleanPhone ? (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-1.5 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              title="Start WhatsApp Voice Call"
            >
              <PhoneIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Voice Call</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="p-2 rounded-full bg-slate-700 text-slate-400 cursor-not-allowed text-xs"
              title="No Phone Number"
            >
              <PhoneIcon className="w-4 h-4" />
            </button>
          )}

          {/* WhatsApp Video Call Link */}
          {cleanPhone && (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-[#374248] text-slate-300 transition-colors hidden md:flex items-center"
              title="Start WhatsApp Video Call"
            >
              <VideoCameraIcon className="w-4 h-4" />
            </a>
          )}

          {/* AI Copilot */}
          <button
            type="button"
            onClick={onOpenCopilot}
            className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white transition-all hover:opacity-95 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Copilot</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Chat Wallpaper Background & Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#0b141a] bg-opacity-95"
        style={{
          backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* Encryption Notice Badge */}
        <div className="flex justify-center my-2">
          <div className="px-3 py-1 rounded-lg bg-[#182229] border border-[#222e35] text-[11px] text-[#ffd279] max-w-md text-center shadow-xs flex items-center gap-1.5">
            <span>🔒 Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen.</span>
          </div>
        </div>

        {filteredMessages.map((msg) => {
          const isMe = msg.direction === 'outbound'
          const isAI = msg.senderType === 'ai_isa'

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-xl ${
                isMe ? 'ml-auto' : 'mr-auto'
              }`}
            >
              <div
                className={`relative px-3.5 py-2 rounded-2xl text-xs leading-relaxed max-w-full shadow-md ${
                  isAI
                    ? 'bg-[#18392b] text-slate-100 border border-emerald-500/40 rounded-tr-xs'
                    : isMe
                      ? 'bg-[#005c4b] text-white rounded-tr-xs'
                      : 'bg-[#202c33] text-slate-100 rounded-tl-xs border border-[#2a3942]'
                }`}
              >
                {/* AI ISA Header indicator */}
                {isAI && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 mb-1">
                    <SparklesIcon className="w-3 h-3" />
                    <span>AI ISA Auto-Reply</span>
                  </div>
                )}

                {/* Media Attachment Rendering */}
                {msg.mediaUrl && (
                  <div className="mb-2">
                    {msg.mediaType === 'image' ? (
                      <img
                        src={msg.mediaUrl}
                        alt="WhatsApp Attachment"
                        className="rounded-xl max-h-56 object-cover border border-white/10"
                      />
                    ) : msg.mediaType === 'audio' ? (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-black/30">
                        <MusicalNoteIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-mono">Voice Note</span>
                        <audio controls src={msg.mediaUrl} className="h-7 w-44" />
                      </div>
                    ) : (
                      <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-black/30 hover:bg-black/40 text-emerald-300 transition-colors"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                        <span className="text-[11px] font-medium">Download Attachment</span>
                      </a>
                    )}
                  </div>
                )}

                <p className="whitespace-pre-line text-[13px]">{msg.body}</p>

                {/* Fair Housing Violation Warning */}
                {msg.fairHousingFlags && msg.fairHousingFlags.length > 0 && (
                  <div className="mt-2 text-[10px] bg-amber-500/20 text-amber-300 p-1.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                    <ShieldExclamationIcon className="w-3 h-3 shrink-0" />
                    <span>Flagged phrase: {msg.fairHousingFlags.join(', ')}</span>
                  </div>
                )}

                {/* Timestamp & Double Blue Ticks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 float-right ml-2 -mb-0.5">
                  <span>{formatTime(msg.createdAt)}</span>
                  {isMe && (
                    <span className="text-sky-400 font-bold ml-0.5" title="Delivered & Read">
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Composer Area */}
      <div className="p-3 bg-[#202c33] border-t border-[#2a3942] space-y-2">
        {/* Fair Housing Warning */}
        <FairHousingWarning
          text={inputText}
          onApplyAlternative={handleReplaceFairHousing}
        />

        {/* Quick Templates Drawer */}
        {showTemplates && (
          <div className="bg-[#111b21] border border-[#2a3942] rounded-2xl p-3 shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#2a3942]">
              <span className="text-xs font-bold text-emerald-400">WhatsApp Templates</span>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {quickTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="p-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] border border-[#2a3942] cursor-pointer transition-all text-xs"
                >
                  <p className="font-semibold text-slate-200 truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        {isBlockedDNC ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center text-xs text-rose-400 font-semibold">
            TCPA Block: Contact opted out via STOP keyword.
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWhatsAppTemplateModalOpen(true)}
              className="p-2 rounded-full hover:bg-[#374248] text-[#00a884] transition-colors"
              title="Official Meta WhatsApp Template"
            >
              <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 rounded-full hover:bg-[#374248] text-slate-400 hover:text-slate-200 transition-colors"
              title="Quick Responses"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 relative flex items-center bg-[#2a3942] rounded-2xl px-3 py-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a WhatsApp message... (Shift+Enter for new line)"
                rows={1}
                className="w-full resize-none bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none max-h-24 py-1.5 leading-relaxed"
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="h-10 w-10 shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-md transition-all hover:scale-105 disabled:opacity-40"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Official WhatsApp Template Modal */}
      <WhatsAppTemplateModal
        open={isWhatsAppTemplateModalOpen}
        onOpenChange={setIsWhatsAppTemplateModalOpen}
        conversation={conversation}
      />
    </div>
  )
}
