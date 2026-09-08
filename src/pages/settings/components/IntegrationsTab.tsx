import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetIntegrationsQuery } from '@/store/api/settingsApi'

export function IntegrationsTab() {
  const { data: integrations, isLoading } = useGetIntegrationsQuery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {integrations?.map(int => (
        <Card key={int.id} className="bg-white dark:bg-[#2B5748] border-[#D8E2D6] dark:border-[#618764] shadow-xs">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] flex items-center justify-center">
                  <MaterialIcon name="extension" size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#273338] dark:text-white">{int.name}</h4>
                  <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] uppercase font-mono">{int.type}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] rounded px-2 py-0.5 font-bold ${
                  int.isConnected
                    ? 'bg-[#9CB080]/20 text-[#273338] dark:text-[#9CB080] border-[#9CB080]/40'
                    : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
                }`}
              >
                {int.isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                {int.isConnected ? 'Syncing active' : 'Setup needed'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info(`Configured credentials for ${int.name}`)}
                className="text-xs h-7 border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] cursor-pointer"
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
