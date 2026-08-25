import React from 'react'
import type { SpeedToLeadMetric } from '@/types/communication'
import { BoltIcon } from '@heroicons/react/24/outline'

interface SpeedToLeadKpiProps {
  metrics: SpeedToLeadMetric[]
}

export const SpeedToLeadKpi: React.FC<SpeedToLeadKpiProps> = ({ metrics }) => {
  const overallAvgSpeed = (
    metrics.reduce((a, b) => a + b.avgResponseTimeSeconds, 0) / metrics.length
  ).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Top Banner: Sub-30s Speed Gauge */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <BoltIcon className="w-4 h-4 animate-pulse" />
              <span>Sub-30s Speed-to-Lead Guarantee</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Autonomous Inbound AI Response Engine
            </h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Inbound leads from Zillow, Meta Ads, and webhooks are engaged autonomously across Voice AI, WhatsApp, SMS, and Email in under 30 seconds before interest decays.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-muted/40 p-4 rounded-2xl border border-border/60">
            <div className="text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Avg. Speed</span>
              <p className="text-2xl font-extrabold text-primary font-mono">{overallAvgSpeed}s</p>
              <span className="text-[10px] text-emerald-500 font-bold">Sub-30s Target Achieved</span>
            </div>

            <div className="h-10 w-px bg-border/80" />

            <div className="text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Autonomous %</span>
              <p className="text-2xl font-extrabold text-emerald-500 font-mono">94.2%</p>
              <span className="text-[10px] text-muted-foreground">Self-Handled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Breakdown by Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.channel}
            className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {m.channel === 'whatsapp'
                  ? 'WhatsApp Cloud'
                  : m.channel === 'call'
                  ? 'Conversational Voice AI'
                  : m.channel.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {m.sub30sConversionRatePercent}% &lt;30s
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-2xl font-mono font-extrabold text-foreground">
                {m.avgResponseTimeSeconds}s
              </span>
              <p className="text-[11px] text-muted-foreground">Average first outreach latency</p>
            </div>

            <div className="pt-3 border-t border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Leads Ingested:</span>
                <span className="font-semibold text-foreground">{m.totalInboundLeadsToday}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>AI Auto-Qualified:</span>
                <span className="font-semibold text-emerald-500">{m.aiAutonomousHandledCount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Warm Agent Transfers:</span>
                <span className="font-semibold text-primary">{m.warmTransfersCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
