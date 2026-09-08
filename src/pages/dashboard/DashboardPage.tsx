import { useRef, useEffect, useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { KpiCard } from '@/components/shared/KpiCard'
import { LeadSourceChart } from './components/LeadSourceChart'
import { LeadsOverTimeChart } from './components/LeadsOverTimeChart'
import { ActivityFeed } from './components/ActivityFeed'
import { LeadPortalPage } from '@/pages/portal/LeadPortalPage'
import { useGetDashboardKpisQuery } from '@/store/api/dashboardApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'
import { ROLE_LABELS } from '@/constants/roles'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'

// Reusable Scroll-Reveal Section Wrapper
function ParallaxRevealSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={sectionRef}
      style={{
        transitionDelay: `${delay}ms`,
      }}
      className={cn(
        'transition-all duration-700 ease-out transform',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user)
  const isLead = user?.role === UserRole.LEAD

  const { data: dashboardKpis, isLoading: kpisLoading } = useGetDashboardKpisQuery(undefined, {
    skip: isLead,
  })

  // Direct client / business lead to the dedicated Client Dashboard
  if (isLead) {
    return <LeadPortalPage />
  }

  const totalContacts = dashboardKpis?.totalContacts ?? 0
  const activeUsers = dashboardKpis?.activeUsers ?? 0
  const highPriorityLeads = dashboardKpis?.highPriorityLeads ?? 0
  const activeDeals = dashboardKpis?.activeDeals ?? 0
  const pipelineValue = dashboardKpis?.pipelineValue ?? 0

  // Role-specific filtered metrics
  const isAgent = user?.role === UserRole.AGENT
  const isTeamLead = (user?.role as any) === UserRole.TEAM_LEAD

  const myDealsValue = pipelineValue
  const myEstCommission = Math.round(myDealsValue * 0.03 * 0.7) // 3% commission, 70% agent split
  const avgSpeed = dashboardKpis?.avgSpeedSeconds || 24

  // Animated KPI metrics (Ease-out Quartic curve for high initial speed and gradual slowdown)
  const animatedTotalContacts = useCountUp({ end: totalContacts, duration: 1200 })
  const animatedActiveUsers = useCountUp({ end: activeUsers, duration: 1000 })
  const animatedHighPriorityLeads = useCountUp({ end: highPriorityLeads, duration: 1000 })
  const animatedActiveDeals = useCountUp({ end: activeDeals, duration: 1100 })
  const animatedPipelineValue = useCountUp({ end: pipelineValue, duration: 1600 })
  const animatedEstCommission = useCountUp({ end: myEstCommission, duration: 1500 })
  const animatedAvgSpeed = useCountUp({ end: avgSpeed, duration: 900 })
  const animatedForecast = useCountUp({ end: Math.round(pipelineValue * 0.65), duration: 1500 })

  if (kpisLoading) {
    return (
      <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-6 transition-colors duration-200">
        <Skeleton className="h-10 w-64 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          <Skeleton className="h-80 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26]" />
        </div>
      </div>
    )
  }

  return (
    <div className="-m-4 sm:-m-6 min-h-[calc(100vh-4rem)] p-4 sm:p-6 pb-20 md:pb-8 bg-[#F5F7F4] dark:bg-[#1E282D] space-y-8 transition-colors duration-200">
      {/* 1. Header & KPI Cards Section */}
      <section className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
            {user ? ROLE_LABELS[user.role] : 'Brokerage'} Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#4A5D54] dark:text-[#A0B2A6]">
            {isAgent
              ? `Performance dashboard for ${user?.firstName} ${user?.lastName}`
              : isTeamLead
                ? 'Team performance and lead execution'
                : 'Real-time performance metrics and lead management overview'}
          </p>
        </div>

        {/* Role-Tailored KPI Cards */}
        <div className="grid grid-cols-1 gap-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-3">
          {isAgent ? (
            /* Agent Perspective */
            <>
              <KpiCard
                title="My Assigned Contacts"
                value={animatedTotalContacts.toLocaleString()}
                icon="group"
                trend={{ value: 8.5, isPositive: true }}
                subtitle="vs last month"
              />
              <KpiCard
                title="My Active Deals"
                value={`${animatedActiveDeals} Deals`}
                icon="work"
                trend={{ value: 15.0, isPositive: true }}
                subtitle="pipeline progress"
              />
              <KpiCard
                title="Est. Commission Split"
                value={`$${(animatedEstCommission / 1000).toFixed(1)}k`}
                icon="payments"
                trend={{ value: 12.0, isPositive: true }}
                subtitle="projected revenue"
              />
              <KpiCard
                title="Hot Leads (80+ Score)"
                value={animatedHighPriorityLeads}
                icon="bolt"
                trend={{ value: 20.0, isPositive: true }}
                subtitle="high conversion"
              />
            </>
          ) : isTeamLead ? (
            /* Team Lead Perspective */
            <>
              <KpiCard
                title="Team CRM Contacts"
                value={animatedTotalContacts.toLocaleString()}
                icon="group"
                trend={{ value: 10.2, isPositive: true }}
                subtitle="team coverage"
              />
              <KpiCard
                title="High-Intent Inquiries"
                value={animatedHighPriorityLeads}
                icon="bolt"
                trend={{ value: 18.2, isPositive: true }}
                subtitle="urgent follow-ups"
              />
              <KpiCard
                title="Active Team Pipeline"
                value={`$${(animatedPipelineValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}
                icon="work"
                trend={{ value: 14.5, isPositive: true }}
                subtitle="open transaction volume"
              />
              <KpiCard
                title="Avg. Speed-to-Lead"
                value={`${animatedAvgSpeed}s`}
                icon="schedule"
                trend={{ value: -12.0, isPositive: true }}
                subtitle="first response time"
              />
            </>
          ) : (
            /* Brokerage Owner / Super Admin Perspective */
            <>
              <KpiCard
                title="Total Contacts"
                value={animatedTotalContacts.toLocaleString()}
                icon="group"
                trend={{ value: 12.4, isPositive: true }}
                subtitle="all broker stages"
              />
              <KpiCard
                title="Pipeline Volume"
                value={`$${(animatedPipelineValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}
                icon="payments"
                trend={{ value: 16.8, isPositive: true }}
                subtitle="under contract"
              />
              <KpiCard
                title="Forecast"
                value={`$${(animatedForecast / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`}
                icon="trending_up"
                trend={{ value: 9.4, isPositive: true }}
                subtitle="expected closing"
              />
              <KpiCard
                title="Team Seats"
                value={`${animatedActiveUsers} Seats`}
                icon="apartment"
                trend={{ value: 4.5, isPositive: true }}
                subtitle="licensed agents"
              />
            </>
          )}
        </div>
      </section>

      {/* 2. Lead Ingestion Breakdown Card */}
      <ParallaxRevealSection delay={50}>
        <LeadSourceChart />
      </ParallaxRevealSection>

      {/* 3. Leads Volume by Month Card */}
      <ParallaxRevealSection delay={100}>
        <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] shadow-md shadow-black/10 bg-white dark:bg-[#254238] transition-colors duration-200">
          <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="show_chart" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                Leads Volume by Month
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <LeadsOverTimeChart />
          </CardContent>
        </Card>
      </ParallaxRevealSection>

      {/* 4. Platform Activity Stream */}
      <ParallaxRevealSection delay={150}>
        <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] shadow-md shadow-black/10 bg-white dark:bg-[#254238] transition-colors duration-200">
          <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="history" size={18} className="text-[#618764] dark:text-[#9CB080]" />
                {isAgent ? 'Contact & Lead Activity' : 'Platform Activity'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ActivityFeed />
          </CardContent>
        </Card>
      </ParallaxRevealSection>
    </div>
  )
}


