import React from 'react'
import type { ReactivationCampaign } from '@/types/communication'
import {
  PlayIcon,
  PauseIcon,
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface ReactivationCampaignsProps {
  campaigns: ReactivationCampaign[]
  onToggleCampaign: (id: string, newStatus: 'active' | 'paused') => void
}

export const ReactivationCampaigns: React.FC<ReactivationCampaignsProps> = ({
  campaigns,
  onToggleCampaign,
}) => {
  return (
    <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-foreground">
              Autonomous Database Reactivation Engine
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Background AI routines automatically reach out to dormant 90+ day old leads with localized market updates to re-ignite conversations (7-10% target re-engagement).
          </p>
        </div>

        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all hover:scale-[1.02] flex items-center gap-1.5"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Reactivation Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {campaigns.map((camp) => {
          const isActive = camp.status === 'active'

          return (
            <div
              key={camp.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                isActive
                  ? 'bg-muted/30 border-primary/40 shadow-sm'
                  : 'bg-muted/10 border-border/60 opacity-80'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
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

                <div>
                  <h4 className="font-bold text-sm text-foreground">{camp.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {camp.targetSegment}
                  </p>
                </div>

                {/* Performance Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Response Rate</span>
                    <span className="font-extrabold text-emerald-500 text-sm">
                      {camp.responseRatePercent}%
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {camp.respondedCount} / {camp.contactedCount} leads
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Meetings Booked</span>
                    <span className="font-extrabold text-primary text-sm">
                      {camp.meetingsBookedCount} Booked
                    </span>
                    <span className="text-[10px] text-muted-foreground block">Direct to calendar</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-mono">
                  &gt;{camp.dormantDaysThreshold} days dormant
                </span>

                <button
                  type="button"
                  onClick={() => onToggleCampaign(camp.id, isActive ? 'paused' : 'active')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                      : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                  }`}
                >
                  {isActive ? <PauseIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                  <span>{isActive ? 'Pause Campaign' : 'Resume Campaign'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
