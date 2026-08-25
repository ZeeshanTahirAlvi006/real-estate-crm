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
              <span className="text-muted-foreground">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{stage.dealCount}</span>
                <span className="text-xs text-muted-foreground">
                  ${(stage.totalValue / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
