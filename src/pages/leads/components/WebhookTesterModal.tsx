import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  CommandLineIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline'
import {
  useGetLeadSourcesQuery,
  useGetLeadSourceByIdQuery,
  useIngestWebhookLeadMutation,
  useCaptureWidgetLeadMutation,
} from '@/store/api/leadsApi'
import { toast } from 'sonner'

export type PresetType = 'zillow' | 'realtor' | 'meta' | 'website'

interface WebhookTesterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSourceId?: string
  initialPreset?: PresetType
}

const PRESET_PAYLOADS: Record<string, any> = {
  zillow: {
    source: 'Zillow',
    firstName: 'Alexander',
    lastName: 'Wright',
    phone: '+1 (555) 749-3021',
    email: 'alex.wright@gmail.com',
    propertyAddress: '1420 Highland Ave, Austin TX 78701',
    propertyPrice: 850000,
    zipCode: '78701',
    message: 'We are a pre-approved cash buyer looking to schedule a private walkthrough this Saturday ASAP.',
  },
  realtor: {
    source: 'Realtor.com',
    firstName: 'Eleanor',
    lastName: 'Vance',
    phone: '+1 (555) 882-9014',
    email: 'eleanor.vance@outlook.com',
    propertyAddress: '2405 River Oaks Blvd, Austin TX 78703',
    propertyPrice: 1250000,
    zipCode: '78703',
    message: 'Interested in making an offer. Moving for corporate relocation next month.',
  },
  meta: {
    source: 'Meta Ads',
    campaign: 'Austin Luxury Condos Q3',
    firstName: 'Samantha',
    lastName: 'Hayes',
    phone: '+1 (555) 632-1190',
    email: 'samantha.h@cloudtech.io',
    propertyAddress: '70 Rainey St #1802, Austin TX 78701',
    propertyPrice: 920000,
    zipCode: '78701',
    message: 'Pre-approved jumbo loan buyer. Requesting floor plans and HOA docs.',
  },
  website: {
    firstName: 'Marcus',
    lastName: 'Brody',
    phone: '+1 (555) 441-2900',
    email: 'marcus.brody@museum.edu',
    propertyAddress: '310 Colorado St, Austin TX 78701',
    propertyPrice: 650000,
    zipCode: '78701',
    message: 'Looking for a 2-bed downtown condo under $700k with parking.',
  },
}

// Client-side SHA-256 HMAC generator helper for the testing tool
async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const WebhookTesterModal: React.FC<WebhookTesterModalProps> = ({
  open,
  onOpenChange,
  initialSourceId,
  initialPreset,
}) => {
  const { data: sourcesData } = useGetLeadSourcesQuery()
  const sources = sourcesData?.leadSources || []

  const [selectedSourceId, setSelectedSourceId] = useState<string>('')
  const [activePreset, setActivePreset] = useState<PresetType>('zillow')
  const [payloadText, setPayloadText] = useState(JSON.stringify(PRESET_PAYLOADS.zillow, null, 2))
  const [authMethod, setAuthMethod] = useState<'apikey' | 'hmac'>('apikey')

  // Fetch decrypted secret for API Key or HMAC test calculation
  const { data: selectedSourceWithSecret } = useGetLeadSourceByIdQuery(
    { id: selectedSourceId, includeSecret: true },
    { skip: !selectedSourceId }
  )

  const [ingestWebhook, { isLoading: isWebhookIngesting }] = useIngestWebhookLeadMutation()
  const [captureWidget, { isLoading: isCaptureIngesting }] = useCaptureWidgetLeadMutation()

  const [result, setResult] = useState<{
    success: boolean
    contactId?: string
    isNew?: boolean
    routed?: boolean
    error?: string
    timestamp: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      if (initialSourceId) {
        setSelectedSourceId(initialSourceId)
      } else if (sources.length > 0 && !selectedSourceId) {
        setSelectedSourceId(sources[0].id)
      }

      const preset = initialPreset || 'zillow'
      setActivePreset(preset)
      setPayloadText(JSON.stringify(PRESET_PAYLOADS[preset] || PRESET_PAYLOADS.zillow, null, 2))
      setResult(null)
    }
  }, [open, initialSourceId, initialPreset, sources])

  const handleSelectPreset = (preset: PresetType) => {
    setActivePreset(preset)
    setPayloadText(JSON.stringify(PRESET_PAYLOADS[preset], null, 2))
    setResult(null)
  }

  const handleExecute = async () => {
    setResult(null)
    let parsedPayload: any
    try {
      parsedPayload = JSON.parse(payloadText)
    } catch {
      toast.error('Invalid JSON payload syntax')
      return
    }

    const currentSource = selectedSourceWithSecret || sources.find((s) => s.id === selectedSourceId)

    if (activePreset === 'website') {
      // Test public capture endpoint
      if (!currentSource?.captureKey) {
        toast.error('No captureKey found for selected source')
        return
      }

      try {
        const res = await captureWidget({
          captureKey: currentSource.captureKey,
          firstName: parsedPayload.firstName || 'Anonymous',
          lastName: parsedPayload.lastName || 'Lead',
          email: parsedPayload.email,
          phone: parsedPayload.phone,
          propertyAddress: parsedPayload.propertyAddress,
          propertyPrice: parsedPayload.propertyPrice,
          zipCode: parsedPayload.zipCode,
          message: parsedPayload.message,
        }).unwrap()

        setResult({
          success: true,
          contactId: res.contactId,
          isNew: res.isNew,
          timestamp: new Date().toLocaleTimeString(),
        })
        toast.success(res.isNew ? 'New lead ingested & routed!' : 'Lead reinquiry touchpoint recorded!')
      } catch (err: any) {
        setResult({
          success: false,
          error: err?.data?.message || 'Capture ingestion failed',
          timestamp: new Date().toLocaleTimeString(),
        })
        toast.error(err?.data?.message || 'Capture ingestion failed')
      }
    } else {
      // Test universal webhook endpoint with API Key or HMAC
      if (!selectedSourceId) {
        toast.error('Please select a lead source')
        return
      }

      let signature: string | undefined
      let apiKey: string | undefined
      const secret = selectedSourceWithSecret?.webhookSecret

      if (authMethod === 'apikey') {
        if (secret && secret !== '[decryption_failed]') {
          apiKey = secret
        } else {
          apiKey = 'test_api_key'
        }
      } else {
        // HMAC SHA-256
        if (secret && secret !== '[decryption_failed]') {
          signature = await computeHmacSha256(secret, payloadText)
        } else {
          // Fallback demo signature
          signature = '0000000000000000000000000000000000000000000000000000000000000000'
        }
      }

      try {
        const res = await ingestWebhook({
          sourceId: selectedSourceId,
          payload: parsedPayload,
          signature,
          apiKey,
        }).unwrap()

        setResult({
          success: true,
          contactId: res.contactId,
          isNew: res.isNew,
          routed: res.routed,
          timestamp: new Date().toLocaleTimeString(),
        })
        toast.success(res.isNew ? 'Webhook ingested & routed successfully!' : 'Reinquiry touchpoint logged!')
      } catch (err: any) {
        setResult({
          success: false,
          error: err?.data?.message || 'Webhook rejected by server',
          timestamp: new Date().toLocaleTimeString(),
        })
        toast.error(err?.data?.message || 'Webhook execution failed')
      }
    }
  }

  const isProcessing = isWebhookIngesting || isCaptureIngesting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50">
              <CommandLineIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                Live Webhook & Ingestion Simulator
              </DialogTitle>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Dispatch actual test payloads with API Key or HMAC SHA-256 signatures to verify parsing, deduplication, scoring, and routing engine execution.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Target Lead Source Selector & Auth Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Target Lead Source</Label>
              <select
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#1A2E26] text-xs font-medium text-[#273338] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#9CB080]"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Auth Method</Label>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#EDF2EB]/60 dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/50">
                <button
                  type="button"
                  onClick={() => setAuthMethod('apikey')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    authMethod === 'apikey'
                      ? 'bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white shadow-xs'
                      : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
                  }`}
                  title="Direct API Key (x-api-key / Bearer token) — recommended for Zapier & Make"
                >
                  <KeyIcon className="w-3.5 h-3.5 text-[#2B5748] dark:text-[#9CB080]" />
                  <span>API Key (Zapier)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('hmac')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    authMethod === 'hmac'
                      ? 'bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white shadow-xs'
                      : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
                  }`}
                  title="HMAC SHA-256 Signature (x-webhook-signature)"
                >
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span>HMAC SHA-256</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preset Payload Tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Sample Portal Payloads</Label>
            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/60 flex-wrap">
              <button
                type="button"
                onClick={() => handleSelectPreset('zillow')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'zillow'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔵 Zillow Inbound
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('realtor')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'realtor'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔴 Realtor.com
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('meta')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'meta'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🟣 Meta Lead Form
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('website')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'website'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🌐 Public Capture Widget
              </button>
            </div>
          </div>

          {/* JSON Payload Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                JSON POST Payload Body
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Content-Type: application/json
              </span>
            </div>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="w-full font-mono text-xs rounded-xl bg-muted/30 border border-border/70 p-3.5 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed text-foreground"
            />
          </div>

          {/* Live Execution Result Output */}
          {result && (
            <div
              className={`p-4 rounded-2xl border space-y-2 animate-in fade-in duration-200 ${
                result.success
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 font-bold text-xs ${
                    result.success
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-destructive'
                  }`}
                >
                  {result.success ? (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>201 CREATED — Payload Ingested & Scored</span>
                    </>
                  ) : (
                    <>
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span>Ingestion Error</span>
                    </>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{result.timestamp}</span>
              </div>

              {result.success ? (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-500/20 text-muted-foreground">
                  <div>
                    <span>Contact ID:</span>{' '}
                    <code className="text-foreground font-mono text-[11px] font-bold">{result.contactId}</code>
                  </div>
                  <div>
                    <span>Status:</span>{' '}
                    <Badge variant="outline" className="text-[10px] py-0 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {result.isNew ? '✨ New Contact Created' : '🔄 Reinquiry Logged'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-destructive pt-1 border-t border-destructive/20">
                  {result.error}
                </p>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={isProcessing}
              className="shadow-xs font-semibold gap-1.5"
            >
              {isProcessing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  Dispatching Ingestion...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4" />
                  Dispatch Test Payload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default WebhookTesterModal
