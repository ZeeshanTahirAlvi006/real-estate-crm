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

  const safeList = Array.isArray(notifications) ? notifications : []
  const unreadNotifications = safeList.filter((n) => !n.isRead)
  const sourceList = filter === 'unread' ? unreadNotifications : safeList
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
      className="absolute right-0 top-12 z-50 w-88 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D8E2D6] dark:border-[#618764]/40 px-4 py-3 bg-white dark:bg-[#254238]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#273338] dark:text-white">Notifications</h3>
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-[11px] font-bold bg-red-500 text-white">
              {unreadNotifications.length}
            </Badge>
          )}
        </div>

        {unreadNotifications.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-7 px-2 text-xs font-bold text-[#2B5748] dark:text-[#9CB080] hover:text-[#273338] dark:hover:text-white cursor-pointer"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#1A2E26] px-3 py-1.5 gap-2">
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={cn(
            'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
            filter === 'unread'
              ? 'bg-white dark:bg-[#254238] text-[#273338] dark:text-white shadow-xs border border-[#D8E2D6] dark:border-[#618764]/50'
              : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
          )}
        >
          Unread ({unreadNotifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn(
            'px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer',
            filter === 'all'
              ? 'bg-white dark:bg-[#254238] text-[#273338] dark:text-white shadow-xs border border-[#D8E2D6] dark:border-[#618764]/50'
              : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
          )}
        >
          All ({notifications.length})
        </button>
      </div>

      {/* Notification List (strictly 3 displayed) */}
      <div className="max-h-72.5 overflow-y-auto divide-y divide-[#D8E2D6] dark:divide-[#618764]/30">
        {displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] mb-2">
              <CheckCircleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-[#273338] dark:text-white">
              {filter === 'unread' ? 'All caught up!' : 'No notifications'}
            </p>
            <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
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
                'group relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer',
                !n.isRead && 'bg-[#9CB080]/5'
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
                  <p className="truncate text-sm font-bold text-[#273338] dark:text-white">{n.title}</p>
                  {!n.isRead && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9CB080]" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5 leading-snug">
                  {n.message}
                </p>
                <p className="mt-1 text-[11px] text-[#75887E] dark:text-[#A0B2A6]/70">{timeAgo(n.createdAt)}</p>
              </div>

              {/* Action */}
              <div className="absolute right-3 top-3.5 flex items-center">
                {!n.isRead ? (
                  <button
                    type="button"
                    title="Mark as read"
                    onClick={(e) => handleMarkSingleRead(e, n.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#9CB080] hover:text-[#1A2E26] focus:outline-hidden transition-all shadow-xs cursor-pointer"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-[#75887E] dark:text-[#A0B2A6] bg-[#EDF2EB] dark:bg-[#1A2E26] px-1.5 py-0.5 rounded">
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
