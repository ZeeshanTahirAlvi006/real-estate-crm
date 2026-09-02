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
import {
  PlayIcon,
  PauseIcon,
  PlusIcon,
  ArrowPathIcon,
  BoltIcon,
  TrashIcon,
  ChartBarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
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

  const [formData, setFormData] = useState({
    name: '',
    targetSegment: 'Cold Leads (90+ Days Inactive)',
    channel: 'whatsapp',
    dormantDaysThreshold: 90,
    messageTemplate:
      'Hi {{firstName}}, are you still looking for homes in {{city}}, or have your plans shifted? We just had new off-market listings hit our desk this morning!',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCampaign(formData).unwrap()
      toast.success(`Campaign "${formData.name}" created successfully`)
      setIsModalOpen(false)
      setFormData({
        name: '',
        targetSegment: 'Cold Leads (90+ Days Inactive)',
        channel: 'whatsapp',
        dormantDaysThreshold: 90,
        messageTemplate:
          'Hi {{firstName}}, are you still looking for homes in {{city}}, or have your plans shifted? We just had new off-market listings hit our desk this morning!',
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
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"?`)) return
    try {
      await deleteCampaign(id).unwrap()
      toast.success('Campaign deleted')
    } catch {
      toast.error('Failed to delete campaign')
    }
  }

  const handleExecute = async (id: string, name: string) => {
    try {
      setExecutingCampaignId(id)
      const res = await executeCampaign(id).unwrap()
      toast.success(res.message || `Campaign "${name}" batch dispatched`)
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

  return (
    <div className="space-y-6">
      {/* Top Engine Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-foreground">
              Autonomous Database Reactivation Engine
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Background AI routines automatically query dormant leads, generate personalized outreach copy, and re-ignite conversations (7-10% target re-engagement).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Reactivation Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {campaigns.map((camp) => {
          const isActive = camp.status === 'active'
          const isCurrentExecuting = executingCampaignId === camp.id && isExecuting

          return (
            <div
              key={camp.id}
              className={`p-5 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
                isActive
                  ? 'bg-card border-primary/30 shadow-sm hover:border-primary/50'
                  : 'bg-muted/10 border-border/60 opacity-85'
              }`}
            >
              <div className="space-y-3">
                {/* Header Pills */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-muted text-muted-foreground border-border/60'
                      }`}
                    >
                      {camp.status}
                    </span>
                    <span className="text-[11px] font-bold text-primary capitalize">
                      {camp.channel} Channel
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenMetrics(camp.id)}
                      className="p-1.5 rounded-lg hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all"
                      title="View Detailed Analytics"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(camp.id, camp.name)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                      title="Delete Campaign"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campaign Titles */}
                <div>
                  <h4 className="font-bold text-sm text-foreground">{camp.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {camp.targetSegment}
                  </p>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-medium">Response Rate</span>
                    <span className="font-extrabold text-emerald-500 text-sm">
                      {camp.responseRatePercent ?? (camp.contactedCount > 0 ? Math.round(((camp.respondedCount || 0) / camp.contactedCount) * 100) : 0)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {camp.respondedCount || 0} / {camp.contactedCount || 0} contacted
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block font-medium">Meetings Booked</span>
                    <span className="font-extrabold text-primary text-sm">
                      {camp.meetingsBookedCount || 0} Booked
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Direct to calendar</span>
                  </div>
                </div>

                {/* Message Template Preview */}
                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground italic line-clamp-2">
                  "{camp.messageTemplate}"
                </div>
              </div>

              {/* Action Buttons & Footer */}
              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono">
                    &gt;{camp.dormantDaysThreshold || 90}d dormant
                  </span>
                  {camp.lastRunAt && (
                    <span className="text-[10px] opacity-75">
                      Last scan: {new Date(camp.lastRunAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => (isActive ? handlePause(camp.id) : handleStart(camp.id))}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isActive ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Pause' : 'Activate'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isCurrentExecuting}
                    onClick={() => handleExecute(camp.id, camp.name)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm disabled:opacity-50"
                  >
                    <BoltIcon className={`w-3.5 h-3.5 ${isCurrentExecuting ? 'animate-spin' : ''}`} />
                    <span>{isCurrentExecuting ? 'Running...' : 'Execute Scan'}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Create New Reactivation Campaign */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <PlusIcon className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">
                  Create Autonomous Reactivation Campaign
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Q3 Stale Leads Market Check-In"
                  className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Channel
                  </label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="whatsapp">WhatsApp Cloud</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Dormant Cutoff (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={formData.dormantDaysThreshold}
                    onChange={(e) =>
                      setFormData({ ...formData, dormantDaysThreshold: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                  Target Segment Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.targetSegment}
                  onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                  placeholder="e.g. Inactive buyers with no contact in 90+ days"
                  className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold uppercase tracking-wider text-muted-foreground block">
                    Message Template
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Available tags: {'{{firstName}}'}, {'{{city}}'}, {'{{propertyInterests}}'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={formData.messageTemplate}
                  onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-background border border-border/70 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border/70 hover:bg-muted font-semibold text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detailed Campaign Metrics */}
      {metricsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-base text-foreground">Campaign Performance Analytics</h4>
              </div>
              <button
                type="button"
                onClick={() => setMetricsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {loadingMetrics ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading analytics metrics...
              </div>
            ) : selectedMetrics ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 space-y-1">
                  <span className="font-bold text-sm text-foreground block">{selectedMetrics.name}</span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    Status: {selectedMetrics.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Response Rate</span>
                    <span className="text-base font-extrabold text-emerald-500">
                      {selectedMetrics.responseRatePercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Engagement</span>
                    <span className="text-base font-extrabold text-primary">
                      {selectedMetrics.engagementRatePercent}%
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/20 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Converted</span>
                    <span className="text-base font-extrabold text-purple-500">
                      {selectedMetrics.conversionRatePercent}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/60">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Contacted:</span>
                    <span className="font-bold text-foreground">{selectedMetrics.contactedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responded Leads:</span>
                    <span className="font-bold text-emerald-500">{selectedMetrics.respondedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meetings Booked:</span>
                    <span className="font-bold text-primary">{selectedMetrics.meetingsBookedCount}</span>
                  </div>
                  {selectedMetrics.lastRunAt && (
                    <div className="flex justify-between pt-1 border-t border-border/40 text-[10px]">
                      <span className="text-muted-foreground">Last Run:</span>
                      <span className="font-mono">{new Date(selectedMetrics.lastRunAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No metrics available for this campaign.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
