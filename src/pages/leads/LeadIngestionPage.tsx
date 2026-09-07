import { useState, useRef, useEffect } from 'react'
import { useGetLeadSourcesQuery } from '@/store/api/leadsApi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { StatCard } from '@/components/shared/StatCard'
import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

import { LeadSourcesTab } from './components/LeadSourcesTab'
import { RoutingRulesTab } from './components/RoutingRulesTab'
import { ScoringConfigTab } from './components/ScoringConfigTab'
import { LeadCaptureWidgetTab } from './components/LeadCaptureWidgetTab'
import { ManualLeadModal } from './components/ManualLeadModal'

interface TabItem {
  id: string
  label: string
  icon: string
}

const TABS: TabItem[] = [
  { id: 'sources', label: 'Lead Sources', icon: 'hub' },
  { id: 'routing', label: 'Routing Rules', icon: 'alt_route' },
  { id: 'scoring', label: 'Scoring Engine', icon: 'analytics' },
  { id: 'widget', label: 'Capture Widget', icon: 'widgets' },
]

// Mobile Navbar Pill: Active tab completely visible in center, others slide to sides with overflow-hidden
function MobileNavbarPill({
  activeTab,
  onSelectTab,
}: {
  activeTab: string
  onSelectTab: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [translateX, setTranslateX] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const activeIndex = TABS.findIndex((t) => t.id === activeTab)

  const updatePosition = () => {
    if (!containerRef.current || activeIndex === -1) return
    const container = containerRef.current
    const activeEl = tabRefs.current[activeIndex]
    if (!activeEl) return

    const containerWidth = container.offsetWidth
    const activeCenter = activeEl.offsetLeft + activeEl.offsetWidth / 2
    const targetOffset = containerWidth / 2 - activeCenter
    setTranslateX(targetOffset)
  }

  useEffect(() => {
    // Slight timeout allows font/DOM measurement to settle
    const timer = setTimeout(updatePosition, 20)
    return () => clearTimeout(timer)
  }, [activeTab, activeIndex])

  useEffect(() => {
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [activeTab, activeIndex])

  const handlePrev = () => {
    if (activeIndex > 0) {
      onSelectTab(TABS[activeIndex - 1].id)
    }
  }

  const handleNext = () => {
    if (activeIndex < TABS.length - 1) {
      onSelectTab(TABS[activeIndex + 1].id)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 35) {
      handlePrev()
    } else if (deltaX < -35) {
      handleNext()
    }
    touchStartX.current = null
  }

  return (
    <div className="relative flex items-center justify-between w-full rounded-full bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60 p-0.5 shadow-xs overflow-hidden">
      {/* Left Chevron */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={activeIndex === 0}
        aria-label="Previous tab"
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer z-10"
      >
        <MaterialIcon name="chevron_left" size={18} />
      </button>

      {/* Sliding Viewport with overflow-hidden */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 overflow-hidden h-9 flex items-center justify-start select-none"
      >
        <div
          className="flex items-center gap-1.5 transition-transform duration-300 ease-out will-change-transform absolute left-0"
          style={{
            transform: `translateX(${translateX}px)`,
          }}
        >
          {TABS.map((tab, idx) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[idx] = el
                }}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-[#9CB080] text-[#273338] font-bold shadow-xs scale-100 opacity-100 z-10'
                    : 'text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white opacity-40 scale-90'
                )}
              >
                <MaterialIcon name={tab.icon} size={16} />
                <span className="inline-block whitespace-nowrap font-bold">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Chevron */}
      <button
        type="button"
        onClick={handleNext}
        disabled={activeIndex === TABS.length - 1}
        aria-label="Next tab"
        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 transition-all cursor-pointer z-10"
      >
        <MaterialIcon name="chevron_right" size={18} />
      </button>
    </div>
  )
}

export function LeadIngestionPage() {
  const [activeTab, setActiveTab] = useState('sources')
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  const { data: sourcesData } = useGetLeadSourcesQuery()

  const sources = sourcesData?.leadSources || []
  const activeSourcesCount = sources.filter((s) => s.isActive).length
  const totalLeadsCount = sources.reduce((sum, s) => sum + (s.leadCount || 0), 0)

  const animatedTotalLeads = useCountUp({ end: totalLeadsCount, duration: 1200 })

  return (
    <div className="space-y-6 pb-12">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Top Navigation Bar: Below top bar for desktop, below tablet top nav for tablets, and on top for mobiles */}
        <div className="sticky top-0 z-20 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-[#F5F7F4]/95 dark:bg-[#1E282D]/95 backdrop-blur-md border-b border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs">
          <div className="flex items-center justify-between gap-2.5 max-w-full">
            {/* Desktop & Tablet Navigation (visible on md+) */}
            <div className="hidden md:flex items-center flex-1 min-w-0">
              <TabsList className="h-auto p-1 bg-white/90 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/60 rounded-xl flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar shadow-xs">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-xs font-semibold px-3.5 py-2 rounded-lg gap-2 whitespace-nowrap data-[state=active]:bg-[#9CB080] data-[state=active]:text-[#273338] data-[state=active]:font-bold data-[state=active]:shadow-xs text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white transition-all cursor-pointer"
                  >
                    <MaterialIcon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Mobile Navigation Pill (visible on < md): Active tab completely visible, others slide to sides overflow:hidden out of navbar pill */}
            <div className="flex md:hidden flex-1 min-w-0">
              <MobileNavbarPill activeTab={activeTab} onSelectTab={setActiveTab} />
            </div>

            {/* Header Action Button */}
            <Button
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-full md:rounded-xl shrink-0 shadow-sm border border-[#9CB080] transition-all cursor-pointer"
            >
              <MaterialIcon name="person_add" size={16} />
              <span className="hidden sm:inline">Add Lead</span>
            </Button>
          </div>
        </div>

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

        {/* Global KPI Cards: Occupy full space with 2 large cards using Dashboard StatCard layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 pt-3 w-full">
          <StatCard
            title="Total Leads"
            value={animatedTotalLeads.toLocaleString()}
            icon={<MaterialIcon name="sensors" size={20} />}
            trend={{ value: 14.2, isPositive: true }}
            subtitle="Live Ingestion"
            className="w-full"
          />

          <StatCard
            title="Active Sources"
            value={`${activeSourcesCount} / ${sources.length}`}
            icon={<MaterialIcon name="hub" size={20} />}
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
