import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/providers/ThemeProvider'
import { useGetLeadsOverTimeQuery } from '@/store/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'

export function LeadsOverTimeChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const strokeColor = isDark ? '#ffffff' : '#18181b'

  const { data: rawStats = [], isLoading } = useGetLeadsOverTimeQuery()

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-xl" />
  }

  // Format YYYY-MM-DD to human readable dates
  const chartData = rawStats.map((item) => {
    let formattedDate = item._id
    try {
      const parts = item._id.split('-')
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
    } catch {
      formattedDate = item._id
    }
    return {
      date: formattedDate,
      leads: item.count,
    }
  })

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-sm">
        <p>No recent lead timeline activity.</p>
        <span className="text-xs opacity-75 mt-1">Inbound leads created across time will render here automatically.</span>
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={isDark ? 0.45 : 0.32} />
              <stop offset="60%" stopColor={strokeColor} stopOpacity={isDark ? 0.15 : 0.08} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              borderColor: 'var(--border)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--popover-foreground)',
            }}
            itemStyle={{ color: 'var(--popover-foreground)' }}
            labelStyle={{ color: 'var(--popover-foreground)' }}
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke={strokeColor}
            fill="url(#leadGradient)"
            strokeWidth={2}
            activeDot={{
              r: 5,
              fill: strokeColor,
              stroke: isDark ? '#18181b' : '#ffffff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
