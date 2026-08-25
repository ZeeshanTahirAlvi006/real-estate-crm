import { UserGroupIcon, RectangleStackIcon, ShieldCheckIcon, BoltIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { LeadSourceChart } from './components/LeadSourceChart'
import { LeadsOverTimeChart } from './components/LeadsOverTimeChart'
import { PipelineSummaryBar } from './components/PipelineSummaryBar'
import { ActivityFeed } from './components/ActivityFeed'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useGetPipelineQuery, useGetDealsQuery } from '@/store/api/pipelineApi'
import { useGetDataHealthQuery } from '@/store/api/dataHealthApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPage() {
  const { data: contactsData, isLoading: contactsLoading } = useGetContactsQuery({ limit: 1 })
  const { data: pipeline, isLoading: pipelineLoading } = useGetPipelineQuery()
  const { data: deals } = useGetDealsQuery()
  const { data: healthData, isLoading: healthLoading } = useGetDataHealthQuery()

  const totalContacts = contactsData?.total ?? 0
  const activeDeals = deals?.filter(d => d.stageId !== 'closed_won' && d.stageId !== 'closed_lost').length ?? 0
  const newLeadsThisWeek = 12 // mock static value

  if (contactsLoading || pipelineLoading || healthLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
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
      <PageHeader title="Dashboard" description="Overview of your real estate CRM performance" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contacts"
          value={totalContacts.toLocaleString()}
          icon={<UserGroupIcon className="h-5 w-5" />}
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="New Leads (This Week)"
          value={newLeadsThisWeek}
          icon={<BoltIcon className="h-5 w-5" />}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Active Deals"
          value={activeDeals}
          icon={<RectangleStackIcon className="h-5 w-5" />}
          trend={{ value: 3.1, isPositive: true }}
        />
        <StatCard
          title="Data Health Score"
          value={`${healthData?.overallScore ?? 0}%`}
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          trend={{ value: 2.4, isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadSourceChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsOverTimeChart />
          </CardContent>
        </Card>
      </div>

      {/* Pipeline + Activity Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineSummaryBar stages={pipeline?.stages ?? []} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
