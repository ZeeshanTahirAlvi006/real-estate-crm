import { useEffect, useRef, useState } from 'react'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { Deal } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PhoneIcon } from '@heroicons/react/24/outline'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { cn } from '@/lib/utils'

interface DealCardProps {
  deal: Deal
  onClick?: () => void
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  urgent: { label: 'Urgent', class: 'bg-red-500/15 text-red-500 border-red-500/30' },
  high: { label: 'High', class: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  medium: { label: 'Medium', class: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  low: { label: 'Low', class: 'bg-muted text-muted-foreground' },
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!ref.current) return
    return draggable({
      element: ref.current,
      getInitialData: () => ({ dealId: deal.id }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })
  }, [deal.id])

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [
          {
            id: deal.contactId,
            name: deal.contactName,
            phone: '+1 (555) 234-5678',
          },
        ],
      })
    )
  }

  const p = priorityConfig[deal.priority] || priorityConfig.medium
  const initials = deal.assignedAgentName?.split(' ').map((n) => n[0]).join('') || '?'

  return (
    <Card
      ref={ref}
      onClick={onClick}
      className={cn(
        'group cursor-pointer select-none transition-all hover:shadow-md hover:border-primary/40 active:cursor-grabbing',
        isDragging && 'opacity-50 rotate-2 shadow-xl'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate text-foreground group-hover:text-primary transition-colors">
              {deal.contactName}
            </p>
            <button
              type="button"
              onClick={handleCall}
              title={`Call ${deal.contactName}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground"
            >
              <PhoneIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <Badge variant="outline" className={cn('text-[10px] shrink-0 ml-2', p.class)}>
            {p.label}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground truncate">{deal.propertyAddress}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground font-mono">
            ${(deal.dealValue / 1000).toFixed(0)}K
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{deal.daysInStage}d in stage</span>
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
