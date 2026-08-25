import type { ConversationThread } from '@/types/communication'
import {
  SparklesIcon,
  XMarkIcon,
  ShieldCheckIcon,
  PaperAirplaneIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

interface CopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
  conversation: ConversationThread
  onApplyDraft: (text: string) => void
  onToggleAiIsa: (enabled: boolean) => void
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  onClose,
  conversation,
  onApplyDraft,
  onToggleAiIsa,
}) => {
  if (!isOpen) return null

  const smartSuggestions = [
    {
      title: 'Confirm Saturday 2:00 PM Tour',
      confidence: 98,
      intent: 'Tour Booking',
      text: `Hi ${conversation.contactName.split(' ')[0]}, I've scheduled your private showing for this Saturday at 2:00 PM. I'll text you the lockbox entry & parking instructions shortly before!`,
    },
    {
      title: 'Request Lender Pre-Approval Letter',
      confidence: 93,
      intent: 'Qualification',
      text: `Great! Since this property has received multiple inquiries, could you share a copy of your lender pre-approval letter so we can submit an offer immediately if you love it?`,
    },
    {
      title: 'Send Micro-CMA Valuation Link',
      confidence: 89,
      intent: 'Seller Equity',
      text: `I also generated a real-time equity valuation for your current neighborhood showing the latest 3 comparable sales. Would you like me to send over the report?`,
    },
  ]

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card/95 backdrop-blur-md border-l border-border/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-linear-to-tr from-primary to-chart-3 text-primary-foreground">
            <SparklesIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">AI ISA Copilot</h3>
            <p className="text-[11px] text-muted-foreground">Human-in-the-loop Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* AI ISA Autonomous Mode Switch */}
        <div className="bg-muted/40 border border-border/80 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Sub-30s Autonomous AI Mode</span>
            <button
              type="button"
              onClick={() => onToggleAiIsa(!conversation.aiIsaEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${conversation.aiIsaEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${conversation.aiIsaEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {conversation.aiIsaEnabled
              ? 'AI ISA responds to inbound inquiries in <30 seconds automatically.'
              : 'AI responses are drafted as suggestions for manual agent approval.'}
          </p>
        </div>

        {/* Lead Intelligence Snapshot */}
        <div className="bg-muted/30 border border-border/70 rounded-xl p-3.5 space-y-2.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <UserIcon className="w-3.5 h-3.5 text-primary" />
            <span>Lead Profile & Readiness</span>
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-background border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Lead Score</span>
              <span className="font-bold text-primary text-sm">{conversation.leadScore} / 100</span>
            </div>
            <div className="p-2 rounded-lg bg-background border border-border/50">
              <span className="text-[10px] text-muted-foreground block">DNC Status</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                <ShieldCheckIcon className="w-3.5 h-3.5" /> Clean
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-background border border-border/50">
            <span className="text-[10px] text-muted-foreground block">Qualification Checklist:</span>
            <div className="mt-1 space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span>• Budget ($875k - $950k):</span>
                <span className="text-emerald-500 font-semibold">Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Timeline (30 days):</span>
                <span className="text-emerald-500 font-semibold">Immediate</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• Pre-Approved (Wells Fargo):</span>
                <span className="text-emerald-500 font-semibold">Yes</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Tap AI Draft Suggestions */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SparklesIcon className="w-3.5 h-3.5 text-primary" />
            <span>Smart Recommendations</span>
          </h4>

          {smartSuggestions.map((item, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/80 hover:border-primary/50 transition-all rounded-xl p-3 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">{item.title}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {item.confidence}% match
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg leading-relaxed">
                "{item.text}"
              </p>
              <button
                type="button"
                onClick={() => {
                  onApplyDraft(item.text)
                  onClose()
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <PaperAirplaneIcon className="w-3 h-3" />
                <span>Use Draft & Send</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
