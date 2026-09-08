import { cn } from '@/lib/utils'

interface HealthScoreGaugeProps {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export function HealthScoreGauge({ score, grade }: HealthScoreGaugeProps) {
  const gradeColors: Record<string, string> = {
    A: 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/40',
    B: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    C: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    D: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    F: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  }

  const strokeColor =
    score >= 85
      ? '#9CB080'
      : score >= 70
      ? '#618764'
      : score >= 50
      ? '#f59e0b'
      : '#f43f5e'

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-32 w-32 sm:h-36 sm:w-36 items-center justify-center">
        {/* SVG Circle Progress */}
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke="currentColor"
            strokeWidth="9"
            className="text-[#D8E2D6] dark:text-[#1A2E26]"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            stroke={strokeColor}
            strokeWidth="9"
            strokeDasharray={264}
            strokeDashoffset={264 - (264 * score) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            fill="transparent"
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#273338] dark:text-white font-mono">
            {score}%
          </span>
          <span className="text-[10px] font-bold text-[#75887E] dark:text-[#A0B2A6] uppercase tracking-widest">
            Health
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-[#75887E] dark:text-[#A0B2A6]">Rating:</span>
        <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-bold font-mono', gradeColors[grade] || gradeColors.A)}>
          Grade {grade}
        </span>
      </div>
    </div>
  )
}
