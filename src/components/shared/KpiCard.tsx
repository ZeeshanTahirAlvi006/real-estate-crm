import { type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

export interface KpiTrend {
  value: number
  isPositive?: boolean
}

export interface KpiCardProps {
  title: string
  value: string | number
  icon?: string | ReactNode
  trend?: KpiTrend | number
  subtitle?: string
  badge?: string | ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Unified Global KPI Card Component:
 * - Responsive for mobile, tablet, and desktop.
 * - Floating icon aligned with design system (-translate-y-1/2).
 * - Accepts icon as string name or custom ReactNode.
 * - Supports trend percentage, subtitle, optional badge, and click interaction.
 * - Strict unicolor palette from theme.ts (#9CB080, #618764, #2B5748, #273338, #EDF2EB, #D8E2D6).
 */
export function KpiCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  badge,
  onClick,
  className,
}: KpiCardProps) {
  // Normalize trend input
  const normalizedTrend: KpiTrend | undefined =
    typeof trend === 'number'
      ? { value: trend, isPositive: trend >= 0 }
      : trend

  // Render icon helper
  const renderIcon = () => {
    if (!icon) return null
    if (typeof icon === 'string') {
      return <MaterialIcon name={icon} size={20} />
    }
    return icon
  }

  const isClickable = Boolean(onClick)

  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative overflow-visible py-0 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 transition-all duration-200 group',
        isClickable && 'cursor-pointer hover:border-[#9CB080] dark:hover:border-[#9CB080] hover:shadow-lg',
        className
      )}
    >
      {/* Floating Icon on Top-Left */}
      {icon && (
        <div className="absolute top-0 left-4 sm:left-5 -translate-y-1/2 flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/60 transition-transform duration-200 group-hover:scale-110 shadow-sm z-10 select-none">
          {renderIcon()}
        </div>
      )}

      <CardContent
        className={cn(
          'p-3.5 sm:p-5 pt-3 sm:pt-4 flex flex-col justify-between h-full min-h-[112px] sm:min-h-[116px]',
          !icon && 'pt-4 sm:pt-5'
        )}
      >
        {/* Heading and Value on Top-Right */}
        <div
          className={cn(
            'flex flex-col items-end text-right min-w-0',
            icon ? 'pl-12 sm:pl-14' : 'pl-0'
          )}
        >
          <div className="flex items-center gap-1.5 justify-end max-w-full">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] truncate">
              {title}
            </p>
            {badge && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.2 rounded font-bold bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#273338] dark:text-white tabular-nums truncate max-w-full">
            {value}
          </p>
        </div>

        {/* Trend & Subtitle on Bottom-Left */}
        <div className="mt-2.5 sm:mt-3 flex items-center gap-1.5 flex-wrap">
          {normalizedTrend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border shrink-0',
                normalizedTrend.value === 0
                  ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40'
                  : normalizedTrend.isPositive ?? normalizedTrend.value > 0
                  ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30 font-bold'
                  : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold'
              )}
            >
              {normalizedTrend.value === 0 ? (
                <MaterialIcon name="remove" size={14} />
              ) : (normalizedTrend.isPositive ?? normalizedTrend.value > 0) ? (
                <MaterialIcon name="trending_up" size={14} />
              ) : (
                <MaterialIcon name="trending_down" size={14} />
              )}
              <span>
                {normalizedTrend.value === 0
                  ? '0%'
                  : (normalizedTrend.isPositive ?? normalizedTrend.value > 0)
                  ? `+${normalizedTrend.value}%`
                  : `-${Math.abs(normalizedTrend.value)}%`}
              </span>
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] truncate max-w-full">
              {subtitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
