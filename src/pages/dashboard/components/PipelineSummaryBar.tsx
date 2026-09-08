import type { PipelineStage } from '@/types'

interface PipelineSummaryBarProps {
  stages: PipelineStage[]
}

export function PipelineSummaryBar({ stages }: PipelineSummaryBarProps) {
  const activeStages = stages.filter(s => s.id !== 'closed_lost')

  return (
    <div className="space-y-3">
      {activeStages.map(stage => {
        const maxDeals = Math.max(...activeStages.map(s => s.dealCount), 1)
        const pct = (stage.dealCount / maxDeals) * 100

        return (
          <div key={stage.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#273338] dark:text-white">{stage.dealCount}</span>
                <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  ${(stage.totalValue / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6]/60 dark:border-[#618764]/30">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: stage.color || '#9CB080' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

