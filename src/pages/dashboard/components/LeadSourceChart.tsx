import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useGetLeadSourcesQuery } from '@/store/api/dashboardApi'
import { Skeleton } from '@/components/ui/skeleton'

const SOURCE_COLORS: Record<string, string> = {
  Zillow: '#006aff',
  'Meta Ads': '#1877f2',
  'Google Ads': '#4285f4',
  'Realtor.com': '#d92228',
  Website: '#8b5cf6',
  Referral: '#f59e0b',
  Direct: '#10b981',
  Other: '#6b7280',
}

const FALLBACK_COLORS = ['#006aff', '#1877f2', '#4285f4', '#d92228', '#8b5cf6', '#f59e0b', '#10b981', '#6b7280']

export function LeadSourceChart() {
  const { data: rawSources = [], isLoading } = useGetLeadSourcesQuery()

  if (isLoading) {
    return (
      <div className="flex items-center gap-6">
        <Skeleton className="h-48 w-48 rounded-full" />
        <div className="flex-1 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const chartData = rawSources.map((item, idx) => ({
    name: item._id || 'Unknown',
    value: item.count,
    color: SOURCE_COLORS[item._id] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
        <p>No lead source distribution data yet.</p>
        <span className="text-xs opacity-75 mt-1">Inbound leads will populate this breakdown in real-time.</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{total.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
            </div>
            <span className="font-medium text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
