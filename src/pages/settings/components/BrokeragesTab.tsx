import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetBrokeragesQuery } from '@/store/api/brokeragesApi'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

export function BrokeragesTab() {
  const { data: brokerages, isLoading } = useGetBrokeragesQuery()

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <BuildingOfficeIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Multi-Tenant Brokerages (Super Admin Only)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage isolated real estate brokerage tenant databases and subscriptions
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Brokerage Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Subscription Plan</TableHead>
                <TableHead className="text-center">Active Seats</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokerages?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold text-xs">
                    {b.name}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {b.subdomain ? `${b.subdomain}.proppulse.io` : 'default'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {b.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs font-medium">
                    {b.memberCount ?? 0} seats
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.timezone}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={b.isActive ? 'default' : 'secondary'}
                      className={`text-[10px] ${b.isActive ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''}`}
                    >
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
