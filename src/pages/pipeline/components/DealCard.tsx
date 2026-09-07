import { useEffect, useRef, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Deal } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

interface DealCardProps {
  deal: Deal
  onClick?: () => void
}

// Strict plain colors from theme.ts (#9CB080, #618764, #2B5748, #273338)
const priorityConfig: Record<string, { label: string; class: string }> = {
  urgent: {
    label: 'Urgent',
    class: 'bg-[#9CB080] text-[#273338] border-[#9CB080] font-bold',
  },
  high: {
    label: 'High',
    class: 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/50 font-semibold',
  },
  medium: {
    label: 'Medium',
    class: 'bg-[#618764]/15 text-[#2B5748] dark:text-[#E2ECE4] border-[#618764]/40 font-medium',
  },
  low: {
    label: 'Low',
    class: 'text-[#75887E] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/30',
  },
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    return draggable({
      element: ref.current,
      getInitialData: () => ({ dealId: deal.id }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [deal.id])

  const p = priorityConfig[deal.priority] || priorityConfig.medium
  const initials = deal.assignedAgentName?.split(' ').map((n) => n[0]).join('') || '?'

  return (
    <Card
      ref={ref}
      onClick={onClick}
      className={cn(
        'group cursor-pointer select-none transition-all duration-200',
        'bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] rounded-xl',
        'hover:border-[#9CB080] dark:hover:border-[#9CB080] hover:shadow-sm active:cursor-grabbing',
        isDragging && 'opacity-50 rotate-1 shadow-lg border-[#9CB080]'
      )}
    >
      <CardContent className="p-3.5 flex flex-col gap-2">
        {/* Header: Name and Priority / Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight truncate text-[#273338] dark:text-white group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
              {deal.contactName}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {deal.isConvertedToEscrow && (
              <Badge
                variant="outline"
                className="text-[10px] bg-[#618764]/20 text-[#2B5748] dark:text-[#9CB080] border-[#618764] font-bold px-1.5 py-0"
              >
                Escrow
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', p.class)}>
              {p.label}
            </Badge>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1 text-xs text-[#75887E] dark:text-[#A0B2A6] truncate">
          <MaterialIcon name="location_on" size={14} className="shrink-0 text-[#618764] dark:text-[#9CB080]" />
          <span className="truncate">{deal.propertyAddress}</span>
        </div>

        {/* Footer: Price, Days in Stage & Agent */}
        <div className="mt-1 pt-2.5 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-between">
          <span className="text-sm font-bold text-[#273338] dark:text-white font-mono">
            ${(deal.dealValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
              {deal.daysInStage}d
            </span>
            <Avatar className="h-6 w-6 border border-[#D8E2D6] dark:border-[#618764]">
              <AvatarFallback className="bg-[#EDF2EB] dark:bg-[#2B5748] text-[#2B5748] dark:text-[#9CB080] text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
