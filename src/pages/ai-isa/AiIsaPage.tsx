import { useState } from 'react'
import {
  useGetQualificationCriteriaQuery,
  useUpdateQualificationCriteriaMutation,
  useGetReactivationCampaignsQuery,
  useToggleReactivationCampaignMutation,
  useGetSpeedToLeadMetricsQuery,
} from '@/store/api/communicationApi'
import { SpeedToLeadKpi } from './components/SpeedToLeadKpi'
import { AiIsaSimulator } from './components/AiIsaSimulator'
import { ReactivationCampaigns } from './components/ReactivationCampaigns'
import { QualificationConfig } from './components/QualificationConfig'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function AiIsaPage() {
  const [activeTab, setActiveTab] = useState('simulator')

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

  if (loadingCriteria || loadingCampaigns || loadingMetrics) {
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
      {/* Speed-to-Lead KPIs & Live Latency Banner */}
      <SpeedToLeadKpi metrics={speedMetrics} />

      {/* Main Tabbed ISA Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="simulator" className="text-xs font-semibold gap-1.5">
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
              <span>Live AI ISA Simulator</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs font-semibold gap-1.5">
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Reactivation Campaigns ({campaigns.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs font-semibold gap-1.5">
              <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
              <span>Qualification Rules ({criteria.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Live Simulator Tab */}
        <TabsContent value="simulator">
          <AiIsaSimulator />
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
      </Tabs>
    </div>
  )
}
