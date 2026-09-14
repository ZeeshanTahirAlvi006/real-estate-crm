import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import type { LeadSource } from '@/types'
import { GUIDES, type SourceGuideItem } from './PakistanLeadGuides'

export interface SingleSourceGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: LeadSource | null
  onOpenTester?: (preset?: string) => void
  onViewCredentials?: (sourceId: string) => void
}

export const SingleSourceGuideModal: React.FC<SingleSourceGuideModalProps> = ({
  open,
  onOpenChange,
  source,
  onOpenTester,
  onViewCredentials,
}) => {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [showPayload, setShowPayload] = useState(false)

  if (!source) return null

  const apiBaseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api`
      : 'http://localhost:5000/api'
  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'

  // Match corresponding Pakistan integration guide
  const baseGuide = GUIDES.find((g) => g.id === source.type)
  const guide: SourceGuideItem = baseGuide || {
    id: source.type,
    name: source.name,
    tagline: `Direct integration instructions for ${source.name}`,
    icon: 'hub',
    color: '#2B5748',
    cost: '$0 Free Tier',
    type: 'Official API',
    endpoint: `/api/leads/ingest?sourceId=${source.id}`,
    method: 'POST',
    authNote: 'HMAC signature verification or header-based x-api-key authentication',
    steps: [
      {
        title: '1. Inbound Webhook Target',
        detail: `Configure your webhook provider to dispatch POST requests with lead payloads to this source endpoint.`,
        codeSnippet: `POST ${apiBaseUrl}/leads/ingest?sourceId=${source.id}`,
      },
      {
        title: '2. Standard Payload Structure',
        detail: 'Send JSON payload with name, phone, email, and optional property details.',
        codeSnippet: JSON.stringify(
          {
            name: 'Client Name',
            phone: '+92 300 1234567',
            email: 'client@example.pk',
            propertyAddress: 'DHA Phase 6, Lahore',
          },
          null,
          2
        ),
      },
    ],
  }

  // Determine dynamic endpoint specifically for this source
  let dynamicEndpoint = `${apiBaseUrl}/leads/ingest?sourceId=${source.id}`
  if (source.type === 'google_ads') {
    dynamicEndpoint = `${apiBaseUrl}/leads/google-ads`
  } else if (source.type === 'meta_ads') {
    dynamicEndpoint = `${apiBaseUrl}/leads/meta/webhook`
  } else if (source.type === 'zameen') {
    dynamicEndpoint = `${apiBaseUrl}/leads/email-parser/zameen?sourceId=${source.id}`
  } else if (source.type === 'graana') {
    dynamicEndpoint = `${apiBaseUrl}/leads/email-parser/graana?sourceId=${source.id}`
  } else if (source.type === 'olx') {
    dynamicEndpoint = `${apiBaseUrl}/leads/email-parser/olx?sourceId=${source.id}`
  } else if (source.type === 'whatsapp') {
    dynamicEndpoint = `https://wa.me/923001234567?text=Assalam-o-Alaikum`
  } else if (source.type === 'website') {
    dynamicEndpoint = `<script src="${originUrl}/widget.js" data-source-id="${source.id}" async></script>`
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLabel(label)
    toast.success(`Copied ${label} to clipboard`)
    setTimeout(() => setCopiedLabel(null), 2500)
  }

  // Format step code snippets dynamically for this specific source
  const formatCodeSnippet = (snippet?: string) => {
    if (!snippet) return undefined
    return snippet
      .replace(/YOUR_SOURCE_ID/g, source.id)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/email-parser\/zameen/g, `${apiBaseUrl}/leads/email-parser/zameen?sourceId=${source.id}`)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/email-parser\/graana/g, `${apiBaseUrl}/leads/email-parser/graana?sourceId=${source.id}`)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/email-parser\/olx/g, `${apiBaseUrl}/leads/email-parser/olx?sourceId=${source.id}`)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/google-ads/g, `${apiBaseUrl}/leads/google-ads`)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/meta\/webhook/g, `${apiBaseUrl}/leads/meta/webhook`)
      .replace(/https:\/\/your-crm-domain\.com\/api\/leads\/ingest\?sourceId=YOUR_SOURCE_ID/g, `${apiBaseUrl}/leads/ingest?sourceId=${source.id}`)
      .replace(/https:\/\/your-crm-domain\.com/g, originUrl)
  }

  const testPayloadString = guide.testPayload
    ? JSON.stringify(guide.testPayload, null, 2)
    : JSON.stringify(
        {
          name: 'Muhammad Usman',
          phone: '0300-1234567',
          email: 'usman@example.pk',
          propertyAddress: 'DHA Phase 5, Lahore',
          propertyPrice: 55000000,
          source: source.name,
        },
        null,
        2
      )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#273338] border-[#D8E2D6] dark:border-[#618764] p-0">
        <DialogHeader className="p-6 border-b border-[#D8E2D6] dark:border-[#618764]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <MaterialIcon name={guide.icon} size={28} className="text-[#2B5748] dark:text-[#9CB080]" />
              <div>
                <DialogTitle className="text-xl font-semibold text-[#273338] dark:text-white">
                  {source.name} Integration
                </DialogTitle>
                <p className="text-sm text-[#4A5D54] dark:text-[#A0B2A6] mt-1">
                  {guide.tagline}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs font-semibold px-2 py-1 rounded ${source.isActive ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080]' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                {source.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="bg-[#F5F7F4] dark:bg-[#202B2F] p-4 rounded-lg border border-[#D8E2D6] dark:border-[#618764]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-xs font-medium text-[#75887E] dark:text-[#A0B2A6] uppercase tracking-wider">
                  Ingestion Target (Source ID: {source.id})
                </span>
                <code className="text-sm font-mono text-[#273338] dark:text-white truncate">
                  <span className="mr-2 font-bold">{guide.method}</span>
                  {dynamicEndpoint}
                </code>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(dynamicEndpoint, 'Ingestion Target')}
                className="shrink-0 self-start sm:self-center"
              >
                {copiedLabel === 'Ingestion Target' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#D8E2D6] dark:border-[#618764]">
              <span className="text-xs font-medium text-[#75887E] dark:text-[#A0B2A6] uppercase tracking-wider block mb-1">
                Security & Source Binding
              </span>
              <p className="text-sm text-[#4A5D54] dark:text-[#E2ECE4]">
                {guide.authNote}. Inbound leads are linked automatically to this lead source record
                and routed according to your CRM distribution rules.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#273338] dark:text-white uppercase tracking-wider border-b border-[#D8E2D6] dark:border-[#618764] pb-2">
              Setup Instructions
            </h4>

            <div className="space-y-6">
              {guide.steps.map((step, idx) => {
                const replacedSnippet = step.codeSnippet
                  ? formatCodeSnippet(step.codeSnippet)
                  : undefined

                return (
                  <div key={idx} className="space-y-2">
                    <h5 className="text-sm font-medium text-[#2B5748] dark:text-[#9CB080]">
                      {step.title}
                    </h5>
                    <div className="text-sm text-[#4A5D54] dark:text-[#E2ECE4] leading-relaxed">
                      {step.detail}
                    </div>
                    {replacedSnippet && (
                      <div className="relative mt-2 group">
                        <pre className="p-3 rounded-lg bg-[#273338] text-[#9CB080] text-xs font-mono overflow-x-auto">
                          {replacedSnippet}
                        </pre>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(replacedSnippet, 'Code Snippet')}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-[#273338] text-white hover:bg-black/40 transition-opacity"
                        >
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Test Payload Accordion / Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowPayload(!showPayload)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 text-xs font-bold text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#273338] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MaterialIcon name="code" size={16} className="text-[#2B5748] dark:text-[#9CB080]" />
                <span>Sample Ingestion JSON Payload</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-normal text-[#75887E] dark:text-[#A0B2A6]">
                <span>{showPayload ? 'Hide' : 'View'}</span>
                <MaterialIcon
                  name={showPayload ? 'expand_less' : 'expand_more'}
                  size={16}
                />
              </div>
            </button>

            {showPayload && (
              <div className="mt-2 relative">
                <pre className="p-3.5 rounded-xl bg-[#202B2F] text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed border border-[#618764]/30">
                  {testPayloadString}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(testPayloadString, 'Sample JSON Payload')}
                  className="absolute top-2 right-2 h-6 px-2 text-[10px] font-semibold bg-black/60 text-white hover:bg-black/80 rounded cursor-pointer"
                >
                  <MaterialIcon name="content_copy" size={12} className="mr-1" />
                  Copy JSON
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <DialogFooter className="p-4 sm:p-5 border-t border-[#EDF2EB] dark:border-[#618764]/30 bg-[#F5F7F4]/60 dark:bg-[#1A2E26]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onOpenTester && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenTester(source.type)}
                className="h-8 text-xs font-semibold gap-1.5 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
              >
                <MaterialIcon name="play_arrow" size={16} />
                <span>Simulate Lead</span>
              </Button>
            )}

            {onViewCredentials && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewCredentials(source.id)}
                className="h-8 text-xs font-semibold gap-1.5 text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/60 hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
              >
                <MaterialIcon name="key" size={15} />
                <span>View Credentials</span>
              </Button>
            )}
          </div>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-8 px-4 rounded-lg cursor-pointer"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
