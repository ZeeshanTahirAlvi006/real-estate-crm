import React from 'react'
import type { ConversationThread } from '@/types/communication'
import {
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  TagIcon,
  BuildingOfficeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface ContactInfoPaneProps {
  conversation: ConversationThread
  onOpenDialerForContact?: () => void
  onOpenCopilot: () => void
}

export const ContactInfoPane: React.FC<ContactInfoPaneProps> = ({
  conversation,
  onOpenCopilot,
}) => {
  const contactInitials = (conversation.contactName || 'Lead')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'L'

  const isOptedOut = conversation.dncStatus === 'opted_out'

  return (
    <div className="hidden xl:flex flex-col h-full bg-card border-l border-border/80 w-80 shrink-0 p-5 space-y-5 overflow-y-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-border/60">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-primary to-chart-3 text-primary-foreground font-bold text-xl shadow-md">
          {contactInitials}
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">{conversation.contactName || 'Lead'}</h3>
          <p className="text-xs text-muted-foreground">{conversation.assignedAgentName || 'Unassigned'}</p>
        </div>

        {/* Lead Score Badge */}
        <div className="flex items-center gap-2 pt-1">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              (conversation.leadScore ?? 50) >= 80
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : (conversation.leadScore ?? 50) >= 60
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  : (conversation.leadScore ?? 50) >= 40
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            Lead Score: {conversation.leadScore ?? 50}/100
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {conversation.contactPhone ? (
          <a
            href={`https://wa.me/${conversation.contactPhone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white font-semibold text-xs transition-colors"
            title="Open WhatsApp Voice Call & Chat"
          >
            <PhoneIcon className="w-3.5 h-3.5" />
            <span>WhatsApp Call</span>
          </a>
        ) : (
          <div className="flex items-center justify-center py-2 px-3 rounded-xl bg-muted/40 text-muted-foreground text-xs">
            No Phone
          </div>
        )}

        <button
          type="button"
          onClick={onOpenCopilot}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-chart-3/10 hover:bg-chart-3 text-chart-3 hover:text-white font-semibold text-xs transition-colors"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>AI Copilot</span>
        </button>
      </div>

      {/* Client Communication Consent (Read-only status) */}
      <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/60">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheckIcon className={`w-4 h-4 ${isOptedOut ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span>Client Consent</span>
          </h4>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isOptedOut ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
            }`}
          >
            {isOptedOut ? 'OPTED OUT' : 'OPTED IN'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {isOptedOut
            ? 'Client opted out of automated messaging via STOP keyword or VIP Portal.'
            : 'Client has granted consent to receive property alerts and advisor updates.'}
        </p>
      </div>

      {/* Contact Details */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Contact Information
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 text-foreground font-mono">
            <PhoneIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{conversation.contactPhone}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground truncate">
            <EnvelopeIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="truncate">{conversation.contactEmail}</span>
          </div>
          {conversation.pipelineStage && (
            <div className="flex items-center gap-2 text-foreground">
              <BuildingOfficeIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Stage: {conversation.pipelineStage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <TagIcon className="w-3.5 h-3.5" />
          <span>Lead Tags</span>
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {conversation.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
