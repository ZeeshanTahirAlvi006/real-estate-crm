import { useState } from 'react'
import {
  useGetLeadSourcesQuery,
  useUpdateLeadSourceMutation,
  useDeleteLeadSourceMutation,
  useRotateWebhookSecretMutation,
  useGetLeadSourceByIdQuery,
} from '@/store/api/leadsApi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  KeyIcon,
  ClipboardIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LeadSourceModal } from './LeadSourceModal'
import type { LeadSource, LeadSourceType } from '@/types'

const SOURCE_BADGES: Record<
  LeadSourceType,
  { label: string; bg: string; text: string; icon: string; border: string }
> = {
  zillow: { label: 'Zillow Premier', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: '🔵', border: 'border-blue-500/30' },
  realtor: { label: 'Realtor.com', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: '🔴', border: 'border-red-500/30' },
  meta_ads: { label: 'Meta Ads (FB/IG)', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', icon: '🟣', border: 'border-purple-500/30' },
  google_ads: { label: 'Google Ads', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: '🟢', border: 'border-emerald-500/30' },
  website: { label: 'Website Capture', bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', icon: '🌐', border: 'border-indigo-500/30' },
  webhook: { label: 'Universal Webhook', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: '⚡', border: 'border-amber-500/30' },
  manual: { label: 'Manual Intake', bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', icon: '📝', border: 'border-slate-500/30' },
}

export function LeadSourcesTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewSecretSourceId, setViewSecretSourceId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const { data, isLoading } = useGetLeadSourcesQuery({
    search: searchTerm || undefined,
    type: selectedType !== 'all' ? selectedType : undefined,
  })

  const [updateSource] = useUpdateLeadSourceMutation()
  const [deleteSource] = useDeleteLeadSourceMutation()
  const [rotateSecret, { isLoading: isRotating }] = useRotateWebhookSecretMutation()

  // Secret details query when modal is open
  const { data: secretDetails } = useGetLeadSourceByIdQuery(
    { id: viewSecretSourceId || '', includeSecret: true },
    { skip: !viewSecretSourceId }
  )

  const sources = data?.leadSources || []
  const apiBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api'

  const handleToggle = async (s: LeadSource) => {
    try {
      await updateSource({
        id: s.id,
        data: { isActive: !s.isActive },
      }).unwrap()
      toast.success(`${s.name} is now ${!s.isActive ? 'active' : 'paused'}`)
    } catch {
      toast.error('Failed to update lead source')
    }
  }

  const handleDelete = async (s: LeadSource) => {
    if (confirm(`Are you sure you want to delete lead source "${s.name}"?`)) {
      try {
        await deleteSource(s.id).unwrap()
        toast.success(`Lead source "${s.name}" deleted`)
      } catch {
        toast.error('Failed to delete lead source')
      }
    }
  }

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    toast.success(`${keyName} copied to clipboard!`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleRotateSecret = async (id: string) => {
    try {
      const res = await rotateSecret(id).unwrap()
      toast.success('HMAC webhook secret rotated! Update your external portal settings.')
      handleCopy(res.webhookSecret, 'New Secret')
    } catch {
      toast.error('Failed to rotate secret')
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sources by name..."
              className="pl-9 h-9 text-xs"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Types</option>
            <option value="zillow">Zillow</option>
            <option value="realtor">Realtor.com</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="website">Website</option>
            <option value="webhook">Custom Webhook</option>
          </select>
        </div>

        <Button
          onClick={() => {
            setEditingSource(null)
            setIsModalOpen(true)
          }}
          size="sm"
          className="gap-1.5 font-semibold shadow-xs"
        >
          <PlusIcon className="w-4 h-4" />
          Connect Source
        </Button>
      </div>

      {/* Sources Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm">No Lead Sources Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Connect Zillow, Meta Ads, Realtor.com, or embed a website widget to automatically ingest leads into your routing engine.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingSource(null)
              setIsModalOpen(true)
            }}
          >
            Create First Lead Source
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((s) => {
            const badge = SOURCE_BADGES[s.type] || SOURCE_BADGES.webhook
            const webhookUrl = `${apiBaseUrl}/leads/ingest?sourceId=${s.id}`

            return (
              <Card
                key={s.id}
                className={`relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/80 ${
                  !s.isActive ? 'opacity-70 bg-muted/20' : 'bg-card'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold border ${badge.bg} ${badge.border}`}>
                        {badge.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate text-foreground">{s.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${badge.bg} ${badge.text} ${badge.border}`}>
                            {badge.label}
                          </Badge>
                          {s.config?.fieldMapping && Object.keys(s.config.fieldMapping).length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              • {Object.keys(s.config.fieldMapping).length} mapped
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={s.isActive}
                        onCheckedChange={() => handleToggle(s)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingSource(s)
                              setIsModalOpen(true)
                            }}
                            className="gap-2"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                            Edit Configuration
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setViewSecretSourceId(s.id)}
                            className="gap-2"
                          >
                            <KeyIcon className="w-3.5 h-3.5" />
                            View HMAC Secret
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(s)}
                            className="gap-2 text-destructive"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Delete Source
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Webhook Endpoint Strip */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium flex items-center gap-1">
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                        Inbound Webhook URL
                      </span>
                      <button
                        onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
                        className="text-primary hover:underline text-[10px] font-semibold flex items-center gap-1"
                      >
                        {copiedKey === 'Webhook URL' ? (
                          <>
                            <CheckIcon className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/70 font-mono text-[10px] text-muted-foreground truncate select-all">
                      {webhookUrl}
                    </div>
                  </div>

                  {/* Footer Metrics */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-foreground">{s.leadCount.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Leads Ingested</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewSecretSourceId(s.id)}
                        className="h-7 text-xs gap-1 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <KeyIcon className="w-3.5 h-3.5" />
                        Credentials
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Secret & Credentials Modal */}
      <Dialog
        open={Boolean(viewSecretSourceId)}
        onOpenChange={(open) => !open && setViewSecretSourceId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {secretDetails?.name || 'Webhook Credentials'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Security keys for HMAC SHA-256 payload signature verification.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* HMAC Webhook Secret */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">HMAC Secret Key (X-Webhook-Signature)</Label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  AES-256 Encrypted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={secretDetails?.webhookSecret || '••••••••••••••••••••••••••••••••'}
                  className="h-9 font-mono text-xs bg-muted/40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    secretDetails?.webhookSecret &&
                    handleCopy(secretDetails.webhookSecret, 'Webhook Secret')
                  }
                  className="h-9 px-3 gap-1 shrink-0"
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inbound requests must sign the raw body with this secret and send in the <code className="text-primary font-mono font-bold">X-Webhook-Signature</code> header.
              </p>
            </div>

            {/* Public Capture Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Public Capture Key (Widget & Forms)</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={secretDetails?.captureKey || ''}
                  className="h-9 font-mono text-xs bg-muted/40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    secretDetails?.captureKey &&
                    handleCopy(secretDetails.captureKey, 'Capture Key')
                  }
                  className="h-9 px-3 gap-1 shrink-0"
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Inbound Endpoint */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Universal Ingestion URL</Label>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/70 font-mono text-[11px] select-all break-all text-muted-foreground">
                {`${apiBaseUrl}/leads/ingest?sourceId=${secretDetails?.id || ''}`}
              </div>
            </div>

            {/* 1-Click Secret Rotation */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs">Need to Rotate Secret?</p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70">
                  Instantly generates a new HMAC key and invalidates previous token.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isRotating}
                onClick={() => secretDetails?.id && handleRotateSecret(secretDetails.id)}
                className="h-8 text-xs gap-1 border-amber-500/40 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0 font-semibold"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                Rotate Key
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button size="sm" onClick={() => setViewSecretSourceId(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Modal */}
      <LeadSourceModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        leadSource={editingSource}
      />
    </div>
  )
}
