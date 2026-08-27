import { useEffect, useRef, useState } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { PipelineStage, Deal } from '@/types'
import { DealCard } from './DealCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: Deal[]
  onSelectDeal?: (deal: Deal) => void
}

export function PipelineColumn({ stage, deals, onSelectDeal }: PipelineColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ stageId: stage.id }),
      onDragEnter: () => setIsDragOver(true),
      onDragLeave: () => setIsDragOver(false),
      onDrop: () => setIsDragOver(false),
    })
  }, [stage.id])

  const totalValue = deals.reduce((s, d) => s + d.dealValue, 0)
  const weightedValue = Math.round((totalValue * stage.probability) / 100)

  return (
    <div
      ref={ref}
      className={cn(
        'flex w-80 shrink-0 flex-col rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs transition-all shadow-xs',
        isDragOver && 'border-primary bg-primary/5 ring-2 ring-primary/20 scale-[1.01]'
      )}
    >
      {/* Column header */}
      <div className="border-b border-border/70 p-3.5 bg-muted/20 rounded-t-2xl space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-3 w-3 rounded-full shadow-xs shrink-0" style={{ backgroundColor: stage.color }} />
            <h3 className="text-sm font-bold text-foreground truncate">{stage.name}</h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted/80 px-1.5 text-[11px] font-bold text-muted-foreground">
              {deals.length}
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 font-mono"
            style={{
              borderColor: `${stage.color}40`,
              backgroundColor: `${stage.color}10`,
              color: stage.color,
            }}
          >
            {stage.probability}%
          </Badge>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-muted-foreground">
            Total: <strong className="text-foreground">${(totalValue / 1000).toFixed(0)}K</strong>
          </span>
          <span className="text-primary font-semibold">
            Forecast: ${(weightedValue / 1000).toFixed(0)}K
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 max-h-[64vh]">
        {deals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground select-none">
            Drop deals here
          </div>
        ) : (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onSelectDeal?.(deal)}
            />
          ))
        )}
      </div>
    </div>
  )
}
