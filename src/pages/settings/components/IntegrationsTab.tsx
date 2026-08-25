import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetIntegrationsQuery } from '@/store/api/settingsApi'

export function IntegrationsTab() {
  const { data: integrations, isLoading } = useGetIntegrationsQuery()

  if (isLoading) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations?.map(int => (
        <Card key={int.id}>
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold">{int.name}</h4>
                <p className="text-xs text-muted-foreground uppercase">{int.type}</p>
              </div>
              <Badge variant={int.isConnected ? 'default' : 'secondary'}>
                {int.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {int.isConnected ? 'Syncing active' : 'Setup required'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info(`Configured credentials for ${int.name}`)}
              >
                {int.isConnected ? 'Configure' : 'Connect'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
