import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetAuditLogsQuery } from '@/store/api/auditApi'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'

export function AuditLogsTab() {
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_settings_audit_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const { data, isLoading } = useGetAuditLogsQuery({
    resource: resourceFilter !== 'all' ? resourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const logs = data?.logs || []

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_settings_audit_view', newView)
  }

  const columns: TableColumn<(typeof logs)[0]>[] = [
    {
      id: 'timestamp',
      header: 'Timestamp',
      cell: (log) => (
        <span className="text-xs text-[#75887E] dark:text-[#A0B2A6] font-mono">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (log) => (
        <span className="font-mono text-xs font-bold text-[#2B5748] dark:text-[#9CB080]">
          {log.action}
        </span>
      ),
    },
    {
      id: 'resource',
      header: 'Resource',
      cell: (log) => (
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-mono border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#E2ECE4]"
        >
          {log.resource}
        </Badge>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: (log) => (
        <div className="text-xs">
          <span className="font-medium text-[#273338] dark:text-white">
            {log.userEmail || 'System'}
          </span>
          {log.userRole && (
            <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] ml-1">
              ({log.userRole})
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'ipAddress',
      header: 'IP Address',
      cell: (log) => (
        <span className="text-xs font-mono text-[#75887E] dark:text-[#A0B2A6]">
          {log.ipAddress}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'right',
      cell: (log) => (
        <Badge
          variant="outline"
          className={`text-[10px] rounded px-2 py-0.5 font-bold ${
            log.status === 'success'
              ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
              : 'bg-red-500/15 text-red-600 border-red-500/30'
          }`}
        >
          {log.status}
        </Badge>
      ),
    },
  ]

  return (
    <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="history" size={20} />
          </div>
          <div>
            <CardTitle className="text-base text-[#273338] dark:text-white">Audit Logs</CardTitle>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Immutable security trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={resourceFilter} onValueChange={(val) => val && setResourceFilter(val)}>
            <SelectTrigger className="h-8 text-xs w-32 bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="contacts">Contacts</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="feature_flags">Feature Flags</SelectItem>
              <SelectItem value="brokerages">Brokerages</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="h-8 text-xs w-28 bg-[#F5F7F4] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
            </SelectContent>
          </Select>

          {/* Table vs Grid (2 per row) View Switcher */}
          <TableGridToggleButton
            view={view}
            onViewChange={handleViewChange}
            storageKey="crm_settings_audit_view"
            tableTitle="Table View"
            gridTitle="Grid View (2 per row)"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <TableGridToggle<(typeof logs)[0]>
          data={logs}
          isLoading={isLoading}
          view={view}
          onViewChange={handleViewChange}
          storageKey="crm_settings_audit_view"
          hideToggle={true}
          emptyIcon="history"
          emptyTitle="No audit records found"
          emptyDescription="Security and modification events will be logged here automatically."
          columns={columns}
          renderCard={(log) => (
            <div className="h-full flex flex-col justify-between p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4]/60 dark:bg-[#202B2F] shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-[#2B5748] dark:text-[#9CB080] block">
                    {log.action}
                  </span>
                  <p className="text-xs font-medium text-[#273338] dark:text-white mt-0.5">
                    {log.userEmail || 'System'}
                    {log.userRole && (
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] ml-1">
                        ({log.userRole})
                      </span>
                    )}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] rounded px-2 py-0.5 font-bold ${
                    log.status === 'success'
                      ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                      : 'bg-red-500/15 text-red-600 border-red-500/30'
                  }`}
                >
                  {log.status}
                </Badge>
              </div>

              <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/30 flex items-center justify-between text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-mono border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#E2ECE4]"
                >
                  {log.resource}
                </Badge>
                <span className="font-mono">{log.ipAddress}</span>
              </div>

              <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-mono">
                {new Date(log.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        />
      </CardContent>
    </Card>
  )
}
