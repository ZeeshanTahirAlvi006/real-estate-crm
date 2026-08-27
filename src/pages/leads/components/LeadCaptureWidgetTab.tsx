import React, { useState } from 'react'
import {
  useGetLeadSourcesQuery,
  useCaptureWidgetLeadMutation,
} from '@/store/api/leadsApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CodeBracketIcon,
  ClipboardIcon,
  CheckIcon,
  SparklesIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function LeadCaptureWidgetTab() {
  const { data: sourcesData } = useGetLeadSourcesQuery()
  const sources = sourcesData?.leadSources || []

  // Filter or pick first website/organic source with captureKey
  const defaultSource = sources.find((s) => s.type === 'website') || sources[0]
  const [selectedSourceId, setSelectedSourceId] = useState<string>(defaultSource?.id || '')

  const currentSource = sources.find((s) => s.id === selectedSourceId) || defaultSource
  const captureKey = currentSource?.captureKey || '00000000-0000-0000-0000-000000000000'

  // Customizer State
  const [widgetTitle, setWidgetTitle] = useState('Schedule a Private Showing')
  const [widgetSubtext, setWidgetSubtext] = useState('Connect with a local luxury specialist within minutes.')
  const [buttonText, setButtonText] = useState('Request Private Tour')
  const [accentColor, setAccentColor] = useState('#2563eb')
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  // Live Test Form State
  const [testFirstName, setTestFirstName] = useState('')
  const [testLastName, setTestLastName] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testAddress, setTestAddress] = useState('800 Brazos St #400, Austin TX')
  const [testPrice, setTestPrice] = useState(750000)
  const [testZipCode, setTestZipCode] = useState('78701')
  const [testMessage, setTestMessage] = useState('Pre-approved cash buyer looking to view this listing tomorrow.')
  const [submissionResult, setSubmissionResult] = useState<{ contactId: string; isNew: boolean } | null>(null)

  const [captureLead, { isLoading: isSubmitting }] = useCaptureWidgetLeadMutation()

  const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api'

  // Embed Snippets
  const scriptEmbedCode = `<!-- PropPulse OS Lead Capture Widget -->
<div id="proppulse-lead-widget" data-capture-key="${captureKey}"></div>
<script src="${apiBaseUrl}/widget/lead-capture.js" async defer></script>`

  const iframeEmbedCode = `<iframe 
  src="${apiBaseUrl}/embed/lead-form?key=${captureKey}" 
  width="100%" 
  height="540" 
  frameborder="0" 
  style="border:none;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);"
></iframe>`

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSnippet(label)
    toast.success(`${label} copied to clipboard!`)
    setTimeout(() => setCopiedSnippet(null), 2000)
  }

  const handleLiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testFirstName.trim() || !testLastName.trim()) {
      toast.error('First and Last name are required')
      return
    }

    try {
      const res = await captureLead({
        captureKey,
        firstName: testFirstName.trim(),
        lastName: testLastName.trim(),
        email: testEmail.trim() || undefined,
        phone: testPhone.trim() || undefined,
        propertyAddress: testAddress.trim() || undefined,
        propertyPrice: Number(testPrice) || undefined,
        zipCode: testZipCode.trim() || undefined,
        message: testMessage.trim() || undefined,
      }).unwrap()

      setSubmissionResult(res)
      toast.success(res.isNew ? 'New lead successfully captured & routed!' : 'Reinquiry touchpoint recorded!')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to capture lead')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <GlobeAltIcon className="w-4 h-4 text-primary" />
            <span>Public Website Lead Capture Widget</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Embed high-converting, mobile-responsive inquiry forms on your brokerage website, landing pages, and single-property listings.
          </p>
        </div>

        {/* Source Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <Label className="text-xs font-semibold text-muted-foreground">Source Key:</Label>
          <select
            value={selectedSourceId || defaultSource?.id || ''}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Embed Code & Customizer (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Embed Snippets Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CodeBracketIcon className="w-4 h-4 text-primary" />
                Embed Code Snippets
              </CardTitle>
              <CardDescription className="text-xs">
                Copy and paste these snippets directly into WordPress, Webflow, Squarespace, or custom React websites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* JavaScript Tag */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Standard Script Tag (Recommended)</span>
                  <button
                    onClick={() => handleCopy(scriptEmbedCode, 'Script Tag')}
                    className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedSnippet === 'Script Tag' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'Script Tag' ? 'Copied' : 'Copy Snippet'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-muted/40 border border-border/70 font-mono text-[11px] overflow-x-auto text-muted-foreground">
                  {scriptEmbedCode}
                </pre>
              </div>

              {/* iFrame Embed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">iFrame Embed</span>
                  <button
                    onClick={() => handleCopy(iframeEmbedCode, 'iFrame Code')}
                    className="text-primary hover:underline text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedSnippet === 'iFrame Code' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'iFrame Code' ? 'Copied' : 'Copy Snippet'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-muted/40 border border-border/70 font-mono text-[11px] overflow-x-auto text-muted-foreground">
                  {iframeEmbedCode}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Widget Styling Customizer */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-purple-500" />
                Widget Text & Styling Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Customize titles, call-to-action text, and theme colors to match your brand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Widget Headline</Label>
                  <Input
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Submit Button CTA</Label>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sub-headline / Promise</Label>
                <Input
                  value={widgetSubtext}
                  onChange={(e) => setWidgetSubtext(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary Accent Color</Label>
                <div className="flex items-center gap-2">
                  {['#2563eb', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#0f172a'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        accentColor === color ? 'scale-110 ring-2 ring-offset-2 ring-primary' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-8 w-24 font-mono text-xs ml-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Widget Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-md overflow-hidden">
            <div
              className="p-5 text-white space-y-1"
              style={{ backgroundColor: accentColor }}
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
                  Live Test Sandbox
                </Badge>
                <span className="text-[10px] text-white/80 font-mono">Public Form</span>
              </div>
              <h3 className="font-bold text-base">{widgetTitle}</h3>
              <p className="text-xs text-white/80">{widgetSubtext}</p>
            </div>

            <CardContent className="p-5">
              {submissionResult ? (
                <div className="text-center py-8 space-y-3 animate-in fade-in duration-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircleIcon className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">Inquiry Received!</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Thank you! Your request has been securely processed and routed to an agent.
                  </p>
                  <Badge variant="outline" className="font-mono text-[10px] py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Contact ID: {submissionResult.contactId}
                  </Badge>
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSubmissionResult(null)
                        setTestFirstName('')
                        setTestLastName('')
                        setTestEmail('')
                        setTestPhone('')
                      }}
                      className="text-xs"
                    >
                      Submit Another Test Lead
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLiveSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">First Name *</Label>
                      <Input
                        required
                        value={testFirstName}
                        onChange={(e) => setTestFirstName(e.target.value)}
                        placeholder="Jane"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Last Name *</Label>
                      <Input
                        required
                        value={testLastName}
                        onChange={(e) => setTestLastName(e.target.value)}
                        placeholder="Doe"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Email Address</Label>
                      <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Phone Number</Label>
                      <Input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Property Interest Address</Label>
                    <Input
                      value={testAddress}
                      onChange={(e) => setTestAddress(e.target.value)}
                      placeholder="e.g. 1200 S Congress Ave #402"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Price / Budget ($)</Label>
                      <Input
                        type="number"
                        value={testPrice}
                        onChange={(e) => setTestPrice(Number(e.target.value) || 0)}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">ZIP Code</Label>
                      <Input
                        value={testZipCode}
                        onChange={(e) => setTestZipCode(e.target.value)}
                        placeholder="78701"
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Special Requests / Message</Label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={2}
                      className="w-full rounded-md border border-border p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ backgroundColor: accentColor }}
                    className="w-full text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        Submitting Inquiry...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        {buttonText}
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
