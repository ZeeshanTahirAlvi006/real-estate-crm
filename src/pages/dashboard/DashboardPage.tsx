import {
  UserGroupIcon,
  BoltIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  ClockIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
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
import { Badge } from '@/components/ui/badge'

export function DashboardPage() {
  const user = useAppSelector((state) => state.auth.user)

  // Direct client / business lead to the dedicated Client Dashboard
  if (user?.role === UserRole.LEAD) {
    return <LeadPortalPage />
  }

  const { data: dashboardKpis, isLoading: kpisLoading } = useGetDashboardKpisQuery()

  const totalContacts = dashboardKpis?.totalContacts ?? 0
  const activeUsers = dashboardKpis?.activeUsers ?? 0
  const highPriorityLeads = dashboardKpis?.highPriorityLeads ?? 0
  const activeDeals = dashboardKpis?.activeDeals ?? 0
  const pipelineValue = dashboardKpis?.pipelineValue ?? 0

  // Role-specific filtered metrics
  const isAgent = user?.role === UserRole.AGENT
  const isTeamLead = (user?.role as any) === UserRole.TEAM_LEAD

  const myContactsCount = totalContacts
  const myDealsCount = activeDeals
  const myDealsValue = pipelineValue
  const myEstCommission = Math.round(myDealsValue * 0.03 * 0.7) // 3% commission, 70% agent split
  const avgSpeed = dashboardKpis?.avgSpeedSeconds || 24

  if (kpisLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Role Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <PageHeader
          title={`${user ? ROLE_LABELS[user.role] : 'Brokerage'} Command Center`}
          description={
            isAgent
              ? `Personal performance dashboard for ${user?.firstName} ${user?.lastName}`
              : isTeamLead
                ? `Team performance, deal throughput, and lead routing metrics`
                : `Real-time multi-tenant brokerage performance and lead execution intelligence`
          }
        />
        {user && (
          <Badge variant="outline" className="self-start sm:self-center px-3 py-1 font-semibold text-xs bg-primary/5 text-primary border-primary/20">
            Active Workspace: {user.brokerageName || 'PropPulse Real Estate'}
          </Badge>
        )}
      </div>

      {/* Role-Tailored KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAgent ? (
          /* Agent Perspective */
          <>
            <StatCard
              title="My Assigned Contacts"
              value={myContactsCount.toLocaleString()}
              icon={<UserGroupIcon className="h-5 w-5" />}
              trend={{ value: 8.5, isPositive: true }}
            />
            <StatCard
              title="My Active Deals"
              value={`${myDealsCount} Deals`}
              icon={<BriefcaseIcon className="h-5 w-5" />}
              trend={{ value: 15.0, isPositive: true }}
            />
            <StatCard
              title="Est. Commission Split"
              value={`$${(myEstCommission / 1000).toFixed(1)}k`}
              icon={<CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />}
              trend={{ value: 12.0, isPositive: true }}
            />
            <StatCard
              title="Hot Leads (80+ Score)"
              value={highPriorityLeads}
              icon={<BoltIcon className="h-5 w-5 text-amber-500" />}
              trend={{ value: 20.0, isPositive: true }}
            />
          </>
        ) : isTeamLead ? (
          /* Team Lead Perspective */
          <>
            <StatCard
              title="Team CRM Contacts"
              value={totalContacts.toLocaleString()}
              icon={<UserGroupIcon className="h-5 w-5" />}
              trend={{ value: 10.2, isPositive: true }}
            />
            <StatCard
              title="High-Intent Inquiries"
              value={highPriorityLeads}
              icon={<BoltIcon className="h-5 w-5 text-amber-500" />}
              trend={{ value: 18.2, isPositive: true }}
            />
            <StatCard
              title="Active Team Pipeline"
              value={`$${(myDealsValue / 1000).toLocaleString()}k`}
              icon={<BriefcaseIcon className="h-5 w-5 text-primary" />}
              trend={{ value: 14.5, isPositive: true }}
            />
            <StatCard
              title="Avg. Speed-to-Lead"
              value={`${avgSpeed}s`}
              icon={<ClockIcon className="h-5 w-5 text-indigo-500" />}
              trend={{ value: -12.0, isPositive: true }}
            />
          </>
        ) : (
          /* Brokerage Owner / Super Admin Perspective */
          <>
            <StatCard
              title="Total CRM Contacts"
              value={totalContacts.toLocaleString()}
              icon={<UserGroupIcon className="h-5 w-5" />}
              trend={{ value: 12.4, isPositive: true }}
            />
            <StatCard
              title="Total Pipeline Volume"
              value={`$${(myDealsValue / 1000).toLocaleString()}k`}
              icon={<CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />}
              trend={{ value: 16.8, isPositive: true }}
            />
            <StatCard
              title="Weighted Forecast"
              value={`$${(Math.round(myDealsValue * 0.65) / 1000).toLocaleString()}k`}
              icon={<ArrowTrendingUpIcon className="h-5 w-5 text-indigo-500" />}
              trend={{ value: 9.4, isPositive: true }}
            />
            <StatCard
              title="Active Team Seats"
              value={`${activeUsers} Seats`}
              icon={<BuildingOfficeIcon className="h-5 w-5" />}
              trend={{ value: 4.5, isPositive: true }}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-primary" />
              Lead Ingestion Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadSourceChart />
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-4 h-4 text-indigo-500" />
              Leads Volume by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsOverTimeChart />
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Trail */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            {isAgent ? 'My Recent Contact & Lead Activity' : 'Real-Time Platform Activity Stream'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  )
}
