import { Card, CardContent } from '@/components/ui/card'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: { value: number; isPositive: boolean }
  subtitle?: string
  className?: string
}

export function StatCard({ title, value, icon, trend, subtitle, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-visible py-0 rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-md shadow-black/10 transition-colors duration-200 group',
        className
      )}
    >
      {/* Top Left Icon: 50% inside the card and 50% sliding out on top */}
      <div className="absolute top-0 left-4 sm:left-5 -translate-y-1/2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/60 transition-transform duration-200 group-hover:scale-110 shadow-sm z-10">
        {icon}
      </div>

      <CardContent className="p-4 sm:p-5 pt-3 sm:pt-4 flex flex-col justify-between h-full min-h-[116px]">
        {/* Heading and Value on the top-right */}
        <div className="flex flex-col items-end text-right min-w-0 pl-14">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4A5D54] dark:text-[#A0B2A6] truncate max-w-full">
            {title}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#273338] dark:text-white tabular-nums">
            {value}
          </p>
        </div>

        {/* Percentage & Subtitle on the bottom-left */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border',
                trend.value === 0
                  ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40'
                  : trend.isPositive
                    ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border-[#9CB080]/30 font-bold'
                    : 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold'
              )}
            >
              {trend.value === 0 ? (
                <MaterialIcon name="remove" size={14} />
              ) : trend.isPositive ? (
                <MaterialIcon name="trending_up" size={14} />
              ) : (
                <MaterialIcon name="trending_down" size={14} />
              )}
              <span>
                {trend.value === 0
                  ? '0%'
                  : trend.isPositive
                    ? `+${trend.value}%`
                    : `-${Math.abs(trend.value)}%`}
              </span>
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
              {subtitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
