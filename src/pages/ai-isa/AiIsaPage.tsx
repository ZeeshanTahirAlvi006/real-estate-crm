import { useState, useMemo, useEffect } from 'react'
import {
  useGetQualificationCriteriaQuery,
  useUpdateQualificationCriteriaMutation,
  useGetReactivationCampaignsQuery,
  useToggleReactivationCampaignMutation,
  useGetSpeedToLeadMetricsQuery,
} from '@/store/api/communicationApi'
import { SpeedToLeadKpi } from './components/SpeedToLeadKpi'
import { LiveAiConversations } from './components/LiveAiConversations'
import { ReactivationCampaigns } from './components/ReactivationCampaigns'
import { QualificationConfig } from './components/QualificationConfig'
import { AiIsaConfigSettings } from './components/AiIsaConfigSettings'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ResponsivePageNav, type NavTabItem } from '@/components/navigation/ResponsivePageNav'
import { toast } from 'sonner'

export function AiIsaPage() {
  const [activeTab, setActiveTab] = useState('live')
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [scrollY, setScrollY] = useState(0)

  const { data: criteria = [], isLoading: loadingCriteria } = useGetQualificationCriteriaQuery()
  const [updateCriteria] = useUpdateQualificationCriteriaMutation()

  const { data: campaigns = [], isLoading: loadingCampaigns } = useGetReactivationCampaignsQuery()
  const [toggleCampaign] = useToggleReactivationCampaignMutation()

  const { data: speedMetrics = [], isLoading: loadingMetrics } = useGetSpeedToLeadMetricsQuery()

  // Smooth Parallax movement listener
  useEffect(() => {
    let frameId: number
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        const { innerWidth, innerHeight } = window
        const x = (e.clientX / innerWidth - 0.5) * 2
        const y = (e.clientY / innerHeight - 0.5) * 2
        setMousePos({ x, y })
      })
    }

    const handleScroll = () => {
      setScrollY(window.scrollY || 0)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const tabs: NavTabItem[] = useMemo(() => [
    { id: 'live', label: 'Live Leads', icon: 'forum' },
    { id: 'campaigns', label: 'Reactivations', icon: 'refresh', badge: campaigns.length },
    { id: 'rules', label: 'Qualification Rules', icon: 'tune', badge: criteria.length },
    { id: 'config', label: 'ISA Settings', icon: 'settings' },
  ], [campaigns.length, criteria.length])

  const handleSaveCriteria = async (updatedList: any[]) => {
    try {
      for (const item of updatedList) {
        await updateCriteria({
          id: item.id,
          isRequired: item.isRequired,
          promptDirective: item.promptDirective,
        }).unwrap()
      }
      toast.success('Rules saved successfully')
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
      <div className="space-y-6 pb-12">
        <Skeleton className="h-10 w-full max-w-xl rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="relative space-y-6 pb-12 min-h-full overflow-hidden">
      {/* Architectural Parallax Background Layers (Strict unicolors from theme.ts) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
        {/* Parallax Layer 1: Foreground Geometric Lines */}
        <div
          className="absolute -top-10 -right-10 w-96 h-96 rounded-full border border-[#D8E2D6]/30 dark:border-[#618764]/20 transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${mousePos.x * 12}px, ${mousePos.y * 8 - scrollY * 0.03}px, 0)`,
          }}
        />

        {/* Parallax Layer 2: Deeper Structural Accent Frame */}
        <div
          className="absolute top-1/3 -left-20 w-80 h-80 rounded-2xl border border-[#D8E2D6]/20 dark:border-[#618764]/15 transition-transform duration-500 ease-out rotate-12"
          style={{
            transform: `translate3d(${mousePos.x * -16}px, ${mousePos.y * -10 - scrollY * 0.05}px, 0)`,
          }}
        />

        {/* Parallax Layer 3: Solid Minimal Crosshair Watermark */}
        <div
          className="absolute bottom-20 right-1/4 w-48 h-48 border-r border-b border-[#D8E2D6]/20 dark:border-[#618764]/10 transition-transform duration-700 ease-out"
          style={{
            transform: `translate3d(${mousePos.x * 20}px, ${mousePos.y * 14}px, 0)`,
          }}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* 1. Responsive Navbar Component placed right under topbar for mobile/desktop & under topNavBar for tablet */}
        <ResponsivePageNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sticky
        />

        {/* 2. Page Title & Short Subtitle (2-3 words max) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
              AI ISA Engine
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
              Autonomous lead qualification
            </p>
          </div>
        </div>

        {/* 3. Global KPI Cards (Avg Speed, Autonomous %, WhatsApp, Email) */}
        <div className="w-full">
          <SpeedToLeadKpi metrics={speedMetrics} />
        </div>

        {/* 4. Tab Contents */}
        <div className="w-full">
          {/* Live AI Lead Conversations */}
          <TabsContent value="live" className="mt-0 focus-visible:outline-none">
            <LiveAiConversations />
          </TabsContent>

          {/* Reactivation Campaigns */}
          <TabsContent value="campaigns" className="mt-0 focus-visible:outline-none">
            <ReactivationCampaigns
              campaigns={campaigns}
              onToggleCampaign={handleToggleCampaign}
            />
          </TabsContent>

          {/* Qualification Criteria Rules */}
          <TabsContent value="rules" className="mt-0 focus-visible:outline-none">
            <QualificationConfig
              criteria={criteria}
              onSaveCriteria={handleSaveCriteria}
            />
          </TabsContent>

          {/* Engine & Persona Settings */}
          <TabsContent value="config" className="mt-0 focus-visible:outline-none">
            <AiIsaConfigSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

