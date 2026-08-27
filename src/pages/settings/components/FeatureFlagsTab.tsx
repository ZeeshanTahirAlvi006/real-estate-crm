import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetFeatureFlagsQuery, useToggleFeatureFlagMutation } from '@/store/api/featureFlagsApi'
import { BoltIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

export function FeatureFlagsTab() {
  const { data: flags, isLoading } = useGetFeatureFlagsQuery()
  const [toggleFlag, { isLoading: toggling }] = useToggleFeatureFlagMutation()

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

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <BoltIcon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">System Feature Flags & Kill-Switches (Super Admin Only)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Toggle core subsystems. Disabling immediately blocks endpoints with 503 Maintenance and updates Redis cache in 0ms.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags?.map((flag) => (
            <div
              key={flag.key}
              className={`flex items-start justify-between p-4 rounded-xl border transition-all ${
                flag.isEnabled
                  ? 'border-border bg-card'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{flag.name}</span>
                  <Badge
                    variant={flag.isEnabled ? 'default' : 'secondary'}
                    className={`text-[9px] px-1.5 py-0 ${
                      flag.isEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                    }`}
                  >
                    {flag.isEnabled ? 'Active' : 'Maintenance (503)'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{flag.description}</p>
                <div className="text-[10px] font-mono text-muted-foreground/70">
                  Key: {flag.key}
                </div>
              </div>
              <Switch
                checked={flag.isEnabled}
                onCheckedChange={() => handleToggle(flag.key, flag.isEnabled)}
                disabled={toggling}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
