import { toast } from 'sonner'
import { useGetWebhooksQuery } from '@/store/api/leadsApi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardIcon } from '@heroicons/react/24/outline'

export function WebhooksTab() {
  const { data: webhooks, isLoading } = useGetWebhooksQuery()

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>

  return (
    <div className="space-y-4">
      {webhooks?.map(w => (
        <Card key={w.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={w.isActive ? 'default' : 'secondary'}>{w.isActive ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Last triggered: {w.lastTriggeredAt ? new Date(w.lastTriggeredAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{w.url}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(w.url)}>
                    <ClipboardIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-1 flex-wrap">
                  {w.events.map(e => <Badge key={e} variant="outline" className="text-xs">{e}</Badge>)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
