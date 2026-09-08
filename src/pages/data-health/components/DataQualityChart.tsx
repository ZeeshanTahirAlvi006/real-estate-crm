import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { DataHealthTrend } from '@/types'

interface DataQualityChartProps {
  trend: DataHealthTrend[]
}

export function DataQualityChart({ trend }: DataQualityChartProps) {
  const chartData = trend.map((t) => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: t.score,
  }))

  return (
    <Card className="rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] shadow-xs">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
            <MaterialIcon name="monitoring" size={18} className="text-[#618764] dark:text-[#9CB080]" />
            <span>Quality Trend</span>
          </CardTitle>
          <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
            30-day algorithmic cleanliness rating
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-52 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D8E2D6" opacity={0.4} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#75887E' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fontSize: 11, fill: '#75887E' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#273338',
                  borderColor: '#618764',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
                itemStyle={{ color: '#9CB080' }}
                labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#618764"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#9CB080' }}
                activeDot={{ r: 5, fill: '#2B5748' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
