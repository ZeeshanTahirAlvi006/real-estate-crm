import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetBrokeragesQuery, type BrokerageItem as Brokerage } from '@/store/api/brokeragesApi'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'

export function BrokeragesTab() {
  const { data: brokerages = [], isLoading } = useGetBrokeragesQuery()
  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_settings_brokerages_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_settings_brokerages_view', newView)
  }

  const columns: TableColumn<Brokerage>[] = [
    {
      id: 'name',
      header: 'Brokerage Name',
      cell: (b) => (
        <div className="flex items-center gap-2">
          <MaterialIcon name="business" size={16} className="text-[#618764] dark:text-[#9CB080]" />
          <span className="font-semibold text-xs text-[#273338] dark:text-white">
            {b.name}
          </span>
        </div>
      ),
    },
    {
      id: 'subdomain',
      header: 'Subdomain',
      cell: (b) => (
        <span className="text-xs font-mono text-[#75887E] dark:text-[#A0B2A6]">
          {b.subdomain ? `${b.subdomain}.proppulse.io` : 'default'}
        </span>
      ),
    },
    {
      id: 'plan',
      header: 'Subscription',
      cell: (b) => (
        <Badge variant="outline" className="text-[10px] uppercase font-mono border-[#D8E2D6] dark:border-[#618764] text-[#4A5D54] dark:text-[#E2ECE4]">
          {b.plan}
        </Badge>
      ),
    },
    {
      id: 'seats',
      header: 'Seats',
      align: 'center',
      cell: (b) => (
        <span className="text-xs font-medium text-[#273338] dark:text-white">
          {b.memberCount ?? 0} seats
        </span>
      ),
    },
    {
      id: 'timezone',
      header: 'Timezone',
      cell: (b) => (
        <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
          {b.timezone}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'right',
      cell: (b) => (
        <Badge
          variant="outline"
          className={`text-[10px] rounded px-2 py-0.5 font-bold ${
            b.isActive
              ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
              : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
          }`}
        >
          {b.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ]

  return (
    <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="domain" size={20} />
          </div>
          <div>
            <CardTitle className="text-base text-[#273338] dark:text-white">Tenant Brokerages</CardTitle>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Isolated tenant databases
            </p>
          </div>
        </div>

        {/* View Switcher Toggle */}
        <TableGridToggleButton
          view={view}
          onViewChange={handleViewChange}
          tableTitle="Table View"
          gridTitle="Grid View (2 per row)"
        />
      </CardHeader>

      <CardContent className="pt-4">
        <TableGridToggle<Brokerage>
          data={brokerages}
          isLoading={isLoading}
          view={view}
          onViewChange={handleViewChange}
          storageKey="crm_settings_brokerages_view"
          hideToggle={true}
          emptyIcon="domain"
          emptyTitle="No brokerages found"
          emptyDescription="Tenant brokerages will appear here once registered."
          columns={columns}
          renderCard={(b) => (
            <div className="h-full flex flex-col justify-between p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4]/60 dark:bg-[#202B2F] shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080]">
                    <MaterialIcon name="domain" size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#273338] dark:text-white">{b.name}</h4>
                    <span className="text-xs font-mono text-[#75887E] dark:text-[#A0B2A6]">
                      {b.subdomain ? `${b.subdomain}.proppulse.io` : 'default'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[10px] rounded px-2 py-0.5 font-bold ${
                    b.isActive
                      ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                      : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
                  }`}
                >
                  {b.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/30 flex items-center justify-between text-xs text-[#75887E] dark:text-[#A0B2A6]">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono border-[#D8E2D6] dark:border-[#618764]">
                    {b.plan}
                  </Badge>
                  <span>{b.memberCount ?? 0} seats</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <MaterialIcon name="schedule" size={14} />
                  <span>{b.timezone}</span>
                </div>
              </div>
            </div>
          )}
        />
      </CardContent>
    </Card>
  )
}
