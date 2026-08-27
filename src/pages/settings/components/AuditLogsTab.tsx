import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetAuditLogsQuery } from '@/store/api/auditApi'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

export function AuditLogsTab() {
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading } = useGetAuditLogsQuery({
    resource: resourceFilter !== 'all' ? resourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  const logs = data?.logs || []

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShieldCheckIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Immutable Security & System Audit Trail</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time audit log of all mutations, logins, and administrative actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={resourceFilter} onValueChange={(val) => val && setResourceFilter(val)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="contacts">Contacts</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="feature_flags">Feature Flags</SelectItem>
              <SelectItem value="brokerages">Brokerages</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor / Role</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-primary">{log.action}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {log.resource}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium">{log.userEmail || 'System'}</span>
                        {log.userRole && <span className="text-[10px] text-muted-foreground ml-1">({log.userRole})</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={log.status === 'success' ? 'default' : 'destructive'}
                        className={`text-[10px] ${log.status === 'success' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : ''}`}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
