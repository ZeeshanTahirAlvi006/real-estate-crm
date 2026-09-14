import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'

export interface PakistanLeadGuidesProps {
  onOpenTester?: (preset?: string) => void
  defaultSource?: string
}

export interface SourceGuideItem {
  id: string
  name: string
  tagline: string
  icon: string
  color: string
  cost: string
  type: 'Official API' | 'Email Forwarder' | 'Direct Chat' | 'Embed Widget' | 'Manual'
  endpoint: string
  method: 'POST' | 'GET & POST' | 'N/A'
  authNote: string
  steps: {
    title: string
    detail: string
    codeSnippet?: string
  }[]
  testPayload?: Record<string, any>
}

export const GUIDES: SourceGuideItem[] = [
  {
    id: 'google_ads',
    name: 'Google Ads Lead Form',
    tagline: 'Native webhook extension for search and YouTube lead capture campaigns',
    icon: 'ads_click',
    color: '#4285f4',
    cost: '$0 API (Free Tier)',
    type: 'Official API',
    endpoint: '/api/leads/google-ads',
    method: 'POST',
    authNote: 'Authentication via body.google_key matching your Lead Source Webhook Secret',
    steps: [
      {
        title: '1. Create or Open Lead Form in Google Ads',
        detail:
          'Go to Google Ads Manager -> Campaigns -> Assets -> Lead Form. Create a new lead form or edit an existing one.',
      },
      {
        title: '2. Configure Webhook Integration',
        detail:
          'Scroll down to "Lead delivery options" and toggle "Export leads using a webhook". Enter your CRM Webhook URL and Webhook Key.',
        codeSnippet: `Webhook URL: https://your-crm-domain.com/api/leads/google-ads\nKey: YOUR_LEAD_SOURCE_WEBHOOK_SECRET`,
      },
      {
        title: '3. Verify Test Data Ping',
        detail:
          'Click "Send test data" in Google Ads. PropPulse CRM automatically accepts test payloads (with is_test: true) and responds with HTTP 200 without creating false contact records.',
      },
    ],
    testPayload: {
      lead_id: 'gads-test-lead-123',
      google_key: 'YOUR_SECRET_KEY',
      is_test: true,
      user_column_data: [
        { column_id: 'FULL_NAME', string_value: 'Muhammad Ali' },
        { column_id: 'PHONE_NUMBER', string_value: '0300-1234567' },
        { column_id: 'EMAIL', string_value: 'ali@example.com' },
        { column_id: 'CITY', string_value: 'Lahore' },
      ],
    },
  },
  {
    id: 'meta_ads',
    name: 'Meta / Facebook & Instagram Ads',
    tagline: 'Unified Graph API webhook for Facebook & Instagram Instant Forms',
    icon: 'campaign',
    color: '#1877f2',
    cost: '$0 API (Free Tier)',
    type: 'Official API',
    endpoint: '/api/leads/meta/webhook',
    method: 'GET & POST',
    authNote: 'Challenge verification handshake via hub.verify_token and hub.challenge',
    steps: [
      {
        title: '1. Set Up Meta Developer App (Dev Mode)',
        detail:
          'In developers.facebook.com, create a Business App. Leave it in Development Mode — for single agency/brokerage use, Admin/Developer roles access live leads instantly at $0 with zero App Review.',
      },
      {
        title: '2. Configure Webhooks Subscription',
        detail:
          'Add the Webhooks product to your App. Select "Page" object -> subscribe to "leadgen". Set Callback URL and Verify Token.',
        codeSnippet: `Callback URL: https://your-crm-domain.com/api/leads/meta/webhook\nVerify Token: YOUR_CONFIGURED_VERIFY_TOKEN`,
      },
      {
        title: '3. Subscribe Your Facebook Page',
        detail:
          'Subscribe your brokerage page to leadgen events using Graph API or the Meta App Dashboard:',
        codeSnippet: `POST https://graph.facebook.com/v20.0/{page_id}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}`,
      },
      {
        title: '4. Test with Meta Testing Tool',
        detail:
          'Navigate to developers.facebook.com/tools/lead-ads-testing. Select your Page and Instant Form, then click "Create Lead" to verify real-time ingestion.',
      },
    ],
  },
  {
    id: 'zameen',
    name: 'Zameen.com Portal Inquiries',
    tagline: 'Automated email parser for Pakistan’s #1 property portal notifications',
    icon: 'domain',
    color: '#27ae60',
    cost: '$0 (Email Forwarding)',
    type: 'Email Forwarder',
    endpoint: '/api/leads/email-parser/zameen',
    method: 'POST',
    authNote: 'Header-based API key (x-api-key) or source query parameter (?sourceId=...)',
    steps: [
      {
        title: '1. Inbound Notification Setup',
        detail:
          'When a buyer submits an inquiry on your Zameen.com listings, Zameen sends an email alert to your registered agent address.',
      },
      {
        title: '2. Forward Emails to CRM Parser',
        detail:
          'Set up an automated forwarding rule (via Gmail Filter, CloudMailin, or Make.com $0 free tier) to send raw email JSON to the Zameen parser endpoint.',
        codeSnippet: `POST https://your-crm-domain.com/api/leads/email-parser/zameen\nHeaders: { "x-api-key": "YOUR_API_KEY" }\nBody: { "body": "...", "subject": "..." }`,
      },
      {
        title: '3. Automatic Field Extraction',
        detail:
          'The parser automatically extracts Buyer Name, E.164 Phone (+92300...), Property ID, Location, Quoted PKR Price, and buyer message without brittle DOM scraping.',
      },
    ],
  },
  {
    id: 'graana',
    name: 'Graana.com Inquiries',
    tagline: 'Email alert ingestion for Graana smart real estate listings',
    icon: 'apartment',
    color: '#e74c3c',
    cost: '$0 (Email Forwarding)',
    type: 'Email Forwarder',
    endpoint: '/api/leads/email-parser/graana',
    method: 'POST',
    authNote: 'Header-based API key or sourceId query parameter',
    steps: [
      {
        title: '1. Set Up Listing Notification Alerts',
        detail:
          'Ensure your agency email in the Graana Agency Portal is enabled to receive email alerts for every new buyer interest.',
      },
      {
        title: '2. Forward to Graana Parser',
        detail:
          'Forward incoming Graana lead alerts to the dedicated Graana email parser endpoint.',
        codeSnippet: `POST https://your-crm-domain.com/api/leads/email-parser/graana\nBody: { "body": "...", "subject": "Inquiry for Property GR-94821" }`,
      },
      {
        title: '3. Property Reference Matching',
        detail:
          'Extracts buyer details and assigns the property reference (e.g. GR-94821) into the contact notes for instant deal linking.',
      },
    ],
  },
  {
    id: 'olx',
    name: 'OLX Pakistan Classifieds',
    tagline: 'Inbound chat & call inquiries from Pakistan’s largest classifieds portal',
    icon: 'storefront',
    color: '#002f34',
    cost: '$0 (Email Forwarding)',
    type: 'Email Forwarder',
    endpoint: '/api/leads/email-parser/olx',
    method: 'POST',
    authNote: 'Header-based API key or sourceId query parameter',
    steps: [
      {
        title: '1. OLX Chat & Inquiry Notifications',
        detail:
          'OLX sends email notifications when buyers send chat messages on your posted property ads.',
      },
      {
        title: '2. Forward Email to OLX Parser',
        detail:
          'Forward incoming OLX inquiry emails to the OLX parser endpoint.',
        codeSnippet: `POST https://your-crm-domain.com/api/leads/email-parser/olx\nBody: { "body": "...", "subject": "New message on ad..." }`,
      },
      {
        title: '3. In-Message Phone Detection & Chat Fallback',
        detail:
          'The parser scans the message body for Pakistani phone numbers (03xx / +923xx). If the buyer only chatted via the app, the CRM saves the direct link to the OLX Chat thread so agents can reply in 1 click.',
      },
    ],
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Direct Ingestion',
    tagline: 'E.164-ready click-to-chat links and instant messaging workflows',
    icon: 'chat',
    color: '#25d366',
    cost: '$0 Free',
    type: 'Direct Chat',
    endpoint: 'https://wa.me/923xxxxxxxxx',
    method: 'GET & POST',
    authNote: 'Direct protocol link for websites, social ads, and property flyers',
    steps: [
      {
        title: '1. Standardized E.164 Phone Format',
        detail:
          'All leads ingested from Zameen, Graana, OLX, Google, and Meta are automatically normalized to +923xxxxxxxxx. This enables immediate 1-click WhatsApp messaging from any Contact profile.',
      },
      {
        title: '2. Click-to-Chat Link Generator',
        detail:
          'Embed click-to-chat links on your agency website, social posts, or digital business cards with pre-filled inquiry text:',
        codeSnippet: `https://wa.me/923001234567?text=Assalam-o-Alaikum,%20I%20am%20inquiring%20about%20your%20property%20listing.`,
      },
      {
        title: '3. QR Codes for Site Boards & Brochures',
        detail:
          'Generate a QR code pointing to your WhatsApp click-to-chat URL to capture walk-in and drive-by buyers directly into your CRM.',
      },
    ],
  },
  {
    id: 'website',
    name: 'Website Capture Widget',
    tagline: 'Lightweight embeddable JS widget for agency websites and landing pages',
    icon: 'language',
    color: '#0ea5e9',
    cost: '$0 Native Widget',
    type: 'Embed Widget',
    endpoint: '/widget.js',
    method: 'POST',
    authNote: 'Client capture key validation with domain origin verification',
    steps: [
      {
        title: '1. Copy Widget Script Snippet',
        detail:
          'Copy the single-line embed script tag containing your unique source ID.',
        codeSnippet: `<script src="https://your-crm-domain.com/widget.js" data-source-id="YOUR_SOURCE_ID" async></script>`,
      },
      {
        title: '2. Paste into Website HTML',
        detail:
          'Add the script right before the closing </body> tag in your WordPress, Webflow, React, or custom agency site.',
      },
      {
        title: '3. Automatic Lead & UTM Capture',
        detail:
          'When visitors submit the form, inquiries stream straight into your pipeline with automated phone formatting, UTM campaign tags, and instant agent notification.',
      },
    ],
    testPayload: {
      name: 'Usman Ghani',
      phone: '0321-4567890',
      email: 'usman.ghani@example.pk',
      propertyAddress: '1 Kanal Plot, Phase 7, DHA Lahore',
      message: 'Looking for fast transfer and investor quote.',
    },
  },
  {
    id: 'webhook',
    name: 'Universal Webhook Receiver',
    tagline: 'Standard JSON POST endpoint for custom webhooks, Zapier, Make, and backend apps',
    icon: 'webhook',
    color: '#8b5cf6',
    cost: '$0 Free Ingestion',
    type: 'Official API',
    endpoint: '/api/leads/ingest',
    method: 'POST',
    authNote: 'Optional HMAC SHA-256 signature (x-webhook-signature) or header API key (x-api-key)',
    steps: [
      {
        title: '1. Inbound Webhook URL',
        detail:
          'Configure your webhook sender to POST JSON payloads directly to your unique ingestion URL.',
        codeSnippet: `POST https://your-crm-domain.com/api/leads/ingest?sourceId=YOUR_SOURCE_ID`,
      },
      {
        title: '2. Standard Payload Schema',
        detail:
          'Provide lead data in JSON format. Required: name, plus either phone or email.',
        codeSnippet: `{\n  "name": "Tariq Mehmood",\n  "phone": "+92 300 8765432",\n  "email": "tariq@example.pk",\n  "propertyAddress": "Sector B, Bahria Town Rawalpindi",\n  "propertyPrice": 28000000,\n  "notes": "Interested in 5 Marla ready villa"\n}`,
      },
      {
        title: '3. Authentication & Field Mapping',
        detail:
          'Authenticate via x-api-key header or x-webhook-signature if HMAC secret is enabled. Custom field mappings configured on this source will be applied automatically.',
      },
    ],
    testPayload: {
      name: 'Tariq Mehmood',
      phone: '+92 300 8765432',
      email: 'tariq@example.pk',
      propertyAddress: 'Sector B, Bahria Town Rawalpindi',
      propertyPrice: 28000000,
      notes: 'Interested in 5 Marla ready villa',
    },
  },
  {
    id: 'manual',
    name: 'Manual Agent Intake',
    tagline: 'Direct intake for office walk-ins, phone inquiries, and personal network leads',
    icon: 'edit_note',
    color: '#64748b',
    cost: '$0 Included',
    type: 'Manual',
    endpoint: 'CRM Add Lead Modal',
    method: 'N/A',
    authNote: 'Role-based access control (Agent / Admin / Manager session)',
    steps: [
      {
        title: '1. Click "+ Add Lead" in Header',
        detail:
          'From anywhere in Lead Ingestion or Contacts, click the "+ Add Lead" action button in the navigation bar.',
      },
      {
        title: '2. Enter Buyer Information',
        detail:
          'Fill in client name, contact phone (auto-formatted to Pakistan +92 E.164), property requirements, budget in PKR, and location.',
      },
      {
        title: '3. Immediate Scoring & WhatsApp Action',
        detail:
          'The lead enters the pipeline instantly, calculated by the Scoring Engine, with 1-click WhatsApp messaging and round-robin agent routing enabled.',
      },
    ],
    testPayload: {
      name: 'Bilal Ahmed',
      phone: '0333-1122334',
      email: 'bilal@lahoreproperties.pk',
      propertyAddress: 'Gulberg III, Lahore',
      propertyPrice: 45000000,
      message: 'Walk-in inquiry looking for commercial rental.',
    },
  },
]

export const PakistanLeadGuides: React.FC<PakistanLeadGuidesProps> = ({
  onOpenTester,
  defaultSource = 'google_ads',
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string>(defaultSource)
  const currentGuide = GUIDES.find((g) => g.id === selectedSourceId) || GUIDES[0]

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${label} to clipboard`)
  }

  return (
    <Card className="border border-[#D8E2D6] dark:border-[#618764]/50 bg-white/95 dark:bg-[#1A2E26]/90 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#EDF2EB] dark:border-[#618764]/30 bg-[#F5F7F4]/70 dark:bg-[#202B2F]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MaterialIcon name="menu_book" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
              <CardTitle className="text-base sm:text-lg font-bold text-[#273338] dark:text-white">
                Pakistan Lead Ingestion & Webhook Integration Guides
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
              Step-by-step connection instructions for Pakistan ad platforms & portals — $0 recurring SaaS cost.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40 text-[11px] font-semibold">
              E.164 +92 Auto-Sanitized
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold">
              $0 Infrastructure
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Horizontal Channel Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {GUIDES.map((guide) => {
            const isSelected = guide.id === currentGuide.id
            return (
              <button
                key={guide.id}
                type="button"
                onClick={() => setSelectedSourceId(guide.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2B5748] text-white border-[#2B5748] shadow-sm font-bold'
                    : 'bg-[#F5F7F4] dark:bg-[#202B2F] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764]/40 hover:bg-[#EDF2EB] dark:hover:bg-[#273338]'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${guide.color}15`,
                    color: isSelected ? '#ffffff' : guide.color,
                  }}
                >
                  <MaterialIcon name={guide.icon} size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate font-semibold">{guide.name}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isSelected ? 'text-white/80' : 'text-[#75887E] dark:text-[#A0B2A6]'
                    }`}
                  >
                    {guide.cost}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Guide Details Panel */}
        <div className="rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4]/40 dark:bg-[#202B2F]/40 p-4 sm:p-5 space-y-5">
          {/* Header Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D8E2D6] dark:border-[#618764]/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#273338] dark:text-white">
                  {currentGuide.name} Integration
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {currentGuide.type}
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                  {currentGuide.cost}
                </Badge>
              </div>
              <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">{currentGuide.tagline}</p>
            </div>

            {onOpenTester && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenTester(currentGuide.id)}
                className="bg-white dark:bg-[#1A2E26] border-[#9CB080] text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#273338] text-xs font-semibold gap-1.5 shrink-0"
              >
                <MaterialIcon name="play_circle" size={16} />
                <span>Test in Webhook Simulator</span>
              </Button>
            )}
          </div>

          {/* Endpoint Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 rounded-lg bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center gap-2 min-w-0">
              <Badge className="bg-[#2B5748] text-white text-[10px] font-mono shrink-0">
                {currentGuide.method}
              </Badge>
              <code className="text-xs font-mono font-bold text-[#273338] dark:text-white truncate">
                {currentGuide.endpoint}
              </code>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(currentGuide.endpoint, 'Endpoint URL')}
                className="h-7 px-2 text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white gap-1"
              >
                <MaterialIcon name="content_copy" size={14} />
                <span>Copy Path</span>
              </Button>
            </div>
          </div>

          {/* Authentication Note */}
          <div className="flex items-start gap-2 text-xs text-[#4A5D54] dark:text-[#A0B2A6] bg-amber-500/10 dark:bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
            <MaterialIcon name="shield" size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300">Security & Authentication: </span>
              {currentGuide.authNote}
            </div>
          </div>

          {/* Sequential Step-by-Step Instructions */}
          <div className="space-y-4 pt-1">
            <div className="text-xs font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
              Setup Steps
            </div>
            <div className="space-y-3">
              {currentGuide.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/30 space-y-2"
                >
                  <div className="text-xs font-bold text-[#273338] dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center text-[11px] font-mono">
                      {idx + 1}
                    </span>
                    <span>{step.title}</span>
                  </div>
                  <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] pl-7 leading-relaxed">
                    {step.detail}
                  </p>
                  {step.codeSnippet && (
                    <div className="pl-7 pt-1">
                      <div className="relative group">
                        <pre className="p-2.5 rounded-md bg-[#202B2F] text-emerald-400 text-[11px] font-mono overflow-x-auto">
                          {step.codeSnippet}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(step.codeSnippet!, 'Code Snippet')}
                          className="absolute top-1.5 right-1.5 h-6 px-1.5 text-[10px] bg-black/40 text-white hover:bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
