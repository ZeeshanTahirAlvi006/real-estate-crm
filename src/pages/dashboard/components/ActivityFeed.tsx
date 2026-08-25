import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const activities = [
  { id: 1, user: 'Sarah Wilson', action: 'moved deal to', target: 'Showing', emoji: '📋', time: '5 min ago', color: 'bg-amber-500/15' },
  { id: 2, user: 'System', action: 'new lead from', target: 'Zillow', emoji: '🔵', time: '12 min ago', color: 'bg-blue-500/15' },
  { id: 3, user: 'Mike Johnson', action: 'logged a call with', target: 'Robert Martinez', emoji: '📞', time: '25 min ago', color: 'bg-emerald-500/15' },
  { id: 4, user: 'Lisa Chen', action: 'sent email to', target: 'Maria Garcia', emoji: '✉️', time: '1h ago', color: 'bg-purple-500/15' },
  { id: 5, user: 'Tom Brady', action: 'closed deal at', target: '4100 Pine St — $475K', emoji: '🎉', time: '2h ago', color: 'bg-green-500/15' },
  { id: 6, user: 'System', action: 'detected', target: '8 duplicate records', emoji: '⚠️', time: '3h ago', color: 'bg-amber-500/15' },
  { id: 7, user: 'Sarah Wilson', action: 'added note to', target: 'James Thompson', emoji: '📝', time: '4h ago', color: 'bg-indigo-500/15' },
  { id: 8, user: 'System', action: 'new lead from', target: 'Meta Ads', emoji: '🔵', time: '5h ago', color: 'bg-blue-500/15' },
]

export function ActivityFeed() {
  return (
    <ScrollArea className="h-64">
      <div className="space-y-1">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0">
              <AvatarFallback className={`${a.color} text-xs`}>{a.emoji}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{a.user}</span>{' '}
                <span className="text-muted-foreground">{a.action}</span>{' '}
                <span className="font-medium">{a.target}</span>
              </p>
              <p className="text-xs text-muted-foreground/60">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
