import { useState } from 'react'
import { useGetLeadSourcesQuery } from '@/store/api/leadsApi'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { KpiCard } from '@/components/shared/KpiCard'
import { useCountUp } from '@/hooks/useCountUp'
import { ResponsivePageNav, type NavTabItem } from '@/components/navigation/ResponsivePageNav'

import { LeadSourcesTab } from './components/LeadSourcesTab'
import { RoutingRulesTab } from './components/RoutingRulesTab'
import { ScoringConfigTab } from './components/ScoringConfigTab'
import { LeadCaptureWidgetTab } from './components/LeadCaptureWidgetTab'
import { ManualLeadModal } from './components/ManualLeadModal'

const TABS: NavTabItem[] = [
  { id: 'sources', label: 'Lead Sources', icon: 'hub' },
  { id: 'routing', label: 'Routing Rules', icon: 'alt_route' },
  { id: 'scoring', label: 'Scoring Engine', icon: 'analytics' },
  { id: 'widget', label: 'Capture Widget', icon: 'widgets' },
]

export function LeadIngestionPage() {
  const [activeTab, setActiveTab] = useState('sources')
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const { data: sourcesData } = useGetLeadSourcesQuery()
  const leadSources = sourcesData?.leadSources || []

  // Calculate live summary stats
  const totalLeadsCount = leadSources.reduce((acc, s) => acc + (s.leadCount || 0), 0)
  const activeSourcesCount = leadSources.filter((s) => s.isActive).length

  const animatedTotalLeads = useCountUp({ end: totalLeadsCount, duration: 1200 })

  return (
    <div className="space-y-6 pb-12">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Unified Responsive Navigation: identical sliding pill for mobile & tablet (< lg), horizontal track on desktop (lg+) */}
        <ResponsivePageNav
          tabs={TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sticky
          extraAction={
            <Button
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-full md:rounded-xl shrink-0 shadow-sm border border-[#9CB080] transition-all cursor-pointer"
            >
              <MaterialIcon name="person_add" size={16} />
              <span className="hidden sm:inline">Add Lead</span>
            </Button>
          }
        />

        {/* Page Title & Concise Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
              Lead Ingestion
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
              Automated ingestion, scoring, and distribution
            </p>
          </div>
        </div>

        {/* Global KPI Cards: Occupy full space with 2 large cards using KpiCard layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 pt-3 w-full">
          <KpiCard
            title="Total Leads"
            value={animatedTotalLeads.toLocaleString()}
            icon="sensors"
            trend={{ value: 14.2, isPositive: true }}
            subtitle="Live Ingestion"
            className="w-full"
          />

          <KpiCard
            title="Active Sources"
            value={`${activeSourcesCount} / ${leadSources.length}`}
            icon="hub"
            trend={{ value: 4.8, isPositive: true }}
            subtitle="HMAC Secured"
            className="w-full"
          />
        </div>

        {/* Tab 1: Lead Sources */}
        <TabsContent value="sources" className="space-y-4 outline-none focus:outline-none">
          <LeadSourcesTab />
        </TabsContent>

        {/* Tab 2: Routing Rules */}
        <TabsContent value="routing" className="space-y-4 outline-none focus:outline-none">
          <RoutingRulesTab />
        </TabsContent>

        {/* Tab 3: Scoring Engine */}
        <TabsContent value="scoring" className="space-y-4 outline-none focus:outline-none">
          <ScoringConfigTab />
        </TabsContent>

        {/* Tab 4: Capture Widget */}
        <TabsContent value="widget" className="space-y-4 outline-none focus:outline-none">
          <LeadCaptureWidgetTab />
        </TabsContent>
      </Tabs>

      {/* Manual Lead Modal */}
      <ManualLeadModal
        open={isManualModalOpen}
        onOpenChange={setIsManualModalOpen}
      />
    </div>
  )
}

export default LeadIngestionPage
