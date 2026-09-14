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
  useIngestGoogleAdsLeadMutation,
} from '@/store/api/leadsApi'
import { toast } from 'sonner'

export type PresetType = 'zameen' | 'graana' | 'olx' | 'google_ads' | 'meta' | 'whatsapp' | 'website'

interface WebhookTesterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSourceId?: string
  initialPreset?: PresetType
}

const PRESET_PAYLOADS: Record<string, any> = {
  zameen: {
    source: 'Zameen.com',
    name: 'Muhammad Usman',
    phone: '0300-1234567',
    email: 'usman.dha@gmail.com',
    propertyAddress: '1 Kanal Luxury Villa, Phase 6, DHA Lahore',
    propertyPrice: 65000000,
    zipCode: '54000',
    message: 'Pre-approved cash buyer interested in immediate inspection. Please call on WhatsApp.',
    zameenPropertyId: '18492019',
  },
  graana: {
    source: 'Graana.com',
    name: 'Hamza Tariq',
    phone: '+92 321 9876543',
    email: 'hamza.tariq@outlook.com',
    propertyAddress: '10 Marla Designer House, Sector F-7, Islamabad',
    propertyPrice: 52000000,
    zipCode: '44000',
    message: 'Is the price negotiable? Available for site visit this Sunday.',
    graanaPropertyId: 'GR-94821',
  },
  olx: {
    source: 'OLX Pakistan',
    name: 'Chaudhry Bilal',
    phone: '0345-5551234',
    propertyAddress: '5 Marla Brand New House, Bahria Town, Rawalpindi',
    propertyPrice: 18500000,
    zipCode: '46000',
    message: 'AOA bhai, is this still available? Final demand kya hai? Call/WhatsApp me at 0345-5551234',
    olxChatUrl: 'https://www.olx.com.pk/myolx/conversations/10928301',
  },
  google_ads: {
    source: 'Google Ads',
    lead_id: 'gads-lead-pk-98214',
    google_key: 'YOUR_CONFIGURED_WEBHOOK_SECRET',
    is_test: false,
    form_id: '1049281',
    campaign_id: '7829104',
    user_column_data: [
      { column_id: 'FULL_NAME', string_value: 'Zeeshan Alvi' },
      { column_id: 'EMAIL', string_value: 'zeeshan.alvi@pkproperties.com' },
      { column_id: 'PHONE_NUMBER', string_value: '0300-8451234' },
      { column_id: 'CITY', string_value: 'Lahore' },
      { column_id: 'POSTAL_CODE', string_value: '54000' },
      { column_id: 'STREET_ADDRESS', string_value: 'Main Boulevard, Gulberg III' },
    ],
  },
  meta: {
    source: 'Meta Ads',
    campaign: 'Lahore Smart City Investment Wave',
    firstName: 'Ayesha',
    lastName: 'Khan',
    phone: '+92 333 4455667',
    email: 'ayesha.khan@pktech.org',
    propertyAddress: '7 Marla Commercial Plot, Lahore Smart City',
    propertyPrice: 22000000,
    zipCode: '54000',
    message: 'Overseas Pakistani investor looking for installment plan details.',
  },
  whatsapp: {
    source: 'WhatsApp',
    name: 'Taimoor Shah',
    phone: '0302-8877665',
    propertyAddress: '1 Kanal Plot, Sector C, Bahria Town Lahore',
    propertyPrice: 38000000,
    zipCode: '54000',
    message: 'Salam, I saw your listing for Bahria Town 1 Kanal plot. Is it direct from owner? Please share video and map location.',
  },
  website: {
    firstName: 'Farhan',
    lastName: 'Siddiqui',
    phone: '0334-1122334',
    email: 'farhan.siddiqui@gmail.com',
    propertyAddress: '3-Bed Luxury Apartment, Clifton Block 4, Karachi',
    propertyPrice: 42000000,
    zipCode: '75600',
    message: 'Looking for a 3-bed sea-facing apartment in Clifton with dedicated parking.',
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
  const [activePreset, setActivePreset] = useState<PresetType>('zameen')
  const [payloadText, setPayloadText] = useState(JSON.stringify(PRESET_PAYLOADS.zameen, null, 2))
  const [authMethod, setAuthMethod] = useState<'apikey' | 'hmac'>('apikey')

  // Fetch decrypted secret for API Key or HMAC test calculation
  const { data: selectedSourceWithSecret } = useGetLeadSourceByIdQuery(
    { id: selectedSourceId, includeSecret: true },
    { skip: !selectedSourceId }
  )

  const [ingestWebhook, { isLoading: isWebhookIngesting }] = useIngestWebhookLeadMutation()
  const [captureWidget, { isLoading: isCaptureIngesting }] = useCaptureWidgetLeadMutation()
  const [ingestGoogleAds, { isLoading: isGoogleAdsIngesting }] = useIngestGoogleAdsLeadMutation()

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

      const preset = initialPreset || 'zameen'
      setActivePreset(preset)
      const basePayload = JSON.parse(JSON.stringify(PRESET_PAYLOADS[preset] || PRESET_PAYLOADS.zameen))
      if (preset === 'google_ads' && selectedSourceWithSecret?.webhookSecret && selectedSourceWithSecret.webhookSecret !== '[decryption_failed]') {
        basePayload.google_key = selectedSourceWithSecret.webhookSecret
      }
      setPayloadText(JSON.stringify(basePayload, null, 2))
      setResult(null)
    }
  }, [open, initialSourceId, initialPreset, sources])

  // Automatically insert real secret into Google Ads payload when decrypted secret loads
  useEffect(() => {
    if (activePreset === 'google_ads' && selectedSourceWithSecret?.webhookSecret && selectedSourceWithSecret.webhookSecret !== '[decryption_failed]') {
      try {
        const current = JSON.parse(payloadText)
        if (!current.google_key || current.google_key === 'YOUR_CONFIGURED_WEBHOOK_SECRET') {
          current.google_key = selectedSourceWithSecret.webhookSecret
          setPayloadText(JSON.stringify(current, null, 2))
        }
      } catch {}
    }
  }, [selectedSourceWithSecret, activePreset])

  const handleSelectPreset = (preset: PresetType) => {
    setActivePreset(preset)
    const basePayload = JSON.parse(JSON.stringify(PRESET_PAYLOADS[preset]))
    if (preset === 'google_ads' && selectedSourceWithSecret?.webhookSecret && selectedSourceWithSecret.webhookSecret !== '[decryption_failed]') {
      basePayload.google_key = selectedSourceWithSecret.webhookSecret
    }
    setPayloadText(JSON.stringify(basePayload, null, 2))
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
    } else if (activePreset === 'google_ads') {
      if (!selectedSourceId) {
        toast.error('Please select a lead source')
        return
      }

      const secret = selectedSourceWithSecret?.webhookSecret
      if (
        (!parsedPayload.google_key || parsedPayload.google_key === 'YOUR_CONFIGURED_WEBHOOK_SECRET') &&
        secret &&
        secret !== '[decryption_failed]'
      ) {
        parsedPayload.google_key = secret
      }

      try {
        const res = await ingestGoogleAds({
          sourceId: selectedSourceId,
          payload: parsedPayload,
        }).unwrap()

        setResult({
          success: true,
          contactId: res.contactId,
          isNew: res.isNew,
          routed: true,
          timestamp: new Date().toLocaleTimeString(),
        })
        if (res.isTest) {
          toast.success('Test lead handshake received successfully (HTTP 200 OK)!')
        } else {
          toast.success(res.isNew ? 'Google Ads lead ingested & routed successfully!' : 'Reinquiry touchpoint logged!')
        }
      } catch (err: any) {
        setResult({
          success: false,
          error: err?.data?.message || err?.message || 'Google Ads webhook rejected by server',
          timestamp: new Date().toLocaleTimeString(),
        })
        toast.error(err?.data?.message || err?.message || 'Google Ads webhook execution failed')
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

  const isProcessing = isWebhookIngesting || isCaptureIngesting || isGoogleAdsIngesting

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
                onClick={() => handleSelectPreset('zameen')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'zameen'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🟢 Zameen.com
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('graana')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'graana'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔴 Graana.com
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('olx')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'olx'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🏢 OLX Pakistan
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('google_ads')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'google_ads'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🔷 Google Ads Form
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
                🟣 Meta Ads Form
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('whatsapp')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors text-xs ${
                  activePreset === 'whatsapp'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                💬 WhatsApp Lead
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
                🌐 Capture Widget
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
