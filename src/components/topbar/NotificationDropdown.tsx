import type { Notification } from '@/types'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useLazyGetPaginatedNotificationsQuery,
} from '@/store/api/settingsApi'
import { CheckIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'

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
  new_message: 'bg-teal-500/15 text-teal-400',
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
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'unread' | 'all'>('unread')

  const [markAsRead] = useMarkNotificationReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()
  const [fetchPaginated, { isFetching: isFetchingMore }] = useLazyGetPaginatedNotificationsQuery()

  // State for paginated "All" scroll list
  const safeList = Array.isArray(notifications) ? notifications : []
  const [allList, setAllList] = useState<Notification[]>(safeList)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)

  // Keep allList synced with initial incoming safeList without overriding appended pages
  useEffect(() => {
    setAllList((prev) => {
      const existingIds = new Set(prev.map((n) => n.id))
      const newItems = safeList.filter((n) => !existingIds.has(n.id))
      if (newItems.length > 0) {
        return [...newItems, ...prev]
      }
      // Also sync isRead flags from safeList
      return prev.map((item) => {
        const matching = safeList.find((s) => s.id === item.id)
        return matching ? { ...item, isRead: matching.isRead } : item
      })
    })
  }, [safeList])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const unreadNotifications = safeList.filter((n) => !n.isRead && !n.isDeleted)

  // In Unread view: strictly 3 items displayed. When one is deleted, next in queue immediately takes its place.
  // In All view: full scrollable list with dynamic scroll loader.
  const displayedNotifications =
    filter === 'unread'
      ? unreadNotifications.slice(0, 3)
      : allList.filter((n) => !n.isDeleted)

  // Infinite scroll handler for "All" section
  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      if (filter !== 'all' || !hasMore || isLoadingMore || isFetchingMore) return
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      // Trigger fetch when user is within 35px of bottom
      if (scrollHeight - scrollTop - clientHeight < 35) {
        setIsLoadingMore(true)
        try {
          const nextPage = currentPage + 1
          const res = await fetchPaginated({
            page: nextPage,
            limit: 10,
            status: 'all',
          }).unwrap()

          if (res && Array.isArray(res.notifications) && res.notifications.length > 0) {
            setAllList((prev) => {
              const existingIds = new Set(prev.map((n) => n.id))
              const uniqueNew = res.notifications.filter((n) => !existingIds.has(n.id))
              return [...prev, ...uniqueNew]
            })
            setCurrentPage(nextPage)
            setHasMore(res.hasMore)
          } else {
            setHasMore(false)
          }
        } catch (err) {
          console.error('Error fetching more notifications:', err)
          setHasMore(false)
        } finally {
          setIsLoadingMore(false)
        }
      }
    },
    [filter, hasMore, isLoadingMore, isFetchingMore, currentPage, fetchPaginated]
  )

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
    setAllList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    )
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setAllList((prev) => prev.map((item) => ({ ...item, isRead: true })))
  }

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await deleteNotification(id).unwrap()
      // Remove deleted item from local allList and insert replacement if provided
      setAllList((prev) => {
        const filtered = prev.filter((item) => item.id !== id)
        const replacement = res?.replacementNotification
        if (replacement && !filtered.some((item) => item.id === replacement.id)) {
          return [replacement, ...filtered]
        }
        return filtered
      })
    } catch (err) {
      console.error('Failed to soft delete notification:', err)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 z-50 w-92 sm:w-96 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 overflow-hidden"
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
          All ({allList.filter((n) => !n.isDeleted).length})
        </button>
      </div>

      {/* Notification List Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          'divide-y divide-[#D8E2D6] dark:divide-[#618764]/30',
          filter === 'all'
            ? 'max-h-84 overflow-y-scroll scrollbar-thin scrollbar-thumb-[#9CB080]/60 dark:scrollbar-thumb-[#618764]/70 scrollbar-track-transparent [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#9CB080]/60 hover:[&::-webkit-scrollbar-thumb]:bg-[#2B5748] dark:[&::-webkit-scrollbar-thumb]:bg-[#618764]/70 dark:hover:[&::-webkit-scrollbar-thumb]:bg-[#9CB080] [&::-webkit-scrollbar-track]:bg-[#EDF2EB]/40 dark:[&::-webkit-scrollbar-track]:bg-[#1A2E26]/40'
            : 'max-h-72.5 overflow-y-auto'
        )}
      >
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
                {n.type === 'new_message' && '💬'}
              </div>

              {/* Text Body */}
              <div className="min-w-0 flex-1 overflow-hidden pr-14">
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

              {/* Actions Area (Mark as Read + Delete) */}
              <div className="absolute right-3 top-3 flex items-center gap-1">
                {!n.isRead ? (
                  <button
                    type="button"
                    title="Mark as read"
                    onClick={(e) => handleMarkSingleRead(e, n.id)}
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#9CB080] hover:text-[#1A2E26] focus:outline-hidden transition-all shadow-xs cursor-pointer"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-[#75887E] dark:text-[#A0B2A6] bg-[#EDF2EB] dark:bg-[#1A2E26] px-1.5 py-0.5 rounded">
                    Read
                  </span>
                )}

                {/* Soft Delete Action Button */}
                <button
                  type="button"
                  title="Delete notification"
                  onClick={(e) => handleDeleteNotification(e, n.id)}
                  className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#75887E] dark:text-[#A0B2A6] hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400 focus:outline-hidden transition-all shadow-xs cursor-pointer opacity-70 group-hover:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Scroll Loading Indicator for "All" tab */}
        {filter === 'all' && (isLoadingMore || isFetchingMore) && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6] bg-[#EDF2EB]/40 dark:bg-[#1A2E26]/40">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#9CB080] border-t-transparent" />
            <span>Loading more notifications...</span>
          </div>
        )}

        {/* All Loaded completion label for "All" tab */}
        {filter === 'all' && !hasMore && displayedNotifications.length > 5 && (
          <div className="py-2.5 text-center text-[11px] text-[#75887E] dark:text-[#A0B2A6]/70 border-t border-[#D8E2D6]/40 dark:border-[#618764]/20 bg-[#EDF2EB]/20 dark:bg-[#1A2E26]/20">
            All caught up • End of notifications
          </div>
        )}
      </div>

      {/* Footer queue status if more than 3 unread items exist */}
      {filter === 'unread' && unreadNotifications.length > 3 && (
        <div className="border-t border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/60 dark:bg-[#1A2E26]/60 px-4 py-2 text-center">
          <p className="text-[11px] text-[#4A5D54] dark:text-[#A0B2A6] font-medium">
            +{unreadNotifications.length - 3} more unread waiting in queue
          </p>
        </div>
      )}
    </div>
  )
}

