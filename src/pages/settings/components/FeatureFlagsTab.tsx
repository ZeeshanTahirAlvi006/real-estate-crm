import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetFeatureFlagsQuery, useToggleFeatureFlagMutation, type FeatureFlagItem } from '@/store/api/featureFlagsApi'
import { toast } from 'sonner'
import { TableGridToggle, TableGridToggleButton, type TableColumn, type TableGridViewMode } from '@/components/shared/TableGridToggle'

export function FeatureFlagsTab() {
  const { data: flags, isLoading } = useGetFeatureFlagsQuery()
  const [toggleFlag, { isLoading: toggling }] = useToggleFeatureFlagMutation()
  const [view, setView] = useState<TableGridViewMode>(() => {
    const saved = localStorage.getItem('crm_settings_feature_flags_view')
    return saved === 'grid' ? 'grid' : 'table'
  })

  const handleViewChange = (newView: TableGridViewMode) => {
    setView(newView)
    localStorage.setItem('crm_settings_feature_flags_view', newView)
  }

  const handleToggle = async (key: string, currentStatus: boolean) => {
    try {
      await toggleFlag({
        key,
        isEnabled: !currentStatus,
        disabledReason: currentStatus ? 'Disabled by Super Admin for scheduled maintenance' : undefined,
      }).unwrap()
      toast.success(`Feature flag [${key}] ${!currentStatus ? 'enabled' : 'disabled (kill-switch activated)'}`)
    } catch {
      toast.error('Failed to toggle feature flag')
    }
  }

  const columns: TableColumn<FeatureFlagItem>[] = [
    {
      id: 'name',
      header: 'Feature Flag',
      className: '',
      cell: (flag) => (
        <div>
          <span className="text-xs font-bold text-[#273338] dark:text-white block">{flag.name}</span>
          <span className="text-[10px] font-mono text-[#75887E] dark:text-[#A0B2A6]">
            Key: {flag.key}
          </span>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (flag) => (
        <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">{flag.description}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (flag) => (
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 font-bold ${
            flag.isEnabled
              ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
              : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
          }`}
        >
          {flag.isEnabled ? 'Active' : 'Maintenance'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Kill Switch',
      align: 'right',
      cell: (flag) => (
        <div className="flex justify-end">
          <Switch
            checked={flag.isEnabled}
            onCheckedChange={() => handleToggle(flag.key, flag.isEnabled)}
            disabled={toggling}
          />
        </div>
      ),
    },
  ]

  const renderFlagCard = (flag: FeatureFlagItem) => (
    <div
      key={flag.key}
      className={`h-full flex items-start justify-between p-4 rounded-xl border transition-all ${
        flag.isEnabled
          ? 'border-[#D8E2D6] dark:border-[#618764] bg-[#F5F7F4] dark:bg-[#202B2F]'
          : 'border-[#618764]/60 bg-[#EDF2EB] dark:bg-[#202B2F]/60'
      }`}
    >
      <div className="space-y-1 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#273338] dark:text-white">{flag.name}</span>
          <Badge
            variant="outline"
            className={`text-[9px] px-1.5 py-0 font-bold ${
              flag.isEnabled
                ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
            }`}
          >
            {flag.isEnabled ? 'Active' : 'Maintenance'}
          </Badge>
        </div>
        <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">{flag.description}</p>
        <div className="text-[10px] font-mono text-[#75887E] dark:text-[#A0B2A6]">
          Key: {flag.key}
        </div>
      </div>
      <Switch
        checked={flag.isEnabled}
        onCheckedChange={() => handleToggle(flag.key, flag.isEnabled)}
        disabled={toggling}
      />
    </div>
  )

  return (
    <Card className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
            <MaterialIcon name="toggle_on" size={20} />
          </div>
          <div>
            <CardTitle className="text-base text-[#273338] dark:text-white">Feature Flags</CardTitle>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
              Subsystem kill switches
            </p>
          </div>
        </div>

        <TableGridToggleButton
          view={view}
          onViewChange={handleViewChange}
          storageKey="crm_settings_feature_flags_view"
          tableTitle="Table View"
          gridTitle="Grid View (2 per row)"
        />
      </CardHeader>
      <CardContent className="pt-4">
        <TableGridToggle<FeatureFlagItem>
          data={flags || []}
          isLoading={isLoading}
          view={view}
          onViewChange={handleViewChange}
          storageKey="crm_settings_feature_flags_view"
          hideToggle={true}
          emptyIcon="toggle_off"
          emptyTitle="No Feature Flags"
          emptyDescription="Feature flags will be loaded here."
          columns={columns}
          renderCard={renderFlagCard}
        />
      </CardContent>
    </Card>
  )
}
