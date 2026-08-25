import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/providers/ThemeProvider'

const data = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (29 - i))
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: Math.floor(Math.random() * 15) + 5 + (i > 20 ? 5 : 0),
  }
})

export function LeadsOverTimeChart() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const strokeColor = isDark ? '#ffffff' : '#18181b'

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
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
