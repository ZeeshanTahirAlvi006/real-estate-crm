import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useGetAuditLogsQuery } from '@/store/api/auditApi'
import { useGetActivityFeedQuery } from '@/store/api/dashboardApi'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'
import { Skeleton } from '@/components/ui/skeleton'

export function ActivityFeed() {
  const user = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  // Super Admin queries system audit logs; other roles query real-time activity feed
  const { data: auditData, isLoading: auditLoading } = useGetAuditLogsQuery({ limit: 10 }, { skip: !isSuperAdmin })
  const { data: activityFeed = [], isLoading: feedLoading } = useGetActivityFeedQuery(undefined, { skip: isSuperAdmin })

  const isLoading = isSuperAdmin ? auditLoading : feedLoading

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const getActionEmoji = (action: string) => {
    if (action.includes('AUTH_LOGIN') || action.includes('login')) return '🔐'
    if (action.includes('REGISTER') || action.includes('register')) return '🏢'
    if (action.includes('CONTACT') || action.includes('contact')) return '👤'
    if (action.includes('NOTE') || action.includes('note')) return '📝'
    if (action.includes('CALL') || action.includes('call')) return '📞'
    if (action.includes('EMAIL') || action.includes('email') || action.includes('message')) return '✉️'
    if (action.includes('DEAL') || action.includes('deal') || action.includes('stage')) return '💼'
    return '📋'
  }

  if (isSuperAdmin) {
    const logs = auditData?.logs || []
    return (
      <ScrollArea className="h-64">
        <div className="space-y-1">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No recent system audit records.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
                <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-xs">
                    {getActionEmoji(log.action)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold text-foreground">{log.userEmail || 'System'}</span>{' '}
                    <span className="text-muted-foreground">performed</span>{' '}
                    <span className="font-mono text-primary text-[11px] font-medium">{log.action}</span>
                    {log.details?.name && <span className="ml-1 text-foreground">({log.details.name})</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · IP: {log.ipAddress}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    )
  }

  // Brokerage Owner / Team Lead / Agent Real-Time Activity Feed
  return (
    <ScrollArea className="h-64">
      <div className="space-y-1">
        {activityFeed.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No recent contact or deal activities recorded yet.</p>
        ) : (
          activityFeed.map((act) => (
            <div key={act.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
              <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs">
                  {getActionEmoji(act.type)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">
                  {act.description}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {act.createdBy ? `By ${act.createdBy} · ` : ''}
                  {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}
