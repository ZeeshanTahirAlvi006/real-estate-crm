import { cn } from '@/lib/utils'

interface HealthScoreGaugeProps {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export function HealthScoreGauge({ score, grade }: HealthScoreGaugeProps) {
  const gradeColors: Record<string, string> = {
    A: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    B: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    C: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    D: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    F: 'text-red-500 bg-red-500/10 border-red-500/30',
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-36 w-36 items-center justify-center">
        {/* SVG Circle Progress */}
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/40"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * score) / 100}
            strokeLinecap="round"
            className="text-primary transition-all duration-1000 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold tracking-tight">{score}%</span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Health</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Overall Rating:</span>
        <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-bold', gradeColors[grade])}>
          Grade {grade}
        </span>
      </div>
    </div>
  )
}
