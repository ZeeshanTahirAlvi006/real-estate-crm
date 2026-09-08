import React from 'react'
import type { SpeedToLeadMetric } from '@/types/communication'
import { KpiCard } from '@/components/shared/KpiCard'

interface SpeedToLeadKpiProps {
  metrics: SpeedToLeadMetric[]
}

export const SpeedToLeadKpi: React.FC<SpeedToLeadKpiProps> = ({ metrics }) => {
  const overallAvgSpeed = (
    metrics.reduce((a, b) => a + b.avgResponseTimeSeconds, 0) / (metrics.length || 1)
  ).toFixed(1)

  const whatsappMetric = metrics.find((m) => m.channel === 'whatsapp')
  const emailMetric = metrics.find((m) => m.channel === 'email')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 pt-2 w-full">
      {/* 1. Avg Speed */}
      <KpiCard
        title="Avg Speed"
        value={`${overallAvgSpeed}s`}
        icon="bolt"
        trend={{ value: 18.2, isPositive: true }}
        subtitle="Sub-30s Target"
      />

      {/* 2. Autonomous % */}
      <KpiCard
        title="Autonomous Rate"
        value="94.2%"
        icon="smart_toy"
        trend={{ value: 6.4, isPositive: true }}
        subtitle="Self Handled"
      />

      {/* 3. WhatsApp Leads */}
      <KpiCard
        title="WhatsApp Leads"
        value={whatsappMetric ? `${whatsappMetric.avgResponseTimeSeconds}s` : '12.4s'}
        icon="chat"
        badge={whatsappMetric ? `${whatsappMetric.sub30sConversionRatePercent}% <30s` : '98% <30s'}
        subtitle={
          whatsappMetric
            ? `${whatsappMetric.totalInboundLeadsToday} Leads · ${whatsappMetric.aiAutonomousHandledCount} Qualified`
            : '42 Leads · 39 Qualified'
        }
      />

      {/* 4. Email Leads */}
      <KpiCard
        title="Email Leads"
        value={emailMetric ? `${emailMetric.avgResponseTimeSeconds}s` : '22.8s'}
        icon="mail"
        badge={emailMetric ? `${emailMetric.sub30sConversionRatePercent}% <30s` : '94% <30s'}
        subtitle={
          emailMetric
            ? `${emailMetric.totalInboundLeadsToday} Leads · ${emailMetric.aiAutonomousHandledCount} Qualified`
            : '28 Leads · 26 Qualified'
        }
      />
    </div>
  )
}

