import React from 'react'
import type { ConversationThread } from '@/types/communication'
import {
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BuildingOfficeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

interface ContactInfoPaneProps {
  conversation: ConversationThread
  onOpenDialerForContact: () => void
  onOpenCopilot: () => void
}

export const ContactInfoPane: React.FC<ContactInfoPaneProps> = ({
  conversation,
  onOpenDialerForContact,
  onOpenCopilot,
}) => {
  const contactInitials = (conversation.contactName || 'Lead')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'L'

  return (
    <div className="hidden xl:flex flex-col h-full bg-card border-l border-border/80 w-80 shrink-0 p-5 space-y-5 overflow-y-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-border/60">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-chart-3 text-primary-foreground font-bold text-xl shadow-md">
          {contactInitials}
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">{conversation.contactName || 'Lead'}</h3>
          <p className="text-xs text-muted-foreground">{conversation.assignedAgentName || 'Unassigned'}</p>
        </div>

        {/* Lead Score Badge */}
        <div className="flex items-center gap-2 pt-1">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            Lead Score: {conversation.leadScore ?? 50}/100
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenDialerForContact}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs transition-colors"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>Call Lead</span>
        </button>

        <button
          type="button"
          onClick={onOpenCopilot}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-chart-3/10 hover:bg-chart-3 text-chart-3 hover:text-white font-semibold text-xs transition-colors"
        >
          <SparklesIcon className="w-4 h-4" />
          <span>AI Copilot</span>
        </button>
      </div>

      {/* TCPA & Compliance Status */}
      <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
          <span>TCPA & Regulatory Status</span>
        </h4>
        <div className="text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">DNC Registry:</span>
            {conversation.dncStatus === 'clean' ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Scrubbed (Clean)</span>
            ) : (
              <span className="font-semibold text-destructive flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> DNC Blocked
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Channel Consent:</span>
            <span className="font-semibold text-foreground">Omnichannel Opt-In</span>
          </div>
        </div>
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
