import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useGetAuditLogsQuery } from '@/store/api/auditApi'
import { useGetActivityFeedQuery } from '@/store/api/dashboardApi'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ActivityFeed() {
  const user = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  // On-demand load state: hidden by default
  const [isLoaded, setIsLoaded] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Super Admin queries system audit logs; other roles query real-time activity feed
  const {
    data: auditData,
    isLoading: auditLoading,
    refetch: refetchAudit,
  } = useGetAuditLogsQuery({ limit: 15 }, { skip: !isLoaded || !isSuperAdmin })

  const {
    data: activityFeed = [],
    isLoading: feedLoading,
    refetch: refetchFeed,
  } = useGetActivityFeedQuery(undefined, { skip: !isLoaded || isSuperAdmin })

  const isLoading = isSuperAdmin ? auditLoading : feedLoading

  const handleShowActivity = () => {
    setIsConnecting(true)
    setTimeout(() => {
      setIsLoaded(true)
      setIsConnecting(false)
    }, 450)
  }

  const handleRefresh = () => {
    if (isSuperAdmin) {
      refetchAudit()
    } else {
      refetchFeed()
    }
  }

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase()
    if (act.includes('auth') || act.includes('login')) return <MaterialIcon name="login" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('register') || act.includes('company')) return <MaterialIcon name="apartment" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('contact') || act.includes('lead')) return <MaterialIcon name="person" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('note')) return <MaterialIcon name="description" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('call')) return <MaterialIcon name="call" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('email') || act.includes('message')) return <MaterialIcon name="mail" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    if (act.includes('deal') || act.includes('stage') || act.includes('pipeline')) return <MaterialIcon name="work" size={14} className="text-[#618764] dark:text-[#9CB080]" />
    return <MaterialIcon name="info" size={14} className="text-[#4A5D54] dark:text-[#A0B2A6]" />
  }

  // If not yet loaded on demand, render the prominent on-demand show trigger
  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-10 text-center rounded-xl bg-[#EDF2EB]/50 dark:bg-[#1A2E26]/50 border border-dashed border-[#D8E2D6] dark:border-[#618764]/60">
        <h4 className="text-base font-bold text-[#273338] dark:text-white">
          Platform Activity Stream
        </h4>
        <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] max-w-md mt-1 mb-5">
          View contact interactions, inbound marketing records, deal stages, and system events.
        </p>

        <Button
          onClick={handleShowActivity}
          disabled={isConnecting}
          className="rounded-lg px-6 py-2.5 font-bold text-xs shadow-sm bg-[#9CB080] hover:bg-[#B2C696] text-[#1A2E26] transition-colors cursor-pointer"
        >
          {isConnecting ? (
            <span className="flex items-center gap-2">
              <MaterialIcon name="progress_activity" size={16} className="animate-spin" />
              <span>Loading Stream...</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <MaterialIcon name="visibility" size={16} />
              <span>Show Platform Activity</span>
            </span>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stream Controls Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6] dark:border-[#618764]/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-[#9CB080]"></span>
          <span className="font-bold text-[#273338] dark:text-white">Activity Stream Active</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-md border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#254238] transition-colors cursor-pointer"
            title="Refresh stream"
          >
            <MaterialIcon name="refresh" size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setIsLoaded(false)}
            className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold rounded-md border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#254238] transition-colors cursor-pointer"
            title="Collapse stream"
          >
            <MaterialIcon name="expand_less" size={14} />
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-[#EDF2EB] dark:bg-[#1A2E26]" />
          ))}
        </div>
      ) : isSuperAdmin ? (
        <ScrollArea className="h-72">
          <div className="space-y-2 pr-3">
            {(auditData?.logs || []).length === 0 ? (
              <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] text-center py-10">
                No recent system audit records.
              </p>
            ) : (
              auditData?.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg p-2.5 transition-colors bg-[#F5F7F4]/60 dark:bg-[#1A2E26]/70 border border-[#D8E2D6] dark:border-[#618764]/30 hover:border-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26]"
                >
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764]/50 text-xs">
                      {getActionIcon(log.action)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-bold text-[#273338] dark:text-white">
                        {log.userEmail || 'System'}
                      </span>{' '}
                      <span className="text-[#4A5D54] dark:text-[#A0B2A6]">performed</span>{' '}
                      <span className="font-mono text-[#2B5748] dark:text-[#9CB080] text-[11px] font-bold">
                        {log.action}
                      </span>
                      {log.details?.name && (
                        <span className="ml-1 text-[#273338] dark:text-white font-medium">
                          ({log.details.name})
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-mono mt-0.5">
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · IP: {log.ipAddress}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="h-72">
          <div className="space-y-2 pr-3">
            {activityFeed.length === 0 ? (
              <div className="text-center py-10 space-y-1">
                <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6]">
                  No recent contact or deal activities recorded yet.
                </p>
                <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  Events will populate here automatically.
                </span>
              </div>
            ) : (
              activityFeed.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 rounded-lg p-2.5 transition-colors bg-[#F5F7F4]/60 dark:bg-[#1A2E26]/70 border border-[#D8E2D6] dark:border-[#618764]/30 hover:border-[#9CB080] hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26]"
                >
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#254238] border border-[#D8E2D6] dark:border-[#618764]/50 text-xs">
                      {getActionIcon(act.type)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#273338] dark:text-[#E2ECE4]">
                      {act.description}
                    </p>
                    <p className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                      {act.createdBy ? `By ${act.createdBy} · ` : ''}
                      {new Date(act.createdAt).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}


