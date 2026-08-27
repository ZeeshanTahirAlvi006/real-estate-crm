import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useGetAuditLogsQuery } from '@/store/api/auditApi'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'
import { Skeleton } from '@/components/ui/skeleton'

export function ActivityFeed() {
  const user = useAppSelector((state) => state.auth.user)
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN

  // Super Admin queries system audit logs; other roles query active contacts
  const { data: auditData, isLoading: auditLoading } = useGetAuditLogsQuery({ limit: 10 }, { skip: !isSuperAdmin })
  const { data: contactsData, isLoading: contactsLoading } = useGetContactsQuery({ limit: 10 }, { skip: isSuperAdmin })

  const isLoading = isSuperAdmin ? auditLoading : contactsLoading

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
    if (action.includes('AUTH_LOGIN')) return '🔐'
    if (action.includes('AUTH_REGISTER')) return '🏢'
    if (action.includes('CONTACT_CREATE')) return '👤'
    if (action.includes('CONTACT_ADD_NOTE')) return '📝'
    if (action.includes('CONTACT_UPDATE')) return '✏️'
    if (action.includes('USER_INVITE')) return '✉️'
    if (action.includes('FEATURE_FLAG')) return '⚡'
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
                    {new Date(log.createdAt).toLocaleTimeString()} · IP: {log.ipAddress}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    )
  }

  // Brokerage Owner / Team Lead / Agent Feed (Contact Interactions Stream)
  const contacts = contactsData?.contacts || []
  return (
    <ScrollArea className="h-64">
      <div className="space-y-1">
        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No contact activities recorded yet.</p>
        ) : (
          contacts.slice(0, 8).map((c) => (
            <div key={c.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50">
              <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs">
                  <span className="font-semibold text-foreground">{c.firstName} {c.lastName}</span>{' '}
                  <span className="text-muted-foreground">· Source:</span>{' '}
                  <span className="text-primary font-medium">{c.leadSource}</span>
                </p>
                <p className="text-[10px] text-muted-foreground/70 truncate">
                  {c.notes || `Assigned to ${c.assignedAgentName || 'Agent'} · Score: ${c.leadScore}/100`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}
