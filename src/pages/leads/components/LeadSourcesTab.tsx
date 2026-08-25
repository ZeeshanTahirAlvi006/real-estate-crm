import { toast } from 'sonner'
import { useGetLeadSourcesQuery, useToggleLeadSourceMutation } from '@/store/api/leadsApi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { LEAD_SOURCE_DEFINITIONS } from '@/constants/leadSources'

export function LeadSourcesTab() {
  const { data: sources, isLoading } = useGetLeadSourcesQuery()
  const [toggleSource] = useToggleLeadSourceMutation()

  const handleToggle = async (id: string, name: string, current: boolean) => {
    try {
      await toggleSource(id).unwrap()
      toast.success(`${name} ${current ? 'disabled' : 'enabled'}`)
    } catch { toast.error('Failed to update source') }
  }

  if (isLoading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sources?.map(s => {
        const def = LEAD_SOURCE_DEFINITIONS.find(d => d.name === s.name)
        return (
          <Card key={s.id} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1" style={{ backgroundColor: def?.color || '#6b7280' }} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm" style={{ backgroundColor: def?.color || '#6b7280' }}>
                    {def?.icon || s.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.type}</p>
                  </div>
                </div>
                <Switch checked={s.isActive} onCheckedChange={() => handleToggle(s.id, s.name, s.isActive)} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{s.leadCount}</p>
                  <p className="text-xs text-muted-foreground">total leads</p>
                </div>
                <Badge variant={s.isActive ? 'default' : 'secondary'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
