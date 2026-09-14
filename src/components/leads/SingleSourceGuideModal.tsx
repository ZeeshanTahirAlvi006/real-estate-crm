import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] p-0">
        {/* Header with Source Branding */}
        <DialogHeader className="p-5 sm:p-6 border-b border-[#EDF2EB] dark:border-[#618764]/30 bg-[#F5F7F4]/80 dark:bg-[#1A2E26]/90">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs border border-black/5 dark:border-white/10"
                style={{
                  backgroundColor: `${guide.color}18`,
                  color: guide.color,
                }}
              >
                <MaterialIcon name={guide.icon} size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-[#273338] dark:text-white">
                    Setup Guide: {source.name}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 font-semibold bg-white dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/50"
                  >
                    {guide.name}
                  </Badge>
                </div>
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-1 leading-relaxed">
                  {guide.tagline}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge
                className={
                  source.isActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold'
                }
              >
                {source.isActive ? 'Active Pipeline' : 'Paused'}
              </Badge>
              <span className="text-[10px] font-medium text-[#75887E] dark:text-[#A0B2A6]">
                {guide.cost}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Source Identification & Dynamic Ingestion Endpoint Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#273338] dark:text-white">
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="link" size={16} className="text-[#2B5748] dark:text-[#9CB080]" />
                <span>Dedicated Ingestion Target</span>
              </span>
              <span className="font-mono text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                ID: {source.id}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Badge className="bg-[#2B5748] text-white text-[10px] font-mono shrink-0 px-2 py-0.5">
                  {guide.method}
                </Badge>
                <code className="text-xs font-mono font-bold text-[#273338] dark:text-white truncate select-all">
                  {dynamicEndpoint}
                </code>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(dynamicEndpoint, 'Ingestion Target')}
                className="h-7 text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/60 hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] gap-1 shrink-0 cursor-pointer"
              >
                <MaterialIcon
                  name={copiedLabel === 'Ingestion Target' ? 'check' : 'content_copy'}
                  size={14}
                />
                <span>{copiedLabel === 'Ingestion Target' ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
          </div>

          {/* Security & Authentication Callout */}
          <div className="flex items-start gap-2.5 text-xs text-[#4A5D54] dark:text-[#A0B2A6] bg-amber-500/10 dark:bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/25">
            <MaterialIcon
              name="shield"
              size={18}
              className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
            />
            <div className="space-y-0.5">
              <div className="font-bold text-amber-900 dark:text-amber-300">
                Security & Source Binding
              </div>
              <p className="leading-relaxed">
                {guide.authNote}. Inbound leads are linked automatically to this lead source record
                and routed according to your CRM distribution rules.
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                Step-by-Step Integration
              </span>
              <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                {guide.steps.length} steps to complete
              </span>
            </div>

            <div className="space-y-3">
              {guide.steps.map((step, idx) => {
                const formattedSnippet = formatCodeSnippet(step.codeSnippet)
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-2 shadow-xs"
                  >
                    <div className="text-xs font-bold text-[#273338] dark:text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center text-[11px] font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step.title}</span>
                    </div>

                    <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] pl-7 leading-relaxed">
                      {step.detail}
                    </p>

                    {formattedSnippet && (
                      <div className="pl-7 pt-1">
                        <div className="relative group">
                          <pre className="p-3 rounded-lg bg-[#202B2F] text-emerald-400 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                            {formattedSnippet}
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(formattedSnippet, `Step ${idx + 1} Snippet`)}
                            className="absolute top-2 right-2 h-6 px-2 text-[10px] font-semibold bg-black/60 text-white hover:bg-black/80 rounded transition-opacity cursor-pointer"
                          >
                            <MaterialIcon name="content_copy" size={12} className="mr-1" />
                            Copy
                          </Button>
                        </div>
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
