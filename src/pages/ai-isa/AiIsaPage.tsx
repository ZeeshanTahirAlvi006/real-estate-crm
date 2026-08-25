import React, { useState } from 'react'
import {
  useGetSpeedToLeadMetricsQuery,
  useGetQualificationCriteriaQuery,
  useUpdateQualificationCriteriaMutation,
  useGetReactivationCampaignsQuery,
  useToggleReactivationCampaignMutation,
} from '@/store/api/communicationApi'
import { SpeedToLeadKpi } from './components/SpeedToLeadKpi'
import { QualificationConfig } from './components/QualificationConfig'
import { ReactivationCampaigns } from './components/ReactivationCampaigns'
import { AiIsaSimulator } from './components/AiIsaSimulator'
import type { QualificationCriteria } from '@/types/communication'
import { SparklesIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export const AiIsaPage: React.FC = () => {
  const { data: metrics = [] } = useGetSpeedToLeadMetricsQuery()
  const { data: criteria = [] } = useGetQualificationCriteriaQuery()
  const { data: campaigns = [] } = useGetReactivationCampaignsQuery()

  const [updateCriteriaMutation] = useUpdateQualificationCriteriaMutation()
  const [toggleCampaignMutation] = useToggleReactivationCampaignMutation()

  const [activeSection, setActiveSection] = useState<'simulator' | 'metrics' | 'criteria' | 'reactivation'>('simulator')

  const handleSaveCriteria = async (newCriteria: QualificationCriteria[]) => {
    try {
      await updateCriteriaMutation(newCriteria).unwrap()
      toast.success('Qualification criteria updated')
    } catch {
      toast.error('Failed to update criteria')
    }
  }

  const handleToggleCampaign = async (id: string, status: 'active' | 'paused') => {
    try {
      await toggleCampaignMutation({ id, status }).unwrap()
      toast.success(`Campaign ${status === 'active' ? 'activated' : 'paused'}`)
    } catch {
      toast.error('Failed to toggle campaign')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Sub-30s Omnichannel AI ISA Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <SparklesIcon className="w-3.5 h-3.5" /> Multi-Modal AI
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Autonomous lead qualification across Voice AI, WhatsApp, SMS & Email with instant human-in-the-loop takeover.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveSection('simulator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSection === 'simulator'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
            Live AI Sandbox
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('metrics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSection === 'metrics'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Speed & Latency KPIs
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('criteria')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSection === 'criteria'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Qualification Directives
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('reactivation')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeSection === 'reactivation'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Database Reactivation
          </button>
        </div>
      </div>

      {/* Active Section Content */}
      {activeSection === 'simulator' && <AiIsaSimulator />}
      {activeSection === 'metrics' && <SpeedToLeadKpi metrics={metrics} />}
      {activeSection === 'criteria' && (
        <QualificationConfig criteria={criteria} onSaveCriteria={handleSaveCriteria} />
      )}
      {activeSection === 'reactivation' && (
        <ReactivationCampaigns
          campaigns={campaigns}
          onToggleCampaign={handleToggleCampaign}
        />
      )}
    </div>
  )
}
