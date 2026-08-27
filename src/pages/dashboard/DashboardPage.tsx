import { UserGroupIcon, ShieldCheckIcon, BoltIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { LeadSourceChart } from './components/LeadSourceChart'
import { LeadsOverTimeChart } from './components/LeadsOverTimeChart'
import { ActivityFeed } from './components/ActivityFeed'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useGetUsersQuery } from '@/store/api/usersApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPage() {
  const { data: contactsData, isLoading: contactsLoading } = useGetContactsQuery({ limit: 50 })
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery()

  const totalContacts = contactsData?.total ?? 0
  const activeUsers = usersData?.users?.filter((u) => u.isActive).length ?? 0
  const highPriorityLeads = contactsData?.contacts?.filter((c) => c.leadScore >= 80).length ?? 0

  if (contactsLoading || usersLoading) {
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
      <PageHeader
        title="Command Dashboard"
        description="Real-time multi-tenant brokerage performance and lead execution intelligence"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total CRM Contacts"
          value={totalContacts.toLocaleString()}
          icon={<UserGroupIcon className="h-5 w-5" />}
          trend={{ value: 12.4, isPositive: true }}
        />
        <StatCard
          title="High-Intent Leads (80+ Score)"
          value={highPriorityLeads}
          icon={<BoltIcon className="h-5 w-5" />}
          trend={{ value: 18.2, isPositive: true }}
        />
        <StatCard
          title="Active Team Seats"
          value={activeUsers}
          icon={<BuildingOfficeIcon className="h-5 w-5" />}
          trend={{ value: 4.5, isPositive: true }}
        />
        <StatCard
          title="System Health & Security"
          value="100%"
          icon={<ShieldCheckIcon className="h-5 w-5" />}
          trend={{ value: 0.0, isPositive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lead Ingestion Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadSourceChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Leads Volume by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsOverTimeChart />
          </CardContent>
        </Card>
      </div>

      {/* Real-time Activity Trail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Real-Time Platform Activity Stream</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  )
}
