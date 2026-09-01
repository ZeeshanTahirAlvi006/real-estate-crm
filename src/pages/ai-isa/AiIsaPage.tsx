import { useState } from 'react'
import {
  useGetQualificationCriteriaQuery,
  useUpdateQualificationCriteriaMutation,
  useGetReactivationCampaignsQuery,
  useToggleReactivationCampaignMutation,
  useGetSpeedToLeadMetricsQuery,
  useGetAiIsaConfigQuery,
} from '@/store/api/communicationApi'
import { SpeedToLeadKpi } from './components/SpeedToLeadKpi'
import { LiveAiConversations } from './components/LiveAiConversations'
import { ReactivationCampaigns } from './components/ReactivationCampaigns'
import { QualificationConfig } from './components/QualificationConfig'
import { AiIsaConfigSettings } from './components/AiIsaConfigSettings'
import { AiIsaSimulator } from './components/AiIsaSimulator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
  SparklesIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function AiIsaPage() {
  const [activeTab, setActiveTab] = useState('live')

  const { data: config, isLoading: loadingConfig } = useGetAiIsaConfigQuery()
  const { data: criteria = [], isLoading: loadingCriteria } = useGetQualificationCriteriaQuery()
  const [updateCriteria] = useUpdateQualificationCriteriaMutation()

  const { data: campaigns = [], isLoading: loadingCampaigns } = useGetReactivationCampaignsQuery()
  const [toggleCampaign] = useToggleReactivationCampaignMutation()

  const { data: speedMetrics = [], isLoading: loadingMetrics } = useGetSpeedToLeadMetricsQuery()

  const handleSaveCriteria = async (updatedList: any[]) => {
    try {
      for (const item of updatedList) {
        await updateCriteria({
          id: item.id,
          isRequired: item.isRequired,
          promptDirective: item.promptDirective,
        }).unwrap()
      }
      toast.success('Qualification criteria directives saved successfully')
    } catch {
      toast.error('Failed to update criteria')
    }
  }

  const handleToggleCampaign = async (id: string) => {
    try {
      await toggleCampaign(id).unwrap()
      toast.success('Campaign status updated')
    } catch {
      toast.error('Failed to update campaign')
    }
  }

  if (loadingCriteria || loadingCampaigns || loadingMetrics || loadingConfig) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-140 w-full rounded-3xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Engine Status Banner */}
      {config && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 rounded-2xl bg-linear-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.isEnabled ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${config.isEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-foreground">AI ISA: {config.persona?.name || 'Maya'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground capitalize">Tone: {config.persona?.tone || 'Professional'}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono">
                {config.autoReplyChannels?.map((c) => c.toUpperCase()).join(' | ') || 'SMS'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${config.autoPilotEnabled
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
            >
              {config.autoPilotEnabled ? 'Autopilot Active' : 'Draft Mode'}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 ml-2"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              <span>Configure Persona</span>
            </button>
          </div>
        </div>
      )}

      {/* Speed-to-Lead KPIs & Live Latency Banner */}
      <SpeedToLeadKpi metrics={speedMetrics} />

      {/* Main Tabbed ISA Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <TabsList className="bg-muted/50 p-1 flex flex-wrap gap-1">
            <TabsTrigger value="live" className="text-xs font-semibold gap-1.5">
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>⚡ Live AI Lead Conversations & WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs font-semibold gap-1.5">
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Reactivation Campaigns ({campaigns.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs font-semibold gap-1.5">
              <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
              <span>Qualification Rules ({criteria.length})</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs font-semibold gap-1.5">
              <Cog6ToothIcon className="w-3.5 h-3.5" />
              <span>Engine & Persona Settings</span>
            </TabsTrigger>
            <TabsTrigger value="sandbox" className="text-xs font-semibold gap-1.5 text-muted-foreground">
              <CommandLineIcon className="w-3.5 h-3.5" />
              <span>🧪 Prompt Testing Sandbox</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Live Active AI Lead Conversations Tab (Front & Center) */}
        <TabsContent value="live">
          <LiveAiConversations />
        </TabsContent>

        {/* Reactivation Campaigns Tab */}
        <TabsContent value="campaigns">
          <ReactivationCampaigns
            campaigns={campaigns}
            onToggleCampaign={handleToggleCampaign}
          />
        </TabsContent>

        {/* Qualification Criteria Config Tab */}
        <TabsContent value="rules">
          <QualificationConfig
            criteria={criteria}
            onSaveCriteria={handleSaveCriteria}
          />
        </TabsContent>

        {/* Engine & Persona Settings Tab */}
        <TabsContent value="config">
          <AiIsaConfigSettings />
        </TabsContent>

        {/* Developer Sandbox Tab */}
        <TabsContent value="sandbox">
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-bold block mb-0.5">Developer Testing Sandbox</span>
            Use this playground to test qualifying prompts and Fair Housing guardrails as a mock prospective buyer without sending real outbound messages.
          </div>
          <AiIsaSimulator />
        </TabsContent>
      </Tabs>
    </div>
  )
}
