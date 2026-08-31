import React, { useState } from 'react'
import {
  useGetWhatsAppTemplatesQuery,
  useCreateWhatsAppBroadcastMutation,
} from '@/store/api/communicationApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MegaphoneIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface WhatsAppBroadcastModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const WhatsAppBroadcastModal: React.FC<WhatsAppBroadcastModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: templates = [] } = useGetWhatsAppTemplatesQuery()
  const [createBroadcast, { isLoading: isBroadcasting }] = useCreateWhatsAppBroadcastMutation()

  const [title, setTitle] = useState('Weekend Open House VIP Alert')
  const [selectedTemplateName, setSelectedTemplateName] = useState('property_brochure_alert')
  const [targetAudience, setTargetAudience] = useState<
    'all' | 'dormant' | 'high_score' | 'buyers' | 'sellers' | 'custom_tag'
  >('buyers')
  const [targetTag] = useState('')

  const handleExecuteBroadcast = async () => {
    if (!title.trim() || !selectedTemplateName) {
      toast.error('Please specify broadcast campaign title and template')
      return
    }

    try {
      const result = await createBroadcast({
        title,
        templateName: selectedTemplateName,
        targetAudience,
        targetTag: targetTag.trim() || undefined,
      }).unwrap()

      toast.success(
        `WhatsApp broadcast "${result.title}" initiated to ${result.recipientCount} verified contacts!`
      )
      onOpenChange(false)
    } catch {
      toast.error('Failed to initiate WhatsApp broadcast campaign')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MegaphoneIcon className="w-5 h-5" />
            </div>
            <span>Broadcast WhatsApp Campaign</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mass outreach with dynamic personalization, TCPA opt-out checks, and real-time delivery tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Campaign Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Campaign Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Price Reductions Broadcast"
              className="h-8 text-xs"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select WhatsApp Template</Label>
            <select
              value={selectedTemplateName}
              onChange={(e) => setSelectedTemplateName(e.target.value)}
              className="w-full h-9 rounded-md bg-muted px-3 text-xs font-medium border border-border/70 focus:outline-none"
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.name}>
                  {tmpl.title} ({tmpl.category})
                </option>
              ))}
            </select>
          </div>

          {/* Target Audience Segment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Audience Segment</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'buyers', label: 'Active Home Buyers', desc: 'Leads with saved search criteria' },
                { id: 'high_score', label: 'Hot Leads (Score ≥ 75)', desc: 'High conversion probability' },
                { id: 'dormant', label: 'Dormant Re-Engagement', desc: 'No contact in 90+ days' },
                { id: 'all', label: 'All Database Leads', desc: 'Entire opted-in contact list' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => setTargetAudience(seg.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    targetAudience === seg.id
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <span className="font-bold block text-foreground">{seg.label}</span>
                  <span className="text-[10px] text-muted-foreground">{seg.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opt-Out & Safety Assurance Banner */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <ShieldCheckIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Automated TCPA & Opt-Out Shield</span>
              <p className="text-[11px] opacity-90">
                Contacts marked as DNC or with active opt-out flags are automatically excluded from the broadcast batch.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExecuteBroadcast}
            disabled={isBroadcasting || !title.trim()}
            className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <MegaphoneIcon className="w-3.5 h-3.5" />
            <span>{isBroadcasting ? 'Dispatching...' : 'Launch WhatsApp Broadcast'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
