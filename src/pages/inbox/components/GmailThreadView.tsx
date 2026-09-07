import React, { useState, useRef, useEffect } from 'react'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
} from '@/types/communication'
import {
  FairHousingWarning,
  checkFairHousingCompliance,
} from '@/components/ai-copilot/FairHousingWarning'
import {
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline'

interface GmailThreadViewProps {
  conversation: ConversationThread
  messages: ConversationMessage[]
  quickTemplates: QuickReplyTemplate[]
  onSendMessage: (text: string, channel: 'email', fairHousingFlags?: string[]) => void
  onOpenCopilot: () => void
  isSending?: boolean
}

export const GmailThreadView: React.FC<GmailThreadViewProps> = ({
  conversation,
  messages,
  quickTemplates,
  onSendMessage,
  onOpenCopilot,
  isSending = false,
}) => {
  const [inputText, setInputText] = useState('')
  const [subject] = useState(
    `Re: Property Inquiry & Consultation — ${conversation.contactName || 'Lead'}`
  )
  const [showTemplates, setShowTemplates] = useState(false)
  const [isFormattingBold, setIsFormattingBold] = useState(false)
  const [isFormattingItalic, setIsFormattingItalic] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const emailMessages = messages.filter((m) => m.channel === 'email')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [emailMessages.length])

  const handleSend = () => {
    if (!inputText.trim() || isSending) return

    const complianceIssues = checkFairHousingCompliance(inputText)
    const flags = complianceIssues.map((c) => c.phrase)

    onSendMessage(inputText.trim(), 'email', flags.length > 0 ? flags : undefined)
    setInputText('')
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

  const formatEmailDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isBlockedDNC = conversation.dncStatus === 'opted_out'

  const contactInitials =
    (conversation.contactName || 'Lead')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'EM'

  return (
    <div className="flex flex-col flex-1 h-full bg-background text-foreground relative overflow-hidden font-sans">
      {/* Gmail Top Action Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/70 bg-card/80 backdrop-blur-sm z-10 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold border border-primary/20">
            Inbox
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
            Gmail IMAP Sync
          </span>
        </div>

        {/* AI Copilot & Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCopilot}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white transition-all hover:opacity-95 flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>AI Copilot Draft</span>
          </button>
        </div>
      </div>

      {/* Gmail Subject Banner */}
      <div className="px-6 py-3 border-b border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <EnvelopeIcon className="w-5 h-5 text-blue-500 shrink-0" />
          <h1 className="text-base font-bold text-foreground truncate">{subject}</h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{conversation.contactEmail || 'No email specified'}</span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Score: {conversation.leadScore ?? 50}/100
          </span>
        </div>
      </div>

      {/* Gmail Email Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
        {emailMessages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
            <EnvelopeIcon className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="font-semibold text-foreground text-sm">No email messages yet</p>
            <p className="max-w-xs mx-auto text-muted-foreground">
              Send an email to {conversation.contactEmail || conversation.contactName} using the compose box below.
            </p>
          </div>
        ) : (
          emailMessages.map((msg) => {
            const isMe = msg.direction === 'outbound'
            const isAI = msg.senderType === 'ai_isa'

            return (
              <div
                key={msg.id}
                className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden transition-all hover:border-border"
              >
              {/* Email Card Header */}
              <div className="p-4 bg-muted/20 border-b border-border/50 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20 shrink-0">
                    {isMe ? 'ME' : contactInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-foreground truncate">
                        {isAI ? 'PropPulse AI Assistant' : isMe ? 'Sarah Jenkins' : conversation.contactName}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono truncate">
                        &lt;{isMe ? 'zeeshantahiralvi123@gmail.com' : conversation.contactEmail || 'client@domain.com'}&gt;
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      to {isMe ? conversation.contactEmail || 'Lead' : 'Sarah Jenkins <zeeshantahiralvi123@gmail.com>'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                  <span>{formatEmailDate(msg.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(`> ${msg.body.split('\n').join('\n> ')}\n\n`)
                    }}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    title="Reply to message"
                  >
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Email Card Body */}
              <div className="p-5 text-xs text-foreground leading-relaxed space-y-3">
                {isAI && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-600 dark:text-blue-300 font-medium flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                    <span>Autonomous AI Qualification Draft sent to lead</span>
                  </div>
                )}

                <div className="whitespace-pre-line text-sm text-foreground/90 font-sans leading-relaxed">
                  {msg.body}
                </div>

                {/* Email Sign-off footer */}
                {isMe && (
                  <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground">
                    <p className="font-semibold text-foreground">Sarah Jenkins</p>
                    <p>Senior Real Estate Advisor • PropPulse Real Estate</p>
                    <p className="text-[10px] text-muted-foreground/80">Direct: +1 (555) 234-5678</p>
                  </div>
                )}
              </div>
            </div>
          )
        }))}
        <div ref={messagesEndRef} />
      </div>

      {/* Gmail Compose Dock / Box */}
      <div className="p-4 border-t border-border/80 bg-card/90 backdrop-blur-md space-y-3 shadow-lg">
        {/* Fair Housing Alert */}
        <FairHousingWarning
          text={inputText}
          onApplyAlternative={handleReplaceFairHousing}
        />

        {/* Quick Response Templates Drawer */}
        {showTemplates && (
          <div className="bg-background border border-border rounded-xl p-3 shadow-xl space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
              <span className="text-xs font-bold text-foreground">Email Quick Response Templates</span>
              <button
                type="button"
                onClick={() => setShowTemplates(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {quickTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="p-2 rounded-lg bg-muted/40 hover:bg-primary/10 border border-border/50 cursor-pointer transition-all text-xs"
                >
                  <p className="font-semibold text-foreground truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isBlockedDNC ? (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-center text-xs text-destructive font-semibold">
            TCPA Block: Contact has opted out of communications.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-background overflow-hidden shadow-xs">
            {/* Compose Top Bar */}
            <div className="px-4 py-2 bg-muted/30 border-b border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">To:</span>
                <span className="font-mono text-[11px] text-foreground">
                  {conversation.contactEmail || 'client@domain.com'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                <span>Templates</span>
              </button>
            </div>

            {/* Email Body Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write your email response here..."
              rows={4}
              className={`w-full p-3.5 text-xs text-foreground bg-transparent resize-none focus:outline-none leading-relaxed ${
                isFormattingBold ? 'font-bold' : ''
              } ${isFormattingItalic ? 'italic' : ''}`}
            />

            {/* Gmail Bottom Formatting & Send Toolbar */}
            <div className="px-3 py-2 bg-muted/20 border-t border-border/50 flex items-center justify-between gap-3">
              {/* Left: Send Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || isSending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  <span>Send Email</span>
                </button>
              </div>

              {/* Center Formatting Shortcuts */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setIsFormattingBold(!isFormattingBold)}
                  className={`p-1.5 rounded-md hover:bg-muted font-bold text-xs ${
                    isFormattingBold ? 'bg-muted text-foreground' : ''
                  }`}
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormattingItalic(!isFormattingItalic)}
                  className={`p-1.5 rounded-md hover:bg-muted italic text-xs ${
                    isFormattingItalic ? 'bg-muted text-foreground' : ''
                  }`}
                  title="Italic"
                >
                  I
                </button>
              </div>

              {/* Right: Discard / Reset */}
              <button
                type="button"
                onClick={() => setInputText('')}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Discard Draft"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
