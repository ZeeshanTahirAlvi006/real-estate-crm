import React from 'react'
import type { ConversationThread } from '@/types/communication'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface ContactInfoPaneProps {
  conversation: ConversationThread
  onOpenCopilot: () => void
  onClose?: () => void
}

export const ContactInfoPane: React.FC<ContactInfoPaneProps> = ({
  conversation,
  onOpenCopilot,
  onClose,
}) => {
  const contactInitials = (conversation.contactName || 'Lead')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'L'

  const isOptedOut = conversation.dncStatus === 'opted_out'
  const cleanPhone = (conversation.contactPhone || '').replace(/\D/g, '')

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#111b21] border-l border-[#e9edef] dark:border-[#222d34] w-full sm:w-[320px] md:w-[340px] lg:w-[360px] shrink-0 overflow-y-auto select-none">
      {/* ═══════ WhatsApp Drawer Header ═══════ */}
      <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] shrink-0">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Close contact info"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        )}
        <h3 className="font-semibold text-sm text-[#111b21] dark:text-[#e9edef]">
          Contact info
        </h3>
      </div>

      <div className="space-y-2 p-0">
        {/* ═══════ Large Profile Section ═══════ */}
        <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] space-y-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#6b7c85] text-white font-bold text-3xl sm:text-4xl flex items-center justify-center font-mono shadow-md">
            {contactInitials}
          </div>

          <div>
            <h2 className="font-semibold text-lg text-[#111b21] dark:text-[#e9edef]">
              {conversation.contactName || 'WhatsApp Contact'}
            </h2>
            <p className="text-xs sm:text-sm text-[#667781] dark:text-[#8696a0] font-mono mt-0.5">
              {conversation.contactPhone || 'No phone recorded'}
            </p>
          </div>

          {/* Quick WhatsApp Action Icons */}
          <div className="flex items-center justify-center gap-6 pt-2 text-[#008069] dark:text-[#00a884]">
            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-[#00a884]/15 flex items-center justify-center">
                  <MaterialIcon name="call" size={20} />
                </div>
                <span className="text-[11px] text-[#54656f] dark:text-[#aebac1]">Audio</span>
              </a>
            ) : null}

            {cleanPhone ? (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-[#00a884]/15 flex items-center justify-center">
                  <MaterialIcon name="videocam" size={20} />
                </div>
                <span className="text-[11px] text-[#54656f] dark:text-[#aebac1]">Video</span>
              </a>
            ) : null}

            <button
              type="button"
              onClick={onOpenCopilot}
              className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#00a884]/15 flex items-center justify-center">
                <MaterialIcon name="auto_awesome" size={20} />
              </div>
              <span className="text-[11px] text-[#54656f] dark:text-[#aebac1]">Copilot</span>
            </button>
          </div>
        </div>

        {/* ═══════ WhatsApp About & Phone Section ═══════ */}
        <div className="p-4 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] space-y-3">
          <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wider">
            About and phone number
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
              {conversation.contactPhone || 'Unknown phone'}
            </p>
            <p className="text-xs text-[#667781] dark:text-[#8696a0]">
              Mobile • WhatsApp Verified
            </p>
          </div>
          {conversation.contactEmail && (
            <div className="space-y-0.5 pt-2 border-t border-[#e9edef] dark:border-[#222d34]">
              <p className="text-xs font-medium text-[#111b21] dark:text-[#e9edef]">
                {conversation.contactEmail}
              </p>
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">Email Address</p>
            </div>
          )}
        </div>

        {/* ═══════ Lead Score & Qualification Card ═══════ */}
        <div className="p-4 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] space-y-2">
          <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wider">
            CRM Qualification
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#111b21] dark:text-[#e9edef]">Lead Score</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                (conversation.leadScore ?? 50) >= 80
                  ? 'bg-[#00a884]/20 text-[#00a884]'
                  : (conversation.leadScore ?? 50) >= 60
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {conversation.leadScore ?? 50} / 100
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#e9edef] dark:border-[#222d34]">
            <span className="text-xs text-[#111b21] dark:text-[#e9edef]">Assigned Agent</span>
            <span className="text-xs text-[#667781] dark:text-[#8696a0]">
              {conversation.assignedAgentName || 'General Lead Pool'}
            </span>
          </div>
        </div>

        {/* ═══════ TCPA Consent & Privacy ═══════ */}
        <div className="p-4 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wider">
              Consent & Privacy
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOptedOut
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : 'bg-[#00a884]/15 text-[#00a884]'
              }`}
            >
              {isOptedOut ? 'Opted Out' : 'Compliant'}
            </span>
          </div>
          <p className="text-[11px] text-[#667781] dark:text-[#8696a0] leading-relaxed">
            {isOptedOut
              ? 'Client has revoked contact consent. Messages cannot be dispatched.'
              : 'Active opt-in for automated WhatsApp transactional and listing notifications.'}
          </p>
        </div>

        {/* ═══════ Media, Links, and Docs ═══════ */}
        <div className="p-4 bg-white dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#54656f] dark:text-[#8696a0]">
              Media, links and docs
            </span>
            <MaterialIcon name="chevron_right" size={18} className="text-[#8696a0]" />
          </div>
          <p className="text-[11px] text-[#8696a0]">0 documents shared</p>
        </div>
      </div>
    </div>
  )
}
