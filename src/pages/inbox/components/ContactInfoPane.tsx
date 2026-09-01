import React from 'react'
import type { ConversationThread } from '@/types/communication'
import {
  useOptOutContactMutation,
  useOptBackInContactMutation,
} from '@/store/api/communicationApi'
import {
  PhoneIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

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
  const [optOut, { isLoading: isOptingOut }] = useOptOutContactMutation()
  const [optBackIn, { isLoading: isOptingIn }] = useOptBackInContactMutation()

  const handleToggleOptOut = async () => {
    try {
      if (conversation.dncStatus === 'opted_out') {
        await optBackIn({ contactId: conversation.contactId }).unwrap()
        toast.success('Contact re-consented to receive communications')
      } else {
        await optOut({
          contactId: conversation.contactId,
          reason: 'Manual agent request in Inbox',
        }).unwrap()
        toast.warning('Contact marked as OPTED OUT (TCPA Guard Active)')
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to update TCPA consent')
    }
  }

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
      <div className="space-y-2.5 bg-muted/30 p-3.5 rounded-xl border border-border/60">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheckIcon className={`w-4 h-4 ${isOptedOut ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span>TCPA Compliance</span>
          </h4>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOptedOut ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
              }`}
          >
            {isOptedOut ? 'OPTED OUT' : 'CLEAN'}
          </span>
        </div>

        <div className="text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Outbound Status:</span>
            {isOptedOut ? (
              <span className="font-semibold text-destructive flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Blocked (TCPA)
              </span>
            ) : (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Allowed</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleOptOut}
          disabled={isOptingOut || isOptingIn}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${isOptedOut
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20'
            }`}
        >
          {isOptedOut ? (
            <>
              <CheckCircleIcon className="w-3.5 h-3.5" />
              <span>{isOptingIn ? 'Re-consenting...' : 'Re-Consent Contact (Opt Back In)'}</span>
            </>
          ) : (
            <>
              <NoSymbolIcon className="w-3.5 h-3.5" />
              <span>{isOptingOut ? 'Opting out...' : 'Manual TCPA Opt-Out'}</span>
            </>
          )}
        </button>
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
