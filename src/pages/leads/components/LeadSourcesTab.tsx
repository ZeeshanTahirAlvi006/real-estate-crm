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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'
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
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LeadSourceModal } from './LeadSourceModal'
import type { LeadSource, LeadSourceType } from '@/types'

const SOURCE_CONFIG: Record<
  LeadSourceType,
  { label: string; icon: string }
> = {
  zillow: { label: 'Zillow', icon: 'home' },
  realtor: { label: 'Realtor.com', icon: 'apartment' },
  meta_ads: { label: 'Meta Ads', icon: 'campaign' },
  google_ads: { label: 'Google Ads', icon: 'ads_click' },
  website: { label: 'Website', icon: 'language' },
  webhook: { label: 'Universal Webhook', icon: 'webhook' },
  manual: { label: 'Manual Intake', icon: 'edit_note' },
}

export function LeadSourcesTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewSecretSourceId, setViewSecretSourceId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const queryParams: { search?: string; type?: string } = {}
  if (searchTerm.trim()) queryParams.search = searchTerm.trim()
  if (selectedType !== 'all') queryParams.type = selectedType

  const { data, isLoading } = useGetLeadSourcesQuery(
    Object.keys(queryParams).length > 0 ? queryParams : undefined
  )

  const [updateSource] = useUpdateLeadSourceMutation()
  const [deleteSource] = useDeleteLeadSourceMutation()
  const [rotateSecret, { isLoading: isRotating }] = useRotateWebhookSecretMutation()

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
      toast.success('HMAC webhook secret rotated!')
      handleCopy(res.webhookSecret, 'New Secret')
    } catch {
      toast.error('Failed to rotate secret')
    }
  }

  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_lead_sources_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_lead_sources_view', newView)
  }

  const leadSourceColumns: TableColumn<LeadSource>[] = [
    {
      id: 'name',
      header: 'Source',
      className: '',
      cell: (s) => {
        const config = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.webhook
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50">
              <MaterialIcon name={config.icon} size={18} />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs text-[#273338] dark:text-white truncate block">
                {s.name}
              </span>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                {s.config?.fieldMapping && Object.keys(s.config.fieldMapping).length > 0
                  ? `${Object.keys(s.config.fieldMapping).length} fields mapped`
                  : 'Default mapping'}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      id: 'type',
      header: 'Type',
      cell: (s) => {
        const config = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.webhook
        return (
          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0.5 font-semibold bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/50"
          >
            {config.label}
          </Badge>
        )
      },
    },
    {
      id: 'webhook',
      header: 'Inbound Webhook',
      className: '',
      cell: (s) => {
        const webhookUrl = `${apiBaseUrl}/leads/ingest?sourceId=${s.id}`
        return (
          <div className="flex items-center gap-2 max-w-xs">
            <span className="font-mono text-[10px] text-[#4A5D54] dark:text-[#A0B2A6] truncate select-all bg-[#EDF2EB]/60 dark:bg-[#202B2F] p-1.5 px-2 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/40 flex-1">
              {webhookUrl}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
              className="h-7 w-7 p-0 shrink-0 text-[#2B5748] dark:text-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]"
              title="Copy webhook URL"
            >
              <MaterialIcon name={copiedKey === 'Webhook URL' ? 'check' : 'content_copy'} size={13} />
            </Button>
          </div>
        )
      },
    },
    {
      id: 'leads',
      header: 'Leads Ingested',
      align: 'center',
      cell: (s) => (
        <span className="font-mono font-bold text-xs text-[#273338] dark:text-white tabular-nums">
          {s.leadCount.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      cell: (s) => (
        <Switch
          checked={s.isActive}
          onCheckedChange={() => handleToggle(s)}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewSecretSourceId(s.id)}
            className="h-7 text-xs gap-1 px-2 text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/60 hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]"
            title="View Credentials"
          >
            <MaterialIcon name="key" size={13} />
            <span className="hidden sm:inline">Keys</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#75887E] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]">
              <MaterialIcon name="more_vert" size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
              <DropdownMenuItem
                onClick={() => {
                  setEditingSource(s)
                  setIsModalOpen(true)
                }}
                className="gap-2 cursor-pointer"
              >
                <MaterialIcon name="edit" size={14} />
                <span>Edit Source</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setViewSecretSourceId(s.id)}
                className="gap-2 cursor-pointer"
              >
                <MaterialIcon name="key" size={14} />
                <span>View Secret</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(s)}
                className="gap-2 text-red-600 dark:text-red-400 cursor-pointer"
              >
                <MaterialIcon name="delete" size={14} />
                <span>Delete Source</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]

  const renderLeadSourceCard = (s: LeadSource) => {
    const config = SOURCE_CONFIG[s.type] || SOURCE_CONFIG.webhook
    const webhookUrl = `${apiBaseUrl}/leads/ingest?sourceId=${s.id}`

    return (
      <Card
        key={s.id}
        className={`relative overflow-hidden transition-all duration-200 border rounded-xl shadow-xs hover:shadow-md ${
          !s.isActive
            ? 'opacity-70 bg-[#EDF2EB]/40 dark:bg-[#202B2F]/40 border-[#D8E2D6] dark:border-[#618764]/40'
            : 'bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764]'
        }`}
      >
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50">
                <MaterialIcon name={config.icon} size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm truncate text-[#273338] dark:text-white">{s.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 font-semibold bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/50"
                  >
                    {config.label}
                  </Badge>
                  {s.config?.fieldMapping && Object.keys(s.config.fieldMapping).length > 0 && (
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
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
                <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#75887E] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white">
                  <MaterialIcon name="more_vert" size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingSource(s)
                      setIsModalOpen(true)
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <MaterialIcon name="edit" size={14} />
                    <span>Edit Source</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setViewSecretSourceId(s.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <MaterialIcon name="key" size={14} />
                    <span>View Secret</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(s)}
                    className="gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <MaterialIcon name="delete" size={14} />
                    <span>Delete Source</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#4A5D54] dark:text-[#A0B2A6] font-medium flex items-center gap-1">
                <MaterialIcon name="verified_user" size={14} className="text-[#618764]" />
                <span>Inbound Webhook</span>
              </span>
              <button
                onClick={() => handleCopy(webhookUrl, 'Webhook URL')}
                className="text-[#2B5748] dark:text-[#9CB080] hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'Webhook URL' ? (
                  <>
                    <MaterialIcon name="check" size={12} className="text-[#618764]" />
                    <span className="text-[#618764]">Copied</span>
                  </>
                ) : (
                  <>
                    <MaterialIcon name="content_copy" size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2 rounded-lg bg-[#EDF2EB]/60 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 font-mono text-[10px] text-[#4A5D54] dark:text-[#A0B2A6] truncate select-all">
              {webhookUrl}
            </div>
          </div>

          <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-[#273338] dark:text-white tabular-nums">{s.leadCount.toLocaleString()}</p>
              <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] uppercase tracking-wider font-semibold">Leads Ingested</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewSecretSourceId(s.id)}
                className="h-7 text-xs gap-1 px-2.5 text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/60 hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white"
              >
                <MaterialIcon name="key" size={14} />
                <span>Credentials</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#75887E] dark:text-[#A0B2A6]">
              <MaterialIcon name="search" size={16} />
            </span>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sources..."
              className="pl-9 h-9 text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#202B2F] text-xs font-medium text-[#273338] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#9CB080]"
          >
            <option value="all">All Types</option>
            <option value="zillow">Zillow</option>
            <option value="realtor">Realtor.com</option>
            <option value="meta_ads">Meta Ads</option>
            <option value="google_ads">Google Ads</option>
            <option value="website">Website</option>
            <option value="webhook">Universal Webhook</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TableGridToggleButton
            view={view}
            onViewChange={handleViewChange}
            storageKey="crm_lead_sources_view"
          />
          <Button
            onClick={() => {
              setEditingSource(null)
              setIsModalOpen(true)
            }}
            size="sm"
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-lg shrink-0 border border-[#9CB080] shadow-xs cursor-pointer"
          >
            <MaterialIcon name="add" size={16} />
            <span>Connect Source</span>
          </Button>
        </div>
      </div>

      {/* Sources Table / Grid */}
      <TableGridToggle<LeadSource>
        data={sources}
        keyExtractor={(s) => s.id}
        columns={leadSourceColumns}
        renderCard={renderLeadSourceCard}
        view={view}
        onViewChange={handleViewChange}
        storageKey="crm_lead_sources_view"
        hideToggle={true}
        isLoading={isLoading}
        emptyState={
          <div className="text-center py-16 px-4 rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764]/60 bg-white/50 dark:bg-[#202B2F]/40">
            <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center mx-auto mb-3 border border-[#D8E2D6] dark:border-[#618764]/50">
              <MaterialIcon name="hub" size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#273338] dark:text-white">No Sources Configured</h3>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-sm mx-auto mt-1 mb-4">
              Connect portals, webhooks, or widgets to ingest leads into your pipeline.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingSource(null)
                setIsModalOpen(true)
              }}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg cursor-pointer"
            >
              Create First Source
            </Button>
          </div>
        }
      />

      {/* Secret & Credentials Modal */}
      <Dialog
        open={Boolean(viewSecretSourceId)}
        onOpenChange={(open) => !open && setViewSecretSourceId(null)}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50">
                <MaterialIcon name="key" size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                  {secretDetails?.name || 'Webhook Credentials'}
                </DialogTitle>
                <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  HMAC signature verification keys
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* HMAC Webhook Secret */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#273338] dark:text-white">HMAC Secret Key</Label>
                <span className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-bold bg-[#9CB080]/20 px-2 py-0.5 rounded border border-[#9CB080]/30">
                  AES-256 Encrypted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={secretDetails?.webhookSecret || '••••••••••••••••••••••••••••••••'}
                  className="h-9 font-mono text-xs bg-[#EDF2EB]/50 dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    secretDetails?.webhookSecret &&
                    handleCopy(secretDetails.webhookSecret, 'Webhook Secret')
                  }
                  className="h-9 px-3 gap-1 shrink-0 border-[#D8E2D6] dark:border-[#618764]/60"
                >
                  <MaterialIcon name="content_copy" size={14} />
                  <span>Copy</span>
                </Button>
              </div>
              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                Signed raw body sent in <code className="text-[#2B5748] dark:text-[#9CB080] font-mono font-bold">X-Webhook-Signature</code>.
              </p>
            </div>

            {/* Public Capture Key */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Public Capture Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={secretDetails?.captureKey || ''}
                  className="h-9 font-mono text-xs bg-[#EDF2EB]/50 dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    secretDetails?.captureKey &&
                    handleCopy(secretDetails.captureKey, 'Capture Key')
                  }
                  className="h-9 px-3 gap-1 shrink-0 border-[#D8E2D6] dark:border-[#618764]/60"
                >
                  <MaterialIcon name="content_copy" size={14} />
                  <span>Copy</span>
                </Button>
              </div>
            </div>

            {/* Inbound Endpoint */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Ingestion URL</Label>
              <div className="p-2.5 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/50 font-mono text-[11px] select-all break-all text-[#4A5D54] dark:text-[#A0B2A6]">
                {`${apiBaseUrl}/leads/ingest?sourceId=${secretDetails?.id || ''}`}
              </div>
            </div>

            {/* 1-Click Secret Rotation */}
            <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/50 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#273338] dark:text-white text-xs">Rotate Secret</p>
                <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                  Generates a new HMAC key and invalidates previous token.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isRotating}
                onClick={() => secretDetails?.id && handleRotateSecret(secretDetails.id)}
                className="h-8 text-xs gap-1 border-[#618764] hover:bg-[#618764]/20 text-[#2B5748] dark:text-[#9CB080] shrink-0 font-bold"
              >
                <MaterialIcon name="refresh" size={14} className={isRotating ? 'animate-spin' : ''} />
                <span>Rotate Key</span>
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              size="sm"
              onClick={() => setViewSecretSourceId(null)}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg"
            >
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

export default LeadSourcesTab
