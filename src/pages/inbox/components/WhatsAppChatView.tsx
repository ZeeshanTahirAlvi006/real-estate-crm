import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ObjectionCopilotDrawer } from '@/components/ai-copilot/ObjectionCopilotDrawer'
import { toast } from 'sonner'

interface WhatsAppChatViewProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: 'whatsapp', fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  onBackToList?: () => void
  onToggleContactInfo?: () => void
  isSending?: boolean
}

export const WhatsAppChatView: React.FC<WhatsAppChatViewProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  onBackToList,
  onToggleContactInfo,
  isSending = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [inputText, setInputText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [isWhatsAppTemplateModalOpen, setIsWhatsAppTemplateModalOpen] = useState(false)
  const [isObjectionDrawerOpen, setIsObjectionDrawerOpen] = useState(false)
  const [activeObjectionText, setActiveObjectionText] = useState('')
  const [searchInChat, setSearchInChat] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const cleanPhone = (conversation.contactPhone || '').replace(/\D/g, '')

  // When autoCall=true is present in query parameters, open WhatsApp Web with chat open for this contact
  useEffect(() => {
    if (searchParams.get('autoCall') === 'true') {
      if (cleanPhone) {
        toast.info(`Opening WhatsApp Web for ${conversation.contactName || 'contact'}...`)
        window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank')
      } else {
        toast.error('No phone number available for this contact')
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('autoCall')
          return next
        },
        { replace: true }
      )
    }
  }, [searchParams, setSearchParams, conversation.id, conversation.contactName, cleanPhone])

  // When prefillText is present in query parameters, prefill the input box
  useEffect(() => {
    const prefill = searchParams.get('prefillText')
    if (prefill) {
      setInputText(prefill)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('prefillText')
          return next
        },
        { replace: true }
      )
    }
  }, [searchParams, setSearchParams])

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
    if (!dateStr) return ''
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

  const whatsAppMessages = messages.filter((m) => m.channel === 'whatsapp' || !m.channel)
  const filteredMessages = searchFilter.trim()
    ? whatsAppMessages.filter((m) => m.body.toLowerCase().includes(searchFilter.toLowerCase()))
    : whatsAppMessages

  return (
    <div className="flex flex-col flex-1 h-full bg-[#efeae2] dark:bg-[#0b141a] text-[#111b21] dark:text-[#e9edef] relative overflow-hidden font-sans">
      {/* ═══════ WhatsApp Chat Header Bar ═══════ */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] z-10 shrink-0">
        {/* Contact Info & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back to List Button */}
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-1.5 -ml-1 text-[#54656f] dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white rounded-full transition-colors cursor-pointer"
              title="Back to chats"
            >
              <MaterialIcon name="arrow_back" size={22} />
            </button>
          )}

          {/* Avatar (Clickable to view Contact Info) */}
          <div
            onClick={onToggleContactInfo}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#6b7c85] text-white font-bold text-xs flex items-center justify-center font-mono shadow-xs">
                {contactInitials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] border-2 border-[#f0f2f5] dark:border-[#202c33] rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef] truncate group-hover:underline">
                  {conversation.contactName || conversation.contactPhone || 'WhatsApp Lead'}
                </h2>
                {/* {conversation.aiIsaEnabled && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30 hidden sm:inline">
                    AI Active
                  </span>
                )} */}
              </div>
              {/* <p className="text-[11px] text-[#667781] dark:text-[#8696a0] truncate">
                {conversation.contactPhone ? `${conversation.contactPhone} • online` : 'online'}
              </p> */}
            </div>
          </div>
        </div>

        {/* Action Icons Bar (Video, Voice, Search, Menu) */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[#54656f] dark:text-[#aebac1]">
          {searchInChat && (
            <div className="relative animate-in fade-in slide-in-from-right-2 duration-150 mr-1">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search in chat..."
                className="w-32 sm:w-44 px-2.5 py-1 text-xs bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-[#2a3942] rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
            </div>
          )}

          {/* Search Button */}
          <button
            type="button"
            onClick={() => setSearchInChat(!searchInChat)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Search conversation"
          >
            <MaterialIcon name="search" size={20} />
          </button>

          {/* Voice Call: Open WhatsApp Web with chat open */}
          {cleanPhone ? (
            <button
              type="button"
              onClick={() => {
                window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank')
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884] dark:hover:text-[#00a884]"
              title="Voice Call on WhatsApp Web"
            >
              <MaterialIcon name="call" size={20} />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="p-2 rounded-full opacity-40 cursor-not-allowed text-[#54656f] dark:text-[#aebac1]"
              title="No Phone Number"
            >
              <MaterialIcon name="call" size={20} />
            </button>
          )}

          {/* Video Call: Open WhatsApp Web with chat open */}
          {cleanPhone ? (
            <button
              type="button"
              onClick={() => {
                window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}`, '_blank')
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer hidden sm:flex text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884] dark:hover:text-[#00a884]"
              title="Video Call on WhatsApp Web"
            >
              <MaterialIcon name="videocam" size={20} />
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="p-2 rounded-full opacity-40 cursor-not-allowed hidden sm:flex text-[#54656f] dark:text-[#aebac1]"
              title="No Phone Number"
            >
              <MaterialIcon name="videocam" size={20} />
            </button>
          )}

          {/* AI Copilot shortcut */}
          <button
            type="button"
            onClick={onOpenCopilot}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="AI Copilot Assistant"
          >
            <MaterialIcon name="auto_awesome" size={20} className="text-[#00a884]" />
          </button>

          {/* Contact Info Sidebar Toggle */}
          {onToggleContactInfo && (
            <button
              type="button"
              onClick={onToggleContactInfo}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Contact info"
            >
              <MaterialIcon name="info" size={20} />
            </button>
          )}

          {/* WhatsApp Menu */}
          <button
            type="button"
            onClick={onToggleContactInfo}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Menu"
          >
            <MaterialIcon name="more_vert" size={20} />
          </button>
        </div>
      </div>

      {/* ═══════ WhatsApp Wallpaper Background & Messages Area ═══════ */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 relative"
        style={{
          backgroundImage: `radial-gradient(#8696a0 0.75px, transparent 0.75px)`,
          backgroundSize: '20px 20px',
        }}
      >
        {/* End-to-End Encryption Notice Bubble */}
        <div className="flex justify-center my-2">
          <div className="px-3.5 py-1.5 rounded-lg bg-[#ffeecd] dark:bg-[#182229] border border-[#ffdb9b]/60 dark:border-[#222e35] text-[11px] text-[#54656f] dark:text-[#ffd279] max-w-md text-center shadow-xs flex items-center justify-center gap-1.5">
            <MaterialIcon name="lock" size={13} className="shrink-0 text-[#8696a0] dark:text-[#ffd279]" />
            <span>Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen.</span>
          </div>
        </div>

        {/* Message Stream */}
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-[#f0f2f5] dark:bg-[#182229] flex items-center justify-center text-[#00a884] shadow-xs">
              <MaterialIcon name="chat" size={28} />
            </div>
            <p className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">No messages yet</p>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] max-w-xs">
              Send a WhatsApp message to {conversation.contactName} to begin the conversation.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe =
              msg.direction === 'outbound' ||
              msg.senderType === 'agent' ||
              msg.senderType === 'ai_isa'
            const isAI = msg.senderType === 'ai_isa'

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[85%] sm:max-w-md lg:max-w-lg`}
              >
                <div
                  className={`relative px-3 py-1.5 rounded-lg text-xs sm:text-[13px] leading-relaxed shadow-xs ${isMe
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
                    : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-[#e9edef]/40 dark:border-transparent'
                    }`}
                >
                  {/* AI ISA Header indicator */}
                  {isAI && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#008069] dark:text-[#25d366] mb-0.5">
                      <MaterialIcon name="auto_awesome" size={12} />
                      <span>AI ISA Autonomous Reply</span>
                    </div>
                  )}

                  {/* Media Attachment Rendering */}
                  {msg.mediaUrl && (
                    <div className="mb-2">
                      {msg.mediaType === 'image' ? (
                        <img
                          src={msg.mediaUrl}
                          alt="WhatsApp Attachment"
                          className="rounded-lg max-h-56 object-cover border border-black/10 dark:border-white/10"
                        />
                      ) : msg.mediaType === 'audio' ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-black/30">
                          <MaterialIcon name="mic" size={18} className="text-[#00a884]" />
                          <span className="text-[11px] font-mono">Voice Note</span>
                          <audio controls src={msg.mediaUrl} className="h-7 w-40 sm:w-48" />
                        </div>
                      ) : (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-black/10 dark:bg-black/30 text-[#008069] dark:text-[#00a884] transition-colors"
                        >
                          <MaterialIcon name="description" size={18} />
                          <span className="text-[11px] font-medium">Download Attachment</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message text */}
                  <p className="whitespace-pre-line wrap-break-words">{msg.body}</p>

                  {/* Fair Housing Warning Chip */}
                  {msg.fairHousingFlags && msg.fairHousingFlags.length > 0 && (
                    <div className="mt-1.5 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 p-1 rounded border border-amber-500/30 flex items-center gap-1">
                      <MaterialIcon name="warning" size={12} className="shrink-0" />
                      <span>Flagged: {msg.fairHousingFlags.join(', ')}</span>
                    </div>
                  )}

                  {/* Auto-detected client objection chip */}
                  {!isMe &&
                    /(rate|interest|crash|bubble|commission|fee|lowball|below asking|wait|not ready)/i.test(
                      msg.body
                    ) && (
                      <div className="mt-1.5 pt-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1 font-semibold">
                          <MaterialIcon name="bolt" size={13} className="text-amber-500" />
                          Objection
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveObjectionText(msg.body)
                            setIsObjectionDrawerOpen(true)
                          }}
                          className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors"
                        >
                          Rebuttal →
                        </button>
                      </div>
                    )}

                  {/* Timestamp & WhatsApp Double Check Ticks */}
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-[#667781] dark:text-[#8696a0] float-right ml-2 -mb-0.5">
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && (
                      <MaterialIcon
                        name="done_all"
                        size={15}
                        className="text-[#53bdeb]"
                        title="Read"
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ═══════ WhatsApp Composer Bar ═══════ */}
      <div className="p-2 sm:p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222d34] space-y-2 shrink-0">
        {/* Fair Housing Warning banner if user types flagged words */}
        <FairHousingWarning
          text={inputText}
          onApplyAlternative={handleReplaceFairHousing}
        />

        {/* Quick Templates Drawer */}
        {showTemplates && (
          <div className="bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-[#222d34] rounded-xl p-3 shadow-xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#e9edef] dark:border-[#222d34]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#008069] dark:text-[#00a884]">
                  WhatsApp Templates
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplates(false)
                    setIsWhatsAppTemplateModalOpen(true)
                  }}
                  className="text-[11px] text-[#008069] dark:text-[#00a884] hover:underline font-semibold cursor-pointer"
                >
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-[#8696a0] hover:text-[#111b21] dark:hover:text-white cursor-pointer"
              >
                <MaterialIcon name="close" size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {quickTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="p-2 rounded-lg bg-[#f0f2f5] dark:bg-[#202c33] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] cursor-pointer transition-colors text-xs"
                >
                  <p className="font-semibold text-[#111b21] dark:text-[#e9edef] truncate">{t.title}</p>
                  <p className="text-[11px] text-[#667781] dark:text-[#8696a0] line-clamp-1 mt-0.5">
                    {t.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        {isBlockedDNC ? (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center text-xs text-rose-600 dark:text-rose-400 font-semibold">
            Contact does not allow messages
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Dedicated WhatsApp Templates Button */}
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-2.5 py-1.5 rounded-lg text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884] dark:hover:text-[#00a884] hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 font-medium text-xs"
              title="WhatsApp Templates"
            >
              {/* <MaterialIcon name="description" size={18} /> */}
              <span className="hidden sm:inline">Templates</span>
            </button>

            {/* Rebuttal Copilot Button */}
            <button
              type="button"
              onClick={() => {
                setActiveObjectionText(inputText || (conversation.lastMessage?.body ?? ''))
                setIsObjectionDrawerOpen(true)
              }}
              className="px-2.5 py-1.5 rounded-lg text-[#54656f] dark:text-[#aebac1] hover:text-amber-500 dark:hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 font-medium text-xs"
              title="Objection Rebuttals"
            >
              {/* <MaterialIcon name="bolt" size={18} className="text-amber-500" /> */}
              <span className="hidden sm:inline">Rebuttals</span>
            </button>

            {/* Input Field */}
            <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-3 py-1.5 flex items-center shadow-2xs">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                rows={1}
                className="w-full resize-none bg-transparent text-xs sm:text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] focus:outline-none max-h-24 leading-relaxed"
              />
            </div>

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Send message"
            >
              <MaterialIcon name="send" size={18} />
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

      {/* AI Objection Handling Drawer */}
      <ObjectionCopilotDrawer
        isOpen={isObjectionDrawerOpen}
        onClose={() => setIsObjectionDrawerOpen(false)}
        initialText={activeObjectionText}
        contactName={conversation.contactName}
        onInsertScript={(script) => {
          setInputText(script)
          setIsObjectionDrawerOpen(false)
        }}
      />
    </div>
  )
}
