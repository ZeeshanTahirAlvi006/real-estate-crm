import type { Notification } from '@/types'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/store/api/settingsApi'
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface NotificationDropdownProps {
  notifications: Notification[]
  onClose: () => void
}

const typeColors: Record<string, string> = {
  new_lead: 'bg-blue-500/15 text-blue-400',
  stage_change: 'bg-emerald-500/15 text-emerald-400',
  data_health: 'bg-amber-500/15 text-amber-400',
  team_activity: 'bg-purple-500/15 text-purple-400',
  system: 'bg-muted text-muted-foreground',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationDropdown({ notifications, onClose }: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'unread' | 'all'>('unread')
  const [markAsRead] = useMarkNotificationReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsReadMutation()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const sourceList = filter === 'unread' ? unreadNotifications : notifications
  const displayedNotifications = sourceList.slice(0, 3)

  const handleNotificationClick = async (n: Notification) => {
    if (!n.isRead) {
      await markAsRead(n.id)
    }
    if (n.linkTo) {
      navigate(n.linkTo)
      onClose()
    }
  }

  const handleMarkSingleRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await markAsRead(id)
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 z-50 w-88 rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-popover">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-semibold">
              {unreadNotifications.length}
            </Badge>
          )}
        </div>

        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-7 px-2 text-xs font-medium text-primary hover:text-primary/80"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-border bg-muted/30 px-3 py-1.5 gap-2">
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            filter === 'unread'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Unread ({unreadNotifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            filter === 'all'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          All ({notifications.length})
        </button>
      </div>

      {/* Notification List (strictly 3 displayed) */}
      <div className="max-h-[290px] overflow-y-auto divide-y divide-border/30">
        {displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filter === 'unread'
                ? 'No unread notifications left in queue'
                : 'Your notification list is empty'}
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNotificationClick(n)
                }
              }}
              className={cn(
                'group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 cursor-pointer',
                !n.isRead && 'bg-primary/[0.04]'
              )}
            >
              {/* Type Icon */}
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold shadow-xs',
                  typeColors[n.type] || typeColors.system
                )}
              >
                {n.type === 'new_lead' && '🔵'}
                {n.type === 'stage_change' && '📋'}
                {n.type === 'data_health' && '⚠️'}
                {n.type === 'team_activity' && '👥'}
                {n.type === 'system' && '⚙️'}
              </div>

              {/* Text Body */}
              <div className="min-w-0 flex-1 overflow-hidden pr-7">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                  {!n.isRead && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground mt-0.5 leading-snug">
                  {n.message}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
              </div>

              {/* Action */}
              <div className="absolute right-3 top-3.5 flex items-center">
                {!n.isRead ? (
                  <button
                    type="button"
                    title="Mark as read"
                    onClick={(e) => handleMarkSingleRead(e, n.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground focus:outline-hidden transition-all shadow-xs"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
                    Read
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer queue status if more than 3 items exist */}
      {sourceList.length > 3 && (
        <div className="border-t border-border bg-muted/20 px-4 py-2 text-center">
          <p className="text-[11px] text-muted-foreground font-medium">
            +{sourceList.length - 3} more {filter === 'unread' ? 'unread ' : ''}waiting in queue
          </p>
        </div>
      )}
    </div>
  )
}
