import { useEffect, useRef, useState } from 'react'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import type { PipelineStage, Deal } from '@/types'
import { DealCard } from './DealCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

interface PipelineColumnProps {
  stage: PipelineStage
  deals: Deal[]
  isLoaded?: boolean
  isLoadingDeals?: boolean
  onSelectDeal?: (deal: Deal) => void
  onLoadStageDeals?: (stageId: string) => void
  isMobile?: boolean
  className?: string
}

export function PipelineColumn({
  stage,
  deals,
  isLoaded = true,
  isLoadingDeals = false,
  onSelectDeal,
  onLoadStageDeals,
  isMobile = false,
  className,
}: PipelineColumnProps) {
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

  // Total and weighted value calculations
  const totalValue = isLoaded
    ? deals.reduce((s, d) => s + d.dealValue, 0)
    : stage.totalValue || 0
  const weightedValue = Math.round((totalValue * stage.probability) / 100)
  const dealCount = isLoaded ? deals.length : stage.dealCount || 0

  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col rounded-2xl transition-all duration-200',
        'bg-[#F8F9FA] dark:bg-[#2B5748]/50 border border-[#D8E2D6] dark:border-[#618764]',
        'w-full lg:flex-1 lg:min-w-[270px] lg:max-w-md',
        isDragOver && 'border-[#9CB080] bg-[#9CB080]/10 ring-2 ring-[#9CB080]/30 scale-[1.01]',
        className
      )}
    >
      {/* Column Header */}
      <div className="border-b border-[#D8E2D6] dark:border-[#618764]/60 p-3.5 bg-white/70 dark:bg-[#202B2F]/70 rounded-t-2xl space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="h-3 w-3 rounded-full shrink-0 shadow-xs ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundColor: stage.color || '#9CB080' }}
            />
            <h3 className="text-sm font-bold text-[#273338] dark:text-white truncate">
              {stage.name}
            </h3>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EDF2EB] dark:bg-[#202B2F] px-1.5 text-[11px] font-bold text-[#2B5748] dark:text-[#E2ECE4] border border-[#D8E2D6] dark:border-[#618764]/40">
              {dealCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-mono border-[#618764]/40 text-[#2B5748] dark:text-[#9CB080] bg-[#618764]/10"
            >
              {stage.probability}%
            </Badge>

            {/* Mobile / Unloaded quick button in header */}
            {!isLoaded && isMobile && (
              <Button
                size="sm"
                variant="outline"
                disabled={isLoadingDeals}
                onClick={() => onLoadStageDeals?.(stage.id)}
                className="h-6 px-2 text-[10px] font-bold gap-1 bg-[#9CB080] text-[#273338] hover:bg-[#8CA070] border-[#9CB080]"
              >
                {isLoadingDeals ? (
                  <MaterialIcon name="progress_activity" size={12} className="animate-spin" />
                ) : (
                  <MaterialIcon name="download" size={12} />
                )}
                Load
              </Button>
            )}
          </div>
        </div>

        {/* Financial KPIs for this column */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-[#75887E] dark:text-[#A0B2A6]">
            Total: <strong className="text-[#273338] dark:text-white font-bold">${(totalValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K</strong>
          </span>
          <span className="text-[#2B5748] dark:text-[#9CB080] font-semibold">
            Forecast: ${(weightedValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K
          </span>
        </div>
      </div>

      {/* Cards & Content Area */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 max-h-[64vh]">
        {!isLoaded ? (
          // On-demand load prompt for this stage
          <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764]/60 bg-white/40 dark:bg-[#202B2F]/30 gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#EDF2EB] dark:bg-[#202B2F] flex items-center justify-center text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="inventory_2" size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#273338] dark:text-white">
                {dealCount} {dealCount === 1 ? 'deal' : 'deals'} in this stage
              </p>
              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                Saved from server load on navigation
              </p>
            </div>
            <Button
              size="sm"
              disabled={isLoadingDeals}
              onClick={() => onLoadStageDeals?.(stage.id)}
              className="mt-1 h-8 text-xs font-bold gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] border-none shadow-xs"
            >
              {isLoadingDeals ? (
                <>
                  <MaterialIcon name="progress_activity" size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <MaterialIcon name="download" size={14} />
                  Load Deals ({dealCount})
                </>
              )}
            </Button>
          </div>
        ) : deals.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764]/60 text-xs text-[#75887E] dark:text-[#A0B2A6] select-none">
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
