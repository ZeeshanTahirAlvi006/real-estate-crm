import type { ActivityItem } from '@/types'
import { cn } from '@/lib/utils'

const typeConfig: Record<string, { emoji: string; color: string }> = {
  call: { emoji: '📞', color: 'bg-emerald-500/15' },
  email: { emoji: '✉️', color: 'bg-blue-500/15' },
  sms: { emoji: '💬', color: 'bg-purple-500/15' },
  note: { emoji: '📝', color: 'bg-indigo-500/15' },
  stage_change: { emoji: '📋', color: 'bg-amber-500/15' },
  whatsapp: { emoji: '💚', color: 'bg-green-500/15' },
  meeting: { emoji: '🤝', color: 'bg-cyan-500/15' },
  system: { emoji: '⚙️', color: 'bg-muted' },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ActivityTimelineProps {
  activities: ActivityItem[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

      {activities.map((a, i) => {
        const cfg = typeConfig[a.type] || typeConfig.system
        return (
          <div key={a.id} className={cn('relative flex gap-4 py-3', i === 0 && 'pt-0')}>
            <div className={cn('z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm', cfg.color)}>
              {cfg.emoji}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm">{a.description}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{a.createdBy}</span>
                <span>·</span>
                <span>{formatDate(a.createdAt)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
