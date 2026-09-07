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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
  const [widgetTitle, setWidgetTitle] = useState('Schedule a Showing')
  const [widgetSubtext, setWidgetSubtext] = useState('Connect with a local property specialist.')
  const [buttonText, setButtonText] = useState('Request Tour')
  const [accentColor, setAccentColor] = useState('#9CB080')
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

  // Live Test Form State
  const [testFirstName, setTestFirstName] = useState('')
  const [testLastName, setTestLastName] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testPhone, setTestPhone] = useState('')
  const [testAddress, setTestAddress] = useState('800 Brazos St #400, Austin TX')
  const [testPrice, setTestPrice] = useState(750000)
  const [testZipCode, setTestZipCode] = useState('78701')
  const [testMessage, setTestMessage] = useState('Pre-approved buyer looking to view this listing.')
  const [submissionResult, setSubmissionResult] = useState<{ contactId: string; isNew: boolean } | null>(null)

  const [captureLead, { isLoading: isSubmitting }] = useCaptureWidgetLeadMutation()

  const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api'

  // Embed Snippets
  const scriptEmbedCode = `<!-- PropPulse OS Lead Capture Widget -->
<div id="proppulse-lead-widget" data-capture-key="${captureKey}"></div>
<script src="${apiBaseUrl}/widget/lead-capture.js" async defer></script>`

  const iframeEmbedCode = `<iframe
  src="${apiBaseUrl}/widget/embed?key=${captureKey}&theme=auto"
  width="100%"
  height="460"
  frameborder="0"
  style="border-radius: 12px; overflow: hidden;"
></iframe>`

  const handleCopySnippet = (snippet: string, label: string) => {
    navigator.clipboard.writeText(snippet)
    setCopiedSnippet(label)
    toast.success(`${label} copied!`)
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
        propertyAddress: testAddress || undefined,
        propertyPrice: testPrice ? Number(testPrice) : undefined,
        zipCode: testZipCode || undefined,
        message: testMessage,
      }).unwrap()

      toast.success('Inquiry captured!')
      setSubmissionResult(res)
    } catch {
      toast.error('Failed to submit inquiry')
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner / Source Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/60">
        <div>
          <h3 className="font-bold text-sm text-[#273338] dark:text-white">
            Capture Widget
          </h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
            Embeddable capture widget for landing pages and portals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6] shrink-0">Source:</Label>
          <select
            value={selectedSourceId}
            onChange={(e) => setSelectedSourceId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#1A2E26] text-xs font-medium text-[#273338] dark:text-white"
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
          {/* 1. Embed Snippet Options */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="code" size={18} className="text-[#618764]" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Copy and paste this snippet into your website or CMS.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              {/* Script tag option */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#273338] dark:text-white">JavaScript Widget</span>
                  <button
                    onClick={() => handleCopySnippet(scriptEmbedCode, 'JS Snippet')}
                    className="text-[#2B5748] dark:text-[#9CB080] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'JS Snippet' ? (
                      <>
                        <MaterialIcon name="check" size={13} className="text-[#618764]" />
                        <span className="text-[#618764]">Copied</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="content_copy" size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#EDF2EB]/50 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 font-mono text-[11px] select-all text-[#4A5D54] dark:text-[#A0B2A6] overflow-x-auto whitespace-pre">
                  {scriptEmbedCode}
                </div>
              </div>

              {/* iframe option */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#273338] dark:text-white">iFrame Embed</span>
                  <button
                    onClick={() => handleCopySnippet(iframeEmbedCode, 'iFrame Code')}
                    className="text-[#2B5748] dark:text-[#9CB080] hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSnippet === 'iFrame Code' ? (
                      <>
                        <MaterialIcon name="check" size={13} className="text-[#618764]" />
                        <span className="text-[#618764]">Copied</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="content_copy" size={13} />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#EDF2EB]/50 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 font-mono text-[11px] select-all text-[#4A5D54] dark:text-[#A0B2A6] overflow-x-auto whitespace-pre">
                  {iframeEmbedCode}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Style Customizer */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="tune" size={18} className="text-[#618764]" />
                <span>Customize Form</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Adjust headers, labels, and color theme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">Form Title</Label>
                  <Input
                    value={widgetTitle}
                    onChange={(e) => setWidgetTitle(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">Button CTA</Label>
                  <Input
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#273338] dark:text-white">Subtitle</Label>
                <Input
                  value={widgetSubtext}
                  onChange={(e) => setWidgetSubtext(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#273338] dark:text-white">Accent Color</Label>
                <div className="flex items-center gap-2">
                  {['#9CB080', '#618764', '#2B5748', '#273338', '#475569', '#059669'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                        accentColor === color ? 'scale-110 ring-2 ring-offset-2 ring-[#9CB080]' : 'hover:scale-105'
                      }`}
                    />
                  ))}
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-8 w-24 font-mono text-xs ml-2 bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Widget Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-md overflow-hidden bg-white dark:bg-[#254238]">
            <div
              className="p-5 space-y-1 transition-colors"
              style={{ backgroundColor: accentColor }}
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px]">
                  Live Preview
                </Badge>
                <span className="text-[10px] text-white/90 font-mono">Public Form</span>
              </div>
              <h3 className="font-bold text-base text-white">{widgetTitle}</h3>
              <p className="text-xs text-white/90">{widgetSubtext}</p>
            </div>

            <CardContent className="p-5">
              {submissionResult ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center mx-auto border border-[#D8E2D6] dark:border-[#618764]/50">
                    <MaterialIcon name="check_circle" size={28} />
                  </div>
                  <h4 className="font-bold text-sm text-[#273338] dark:text-white">Inquiry Received</h4>
                  <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-xs mx-auto">
                    Request securely processed and routed to an agent.
                  </p>
                  <Badge variant="outline" className="font-mono text-[10px] py-0.5 bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/50">
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
                      className="text-xs border-[#D8E2D6] dark:border-[#618764]/60"
                    >
                      Submit Another Lead
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleLiveSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">First Name *</Label>
                      <Input
                        required
                        value={testFirstName}
                        onChange={(e) => setTestFirstName(e.target.value)}
                        placeholder="Jane"
                        className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Last Name *</Label>
                      <Input
                        required
                        value={testLastName}
                        onChange={(e) => setTestLastName(e.target.value)}
                        placeholder="Doe"
                        className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Email Address</Label>
                      <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Phone Number</Label>
                      <Input
                        type="tel"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Property Address</Label>
                    <Input
                      value={testAddress}
                      onChange={(e) => setTestAddress(e.target.value)}
                      placeholder="e.g. 800 Brazos St #400"
                      className="h-8 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Price / Budget ($)</Label>
                      <Input
                        type="number"
                        value={testPrice}
                        onChange={(e) => setTestPrice(Number(e.target.value) || 0)}
                        className="h-8 font-mono text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">ZIP Code</Label>
                      <Input
                        value={testZipCode}
                        onChange={(e) => setTestZipCode(e.target.value)}
                        placeholder="78701"
                        className="h-8 font-mono text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Message</Label>
                    <textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#202B2F] p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9CB080] text-[#273338] dark:text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ backgroundColor: accentColor }}
                    className="w-full text-[#273338] font-bold text-xs h-9 gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <MaterialIcon name="refresh" size={16} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <MaterialIcon name="send" size={16} />
                        <span>{buttonText}</span>
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

export default LeadCaptureWidgetTab
