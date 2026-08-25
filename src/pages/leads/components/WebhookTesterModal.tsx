import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CommandLineIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface WebhookTesterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const samplePayloads: Record<string, string> = {
  zillow: JSON.stringify(
    {
      source: 'Zillow',
      event: 'lead.inbound',
      contact: {
        firstName: 'Alexander',
        lastName: 'Wright',
        phone: '+1 (555) 749-3021',
        email: 'alex.wright@gmail.com',
        propertyInterest: '1420 Highland Ave, Austin TX',
        pricePoint: 850000,
        inquiryMessage: 'Can we schedule a private walkthrough this Saturday?',
      },
    },
    null,
    2
  ),
  meta: JSON.stringify(
    {
      source: 'Meta Ads (Facebook)',
      campaign: 'Austin Luxury Condos Q3',
      form_id: 'fb_form_89234',
      lead: {
        firstName: 'Samantha',
        lastName: 'Hayes',
        phone: '+1 (555) 632-1190',
        email: 'samantha.h@cloudtech.io',
        budget: '$1,200,000+',
        financing: 'Pre-Approved (Jumbo Loan)',
      },
    },
    null,
    2
  ),
  whatsapp: JSON.stringify(
    {
      source: 'WhatsApp Cloud API',
      message_id: 'wamid.HBgLMjQ5',
      from: '+1 (555) 902-8812',
      contact_name: 'David Chen',
      body: 'Looking for 3-bedroom investment properties near downtown under $600k.',
    },
    null,
    2
  ),
}

export const WebhookTesterModal: React.FC<WebhookTesterModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [selectedSource, setSelectedSource] = useState<'zillow' | 'meta' | 'whatsapp'>('zillow')
  const [payloadText, setPayloadText] = useState(samplePayloads.zillow)
  const [isProcessing, setIsProcessing] = useState(false)
  const [responseResult, setResponseResult] = useState<{
    status: number
    leadScore: number
    routedTo: string
    aiIsaTriggered: boolean
  } | null>(null)

  const handleSelectSource = (src: 'zillow' | 'meta' | 'whatsapp') => {
    setSelectedSource(src)
    setPayloadText(samplePayloads[src])
    setResponseResult(null)
  }

  const handleExecuteWebhook = () => {
    setIsProcessing(true)
    setResponseResult(null)

    setTimeout(() => {
      setIsProcessing(false)
      setResponseResult({
        status: 200,
        leadScore: selectedSource === 'meta' ? 94 : selectedSource === 'zillow' ? 88 : 79,
        routedTo: 'Sarah Jenkins (Round Robin)',
        aiIsaTriggered: true,
      })
      toast.success('Webhook received, parsed & ingested into CRM pipeline!')
    }, 600)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CommandLineIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Universal Ingestion & Webhook Simulator
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Dispatch raw test payloads from Zillow, Meta Ads, and WhatsApp to verify parser & routing engine
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Source Selector Tabs */}
          <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => handleSelectSource('zillow')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                selectedSource === 'zillow'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🔵 Zillow Inbound Parser
            </button>
            <button
              type="button"
              onClick={() => handleSelectSource('meta')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                selectedSource === 'meta'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🟣 Meta Ads Lead Form
            </button>
            <button
              type="button"
              onClick={() => handleSelectSource('whatsapp')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                selectedSource === 'whatsapp'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🟢 WhatsApp Cloud API
            </button>
          </div>

          {/* JSON Payload Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                POST Request Payload (JSON)
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Endpoint: https://api.proppulse.io/v1/webhooks/ingest
              </span>
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="w-full font-mono text-xs rounded-xl bg-muted/30 border border-border/70 p-3.5 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed text-foreground"
            />
          </div>

          {/* Execution Response */}
          {responseResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>200 OK — Lead Ingested & Normalized</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  Score: {responseResult.leadScore}/100
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-500/20 text-muted-foreground">
                <div>
                  <span>Assigned Agent:</span>{' '}
                  <strong className="text-foreground">{responseResult.routedTo}</strong>
                </div>
                <div>
                  <span>Omnichannel AI ISA:</span>{' '}
                  <strong className="text-emerald-500">Autonomous Sub-30s Triggered</strong>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteWebhook}
              disabled={isProcessing}
              className="shadow-xs font-semibold"
            >
              {isProcessing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 mr-1.5 animate-spin" />
                  Processing Ingestion...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-1.5" />
                  Send Test Payload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
