import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts'
import { useGetDashboardLeadSourcesQuery } from '@/store/api/dashboardApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { cn } from '@/lib/utils'

const SOURCE_COLORS: Record<string, string> = {
  Zillow: '#9CB080',
  'Meta Ads': '#618764',
  'Google Ads': '#2B5748',
  'Realtor.com': '#8CA070',
  Website: '#4A5D54',
  Referral: '#B2C696',
  Direct: '#365347',
  Organic: '#A0B2A6',
  Social: '#618764',
  Other: '#273338',
}

const FALLBACK_COLORS = [
  '#9CB080',
  '#618764',
  '#2B5748',
  '#B2C696',
  '#4A5D54',
  '#A0B2A6',
  '#365347',
  '#8CA070',
]

// Render customized active shape on hover
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0px 4px 10px rgba(0,0,0,0.25))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  )
}

export function LeadSourceChart() {
  const { data: rawSources = [], isLoading } = useGetDashboardLeadSourcesQuery()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'top3'>('all')

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] shadow-md shadow-black/10 bg-white dark:bg-[#254238] transition-colors duration-200">
        <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
              <MaterialIcon name="pie_chart" size={18} className="text-[#618764] dark:text-[#9CB080]" />
              Lead Ingestion
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
            <Skeleton className="h-48 w-48 rounded-full shrink-0 bg-[#EDF2EB] dark:bg-[#1A2E26]" />
            <div className="flex-1 space-y-3 w-full">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-5 w-full rounded-md bg-[#EDF2EB] dark:bg-[#1A2E26]" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Provide realistic demo defaults if database has no leads yet
  const displaySources =
    rawSources.length > 0
      ? rawSources
      : [
        { _id: 'Organic Search', count: 420 },
        { _id: 'Meta Ads', count: 310 },
        { _id: 'Zillow Ingestion', count: 245 },
        { _id: 'Referrals', count: 165 },
        { _id: 'Direct Web', count: 100 },
      ]

  const allChartData = displaySources.map((item, idx) => ({
    name: item._id || 'Unknown',
    value: item.count,
    color: SOURCE_COLORS[item._id] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }))

  const chartData =
    filterMode === 'top3'
      ? [...allChartData].sort((a, b) => b.value - a.value).slice(0, 3)
      : allChartData

  const total = chartData.reduce((s, d) => s + d.value, 0)
  const activeItem = activeIndex !== null ? chartData[activeIndex] : null
  const selectedItem = selectedSource
    ? chartData.find((d) => d.name === selectedSource)
    : null

  const centerItem = activeItem || selectedItem
  const centerPercent = centerItem && total > 0 ? Math.round((centerItem.value / total) * 100) : null

  return (
    <Card className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] shadow-md shadow-black/10 bg-white dark:bg-[#254238] transition-colors duration-200">
      {/* Header with Title and Filters on Top Right */}
      <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
            <MaterialIcon name="pie_chart" size={18} className="text-[#618764] dark:text-[#9CB080]" />
            Lead Ingestion
          </CardTitle>

          {/* Quick Filters on the Top Right */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterMode('all')
                setSelectedSource(null)
              }}
              className={cn(
                'px-3 py-1 text-xs rounded-md font-bold transition-all cursor-pointer border',
                filterMode === 'all'
                  ? 'bg-[#9CB080] text-[#1A2E26] border-[#9CB080] shadow-xs'
                  : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40 hover:text-[#273338] dark:hover:text-white'
              )}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('top3')
                setSelectedSource(null)
              }}
              className={cn(
                'px-3 py-1 text-xs rounded-md font-bold transition-all cursor-pointer border',
                filterMode === 'top3'
                  ? 'bg-[#9CB080] text-[#1A2E26] border-[#9CB080] shadow-xs'
                  : 'bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]/40 hover:text-[#273338] dark:hover:text-white'
              )}
            >
              Top 3 Sources
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row items-center gap-6 min-w-0">
          {/* Interactive Donut Graphic */}
          <div className="relative h-52 w-52 shrink-0 min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                  {...({ activeIndex: activeIndex ?? -1 } as any)}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={(_, index) => {
                    const clicked = chartData[index]?.name
                    setSelectedSource(selectedSource === clicked ? null : clicked)
                  }}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={
                        selectedSource
                          ? selectedSource === entry.name
                            ? 1
                            : 0.35
                          : 1
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: 'none' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                      return (
                        <div className="rounded-xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#1E282D] p-3 shadow-2xl shadow-black/40 min-w-47.5 text-xs space-y-2">
                          {/* Channel Title with Badge */}
                          <div className="flex items-center gap-2 pb-1.5 border-b border-[#D8E2D6] dark:border-[#618764]/40">
                            <span
                              className="h-3 w-3 rounded-full shrink-0 ring-2 ring-black/10 dark:ring-white/10"
                              style={{ backgroundColor: data.color }}
                            />
                            <span className="font-bold text-sm text-[#273338] dark:text-white truncate">
                              {data.name}
                            </span>
                          </div>

                          {/* Metric Rows */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[#4A5D54] dark:text-[#A0B2A6] font-medium">
                                Inbound Leads:
                              </span>
                              <span className="font-extrabold text-[#273338] dark:text-white font-mono text-xs">
                                {data.value.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[#4A5D54] dark:text-[#A0B2A6] font-medium">
                                Share of Intake:
                              </span>
                              <span className="font-black text-[#2B5748] dark:text-[#9CB080] font-mono text-xs bg-[#9CB080]/15 dark:bg-[#9CB080]/20 px-1.5 py-0.5 rounded border border-[#9CB080]/30">
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {centerItem ? (
                <>
                  <span className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
                    {centerPercent}%
                  </span>
                  <span className="text-[11px] font-semibold text-[#2B5748] dark:text-[#9CB080] max-w-22.5 truncate">
                    {centerItem.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
                    {total.toLocaleString()}
                  </span>
                  <span className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] font-medium">Total Leads</span>
                </>
              )}
            </div>
          </div>

          {/* Breakdown Legend List */}
          <div className="flex-1 w-full space-y-2">
            {chartData.map((d, index) => {
              const isSelected = selectedSource === d.name
              const isHovered = activeIndex === index
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'

              return (
                <button
                  key={d.name}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => setSelectedSource(isSelected ? null : d.name)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-lg text-xs transition-colors text-left border cursor-pointer',
                    isSelected
                      ? 'bg-[#9CB080]/15 border-[#9CB080] shadow-xs'
                      : isHovered
                        ? 'bg-[#EDF2EB] dark:bg-[#1A2E26] border-[#618764]'
                        : 'bg-white/60 dark:bg-[#1A2E26]/60 border-[#D8E2D6] dark:border-[#618764]/40 hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26]'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="font-semibold text-[#273338] dark:text-[#E2ECE4] truncate">{d.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-[#4A5D54] dark:text-[#A0B2A6] font-mono">{pct}%</span>
                    <span className="font-bold text-[#273338] dark:text-white min-w-8 text-right">
                      {d.value}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}



