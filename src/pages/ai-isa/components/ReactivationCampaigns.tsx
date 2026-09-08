import React, { useState } from 'react'
import type { ReactivationCampaign } from '@/types/communication'
import {
  useCreateReactivationCampaignMutation,
  useExecuteReactivationCampaignMutation,
  useStartReactivationCampaignMutation,
  usePauseReactivationCampaignMutation,
  useDeleteReactivationCampaignMutation,
  useLazyGetCampaignMetricsQuery,
} from '@/store/api/communicationApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { Button } from '@/components/ui/button'
import {
  TableGridToggle,
  TableGridToggleButton,
  type TableColumn,
  type TableGridViewMode,
} from '@/components/shared/TableGridToggle'
import { toast } from 'sonner'

interface ReactivationCampaignsProps {
  campaigns: ReactivationCampaign[]
  onToggleCampaign: (id: string, newStatus: 'active' | 'paused') => void
}

export const ReactivationCampaigns: React.FC<ReactivationCampaignsProps> = ({
  campaigns,
}) => {
  const [createCampaign, { isLoading: isCreating }] = useCreateReactivationCampaignMutation()
  const [executeCampaign, { isLoading: isExecuting }] = useExecuteReactivationCampaignMutation()
  const [startCampaign] = useStartReactivationCampaignMutation()
  const [pauseCampaign] = usePauseReactivationCampaignMutation()
  const [deleteCampaign] = useDeleteReactivationCampaignMutation()
  const [fetchMetrics, { data: selectedMetrics, isFetching: loadingMetrics }] = useLazyGetCampaignMetricsQuery()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [metricsModalOpen, setMetricsModalOpen] = useState(false)
  const [executingCampaignId, setExecutingCampaignId] = useState<string | null>(null)
  const [view, setView] = useState<TableGridViewMode>(() => {
    try {
      const saved = localStorage.getItem('crm_reactivation_campaigns_view')
      if (saved === 'table' || saved === 'grid') return saved
    } catch {
      // ignore
    }
    return 'grid'
  })

  const [formData, setFormData] = useState({
    name: '',
    targetSegment: 'Dormant Leads',
    channel: 'whatsapp',
    dormantDaysThreshold: 90,
    messageTemplate:
      'Hi {{firstName}}, are you still looking for homes in {{city}}? We just had new off-market listings hit our desk this morning!',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCampaign(formData).unwrap()
      toast.success('Campaign created successfully')
      setIsModalOpen(false)
      setFormData({
        name: '',
        targetSegment: 'Dormant Leads',
        channel: 'whatsapp',
        dormantDaysThreshold: 90,
        messageTemplate:
          'Hi {{firstName}}, are you still looking for homes in {{city}}? We just had new off-market listings hit our desk this morning!',
      })
    } catch {
      toast.error('Failed to create campaign')
    }
  }

  const handleStart = async (id: string) => {
    try {
      await startCampaign(id).unwrap()
      toast.success('Campaign activated')
    } catch {
      toast.error('Failed to start campaign')
    }
  }

  const handlePause = async (id: string) => {
    try {
      await pauseCampaign(id).unwrap()
      toast.success('Campaign paused')
    } catch {
      toast.error('Failed to pause campaign')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete campaign "${name}"?`)) return
    try {
      await deleteCampaign(id).unwrap()
      toast.success('Campaign deleted')
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  const handleExecute = async (id: string, name?: string) => {
    try {
      setExecutingCampaignId(id)
      const res = await executeCampaign(id).unwrap()
      toast.success(res.message || (name ? `Campaign "${name}" batch dispatched` : 'Campaign batch dispatched'))
    } catch {
      toast.error('Failed to execute campaign scan')
    } finally {
      setExecutingCampaignId(null)
    }
  }

  const handleOpenMetrics = async (id: string) => {
    setMetricsModalOpen(true)
    await fetchMetrics(id)
  }

  // Table Columns
  const columns: TableColumn<ReactivationCampaign>[] = [
    {
      id: 'status',
      header: 'Status',
      className: 'w-24',
      cell: (camp) => {
        const isActive = camp.status === 'active'
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
              isActive
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40'
                : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-[#2B5748] dark:bg-[#9CB080]' : 'bg-[#75887E]'
              }`}
            />
            {camp.status}
          </span>
        )
      },
    },
    {
      id: 'name',
      header: 'Campaign',
      cell: (camp) => (
        <div>
          <span className="font-bold text-xs sm:text-sm text-[#273338] dark:text-white block">
            {camp.name}
          </span>
          <span className="text-[11px] text-[#4A5D54] dark:text-[#A0B2A6] line-clamp-1">
            {camp.targetSegment}
          </span>
        </div>
      ),
    },
    {
      id: 'channel',
      header: 'Channel',
      className: 'w-28',
      cell: (camp) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B5748] dark:text-[#9CB080] capitalize">
          <MaterialIcon
            name={camp.channel === 'whatsapp' ? 'chat' : 'mail'}
            size={15}
          />
          {camp.channel}
        </span>
      ),
    },
    {
      id: 'threshold',
      header: 'Threshold',
      className: 'w-28',
      cell: (camp) => (
        <span className="font-mono text-xs text-[#75887E] dark:text-[#A0B2A6]">
          &gt;{camp.dormantDaysThreshold || 90}d
        </span>
      ),
    },
    {
      id: 'responseRate',
      header: 'Response',
      className: 'w-32',
      cell: (camp) => {
        const rate =
          camp.responseRatePercent ??
          (camp.contactedCount > 0
            ? Math.round(((camp.respondedCount || 0) / camp.contactedCount) * 100)
            : 0)
        return (
          <div>
            <span className="font-extrabold text-[#2B5748] dark:text-[#9CB080] text-xs">
              {rate}%
            </span>
            <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">
              {camp.respondedCount || 0} / {camp.contactedCount || 0}
            </span>
          </div>
        )
      },
    },
    {
      id: 'booked',
      header: 'Booked',
      className: 'w-24',
      cell: (camp) => (
        <span className="font-extrabold text-[#2B5748] dark:text-[#9CB080] text-xs">
          {camp.meetingsBookedCount || 0}
        </span>
      ),
    },
    {
      id: 'lastRun',
      header: 'Last Run',
      className: 'w-28',
      cell: (camp) => (
        <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
          {camp.lastRunAt ? new Date(camp.lastRunAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      className: 'w-44',
      cell: (camp) => {
        const isActive = camp.status === 'active'
        const isCurrentExecuting = executingCampaignId === camp.id && isExecuting
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => (isActive ? handlePause(camp.id) : handleStart(camp.id))}
              className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40 hover:bg-[#9CB080]/30'
              }`}
              title={isActive ? 'Pause Campaign' : 'Activate Campaign'}
            >
              <MaterialIcon name={isActive ? 'pause' : 'play_arrow'} size={14} />
            </button>
            <button
              type="button"
              disabled={isCurrentExecuting}
              onClick={() => handleExecute(camp.id, camp.name)}
              className="p-1.5 rounded-lg bg-[#2B5748] hover:bg-[#23473B] text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Execute Scan"
            >
              <MaterialIcon
                name="bolt"
                size={14}
                className={isCurrentExecuting ? 'animate-spin' : ''}
              />
            </button>
            <button
              type="button"
              onClick={() => handleOpenMetrics(camp.id)}
              className="p-1.5 rounded-lg hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-all cursor-pointer"
              title="View Analytics"
            >
              <MaterialIcon name="bar_chart" size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(camp.id, camp.name)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#75887E] dark:text-[#A0B2A6] hover:text-red-500 transition-all cursor-pointer"
              title="Delete Campaign"
            >
              <MaterialIcon name="delete" size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  // Render Grid Card (Strictly 2 per row via TableGridToggle)
  const renderCampaignCard = (camp: ReactivationCampaign) => {
    const isActive = camp.status === 'active'
    const isCurrentExecuting = executingCampaignId === camp.id && isExecuting

    return (
      <div
        className={`p-5 rounded-2xl border flex flex-col justify-between h-full space-y-4 transition-all ${
          isActive
            ? 'bg-white dark:bg-[#254238] border-[#9CB080] shadow-xs'
            : 'bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/50'
        }`}
      >
        <div className="space-y-3">
          {/* Header Pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                  isActive
                    ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40'
                    : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40'
                }`}
              >
                {camp.status}
              </span>
              <span className="text-[11px] font-bold text-[#2B5748] dark:text-[#9CB080] capitalize">
                {camp.channel}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleOpenMetrics(camp.id)}
                className="p-1.5 rounded-lg hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-all cursor-pointer"
                title="View Analytics"
              >
                <MaterialIcon name="bar_chart" size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(camp.id, camp.name)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#75887E] dark:text-[#A0B2A6] hover:text-red-500 transition-all cursor-pointer"
                title="Delete Campaign"
              >
                <MaterialIcon name="delete" size={16} />
              </button>
            </div>
          </div>

          {/* Campaign Titles */}
          <div>
            <h4 className="font-bold text-sm text-[#273338] dark:text-white">{camp.name}</h4>
            <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] line-clamp-1 mt-0.5">
              {camp.targetSegment}
            </p>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40">
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block font-medium">
                Response Rate
              </span>
              <span className="font-extrabold text-[#2B5748] dark:text-[#9CB080] text-sm">
                {camp.responseRatePercent ??
                  (camp.contactedCount > 0
                    ? Math.round(((camp.respondedCount || 0) / camp.contactedCount) * 100)
                    : 0)}
                %
              </span>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">
                {camp.respondedCount || 0} / {camp.contactedCount || 0} contacted
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40">
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block font-medium">
                Booked
              </span>
              <span className="font-extrabold text-[#2B5748] dark:text-[#9CB080] text-sm">
                {camp.meetingsBookedCount || 0}
              </span>
              <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">
                Direct bookings
              </span>
            </div>
          </div>

          {/* Message Template Preview */}
          <div className="p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 text-[11px] text-[#4A5D54] dark:text-[#A0B2A6] italic line-clamp-2">
            "{camp.messageTemplate}"
          </div>
        </div>

        {/* Action Buttons & Footer */}
        <div className="pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
            <span className="font-mono">
              &gt;{camp.dormantDaysThreshold || 90}d dormant
            </span>
            {camp.lastRunAt && (
              <span className="text-[10px] opacity-75">
                Last: {new Date(camp.lastRunAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => (isActive ? handlePause(camp.id) : handleStart(camp.id))}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40 hover:bg-[#9CB080]/30'
              }`}
            >
              <MaterialIcon name={isActive ? 'pause' : 'play_arrow'} size={14} />
              <span>{isActive ? 'Pause' : 'Activate'}</span>
            </button>

            <button
              type="button"
              disabled={isCurrentExecuting}
              onClick={() => handleExecute(camp.id, camp.name)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#2B5748] hover:bg-[#23473B] text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <MaterialIcon
                name="bolt"
                size={14}
                className={isCurrentExecuting ? 'animate-spin' : ''}
              />
              <span>{isCurrentExecuting ? 'Running...' : 'Execute'}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      {/* Top Controls Header with Table/Grid Toggle & New Campaign Button on Top-Right */}
      <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/60">
            <MaterialIcon name="refresh" size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#273338] dark:text-white truncate">
              Reactivation Campaigns
            </h3>
            <p className="text-[11px] sm:text-xs text-[#4A5D54] dark:text-[#A0B2A6] truncate">
              Re-engage dormant leads with AI messaging
            </p>
          </div>
        </div>

        {/* Top-Right: TableGridToggleButton + New Campaign Button (with just '+' sign on mobile) */}
        <div className="flex items-center gap-2 shrink-0">
          <TableGridToggleButton
            view={view}
            onViewChange={setView}
            storageKey="crm_reactivation_campaigns_view"
          />
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-2.5 sm:px-3.5 gap-1.5 rounded-lg shrink-0 border border-[#9CB080] shadow-xs cursor-pointer transition-all"
            title="New Campaign"
          >
            <MaterialIcon name="add" size={18} />
            <span className="hidden sm:inline">New Campaign</span>
          </Button>
        </div>
      </div>

      {/* Campaigns Table / Grid via TableGridToggle */}
      <TableGridToggle<ReactivationCampaign>
        data={campaigns}
        keyExtractor={(camp) => camp.id}
        columns={columns}
        renderCard={renderCampaignCard}
        view={view}
        onViewChange={setView}
        storageKey="crm_reactivation_campaigns_view"
        hideToggle
        emptyIcon="refresh"
        emptyTitle="No campaigns found"
        emptyDescription="Create a campaign to automatically re-engage dormant leads."
      />

      {/* Modal: Create New Reactivation Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-6 shadow-xl max-w-lg w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center gap-2">
                <MaterialIcon name="add" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
                <h4 className="font-bold text-base text-[#273338] dark:text-white">
                  New Reactivation Campaign
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] cursor-pointer"
              >
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Q3 Stale Leads"
                  className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                    Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                    Dormant (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={formData.dormantDaysThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, dormantDaysThreshold: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block mb-1">
                  Target Segment
                </label>
                <input
                  type="text"
                  required
                  value={formData.targetSegment}
                  onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                  placeholder="e.g. Inactive 90+ days"
                  className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] block">
                    Message Template
                  </label>
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                    Tags: {'{{firstName}}'}, {'{{city}}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={formData.messageTemplate}
                  onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8E2D6] dark:border-[#618764] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] font-semibold text-[#4A5D54] dark:text-[#A0B2A6] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detailed Campaign Metrics */}
      {metricsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764] rounded-2xl p-6 shadow-xl max-w-md w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center gap-2">
                <MaterialIcon name="bar_chart" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
                <h4 className="font-bold text-base text-[#273338] dark:text-white">Campaign Analytics</h4>
              </div>
              <button
                type="button"
                onClick={() => setMetricsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] cursor-pointer"
              >
                <MaterialIcon name="close" size={18} />
              </button>
            </div>

            {loadingMetrics ? (
              <div className="p-8 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Loading metrics...
              </div>
            ) : selectedMetrics ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-1">
                  <span className="font-bold text-sm text-[#273338] dark:text-white block">{selectedMetrics.name}</span>
                  <span className="text-[11px] text-[#4A5D54] dark:text-[#A0B2A6] capitalize">
                    Status: {selectedMetrics.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">Response</span>
                    <span className="text-base font-extrabold text-[#2B5748] dark:text-[#9CB080]">
                      {selectedMetrics.responseRatePercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">Engaged</span>
                    <span className="text-base font-extrabold text-[#2B5748] dark:text-[#9CB080]">
                      {selectedMetrics.engagementRatePercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                    <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block">Converted</span>
                    <span className="text-base font-extrabold text-[#2B5748] dark:text-[#9CB080]">
                      {selectedMetrics.conversionRatePercent}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
                  <div className="flex justify-between">
                    <span className="text-[#4A5D54] dark:text-[#A0B2A6]">Total Contacted:</span>
                    <span className="font-bold text-[#273338] dark:text-white">{selectedMetrics.contactedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A5D54] dark:text-[#A0B2A6]">Responded:</span>
                    <span className="font-bold text-[#2B5748] dark:text-[#9CB080]">{selectedMetrics.respondedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A5D54] dark:text-[#A0B2A6]">Bookings:</span>
                    <span className="font-bold text-[#273338] dark:text-white">{selectedMetrics.meetingsBookedCount}</span>
                  </div>
                  {selectedMetrics.lastRunAt && (
                    <div className="flex justify-between pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/40 text-[10px]">
                      <span className="text-[#75887E] dark:text-[#A0B2A6]">Last Run:</span>
                      <span className="font-mono text-[#273338] dark:text-white">{new Date(selectedMetrics.lastRunAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#75887E] dark:text-[#A0B2A6]">
                No metrics available for this campaign.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

