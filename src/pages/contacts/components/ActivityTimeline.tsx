import type { ActivityItem } from '@/types'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

interface ActivityTypeConfig {
  icon: string
  label: string
  badgeClass: string
}

const typeConfig: Record<string, ActivityTypeConfig> = {
  call: {
    icon: 'phone_in_talk',
    label: 'Call',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  email: {
    icon: 'mail',
    label: 'Email',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  sms: {
    icon: 'sms',
    label: 'SMS',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  note: {
    icon: 'description',
    label: 'Note',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  stage_change: {
    icon: 'swap_horiz',
    label: 'Stage Update',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  whatsapp: {
    icon: 'chat',
    label: 'WhatsApp',
    badgeClass: 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30',
  },
  meeting: {
    icon: 'handshake',
    label: 'Meeting',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]',
  },
  system: {
    icon: 'settings',
    label: 'System Log',
    badgeClass: 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40',
  },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ActivityTimelineProps {
  activities: ActivityItem[]
  filterType?: string
}

export function ActivityTimeline({ activities, filterType = 'all' }: ActivityTimelineProps) {
  const filtered = activities.filter((a) => {
    if (!filterType || filterType === 'all') return true
    if (filterType === 'call') return a.type === 'call'
    if (filterType === 'whatsapp') return a.type === 'whatsapp'
    if (filterType === 'note') return a.type === 'note'
    if (filterType === 'email') return a.type === 'email'
    if (filterType === 'system') return a.type === 'system' || a.type === 'stage_change'
    return true
  })

  if (!filtered.length) {
    return (
      <div className="py-12 text-center rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764]/40 bg-[#F5F7F4]/50 dark:bg-[#202B2F]/30">
        <MaterialIcon name="schedule" size={32} className="mx-auto text-[#75887E] dark:text-[#A0B2A6] mb-2 opacity-60" />
        <p className="text-sm font-semibold text-[#273338] dark:text-white">No Activity Found</p>
        <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-1">
          {filterType === 'all' ? 'No logged events recorded yet' : `No ${filterType} entries found`}
        </p>
      </div>
    )
  }

  return (
    <div className="relative pl-6 space-y-4">
      {/* Continuous Vertical Timeline Track */}
      <div className="absolute left-2.5 top-3 bottom-3 w-px bg-[#D8E2D6] dark:bg-[#618764]/40" />

      {filtered.map((a) => {
        const cfg = typeConfig[a.type] || typeConfig.system
        return (
          <div key={a.id} className="relative group">
            {/* Timeline Node Icon */}
            <div
              className={cn(
                'absolute -left-6 top-1.5 z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-xs transition-transform group-hover:scale-110',
                cfg.badgeClass
              )}
            >
              <MaterialIcon name={cfg.icon} size={13} />
            </div>

            {/* Content Card */}
            <div className="rounded-xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]/70 p-3.5 sm:p-4 shadow-xs hover:border-[#9CB080]/50 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                    cfg.badgeClass
                  )}
                >
                  <MaterialIcon name={cfg.icon} size={12} />
                  <span>{cfg.label}</span>
                </span>
                <span className="text-[11px] font-medium text-[#75887E] dark:text-[#A0B2A6] tabular-nums">
                  {formatDate(a.createdAt)}
                </span>
              </div>

              <p className="text-sm text-[#273338] dark:text-white whitespace-pre-wrap leading-relaxed">
                {a.description}
              </p>

              {a.createdBy && (
                <div className="mt-2.5 pt-2 border-t border-[#D8E2D6]/60 dark:border-[#618764]/30 flex items-center gap-1.5 text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  <MaterialIcon name="person" size={14} className="text-[#618764]" />
                  <span className="font-medium">{a.createdBy}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
