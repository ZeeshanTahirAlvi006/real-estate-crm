import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'
import { theme } from '@/theme'

export function PlatformOverviewSection() {
  return (
    <section id="platform" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              WHY YOU NEED PROPPULSE
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              One platform for your entire real estate operation
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={300}>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              Replace disconnected tools with an AI-powered platform built to help agents, teams and brokerages attract leads, nurture relationships and close deals.
            </p>
          </ScrollReveal>
        </div>

        {/* Floating Dashboard Graphic */}
        <ScrollReveal direction="up" delay={400}>
          <div className="relative max-w-4xl mx-auto">
            
            {/* Floating Pipeline Tag */}
            <div className="absolute -top-4 left-6 sm:left-12 z-20 flex items-center px-4 py-1.5 rounded-full bg-[#202B2F] border border-[#618764] shadow-xl">
              <span className="text-xs font-bold text-white">Pipeline</span>
            </div>

            {/* Floating Reviews Tag */}
            <div className="absolute top-1/4 -right-2 sm:-right-6 z-20 flex items-center px-4 py-1.5 rounded-full bg-[#202B2F] border border-[#618764] shadow-xl">
              <span className="text-xs font-bold text-white">Reviews</span>
            </div>

            {/* Dashboard Container */}
            <div className={`rounded-3xl ${theme.classes.card} p-6 sm:p-8 shadow-xl text-slate-900 dark:text-white`}>
              
              {/* Card Top Title & Growth Badge */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b ${theme.classes.border} gap-3`}>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block">
                    SALES PIPELINE
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">This month</h3>
                </div>
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#9CB080] text-[#273338] text-xs font-black">
                  <MaterialIcon name="trending_up" size={14} />
                  <span>+24% vs last month</span>
                </div>
              </div>

              {/* 3 Analytics Gauges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                
                {/* Invites Goal */}
                <div className={`p-4 rounded-xl ${theme.classes.subCard} shadow-xs flex flex-col justify-between`}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase">Invites Goal</span>
                  <div className="flex items-center justify-between my-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">1.4K</span>
                    <span className="text-xs font-bold text-[#2B5748] dark:text-[#9CB080]">↑ 40% out of 10</span>
                  </div>
                  {/* Gauge Arc representation */}
                  <div className={`w-full ${theme.classes.divider} h-2 rounded-full overflow-hidden`}>
                    <div className="h-full bg-[#9CB080] rounded-full w-[65%]" />
                  </div>
                </div>

                {/* Reviews Received */}
                <div className={`p-4 rounded-xl ${theme.classes.subCard} shadow-xs flex flex-col justify-between`}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase">Reviews Received</span>
                  <div className="flex items-center justify-between my-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">1,210</span>
                    <span className="text-xs font-bold text-[#2B5748] dark:text-[#9CB080]">↗ 18% vs last month</span>
                  </div>
                  {/* Sparkline simulation */}
                  <div className="w-full flex items-end justify-between h-4 pt-1">
                    {[40, 55, 60, 45, 70, 50, 65, 80, 75, 90].map((v, i) => (
                      <div key={i} className="w-1 bg-[#9CB080] rounded-full" style={{ height: `${v}%` }} />
                    ))}
                  </div>
                </div>

                {/* Sentiment */}
                <div className={`p-4 rounded-xl ${theme.classes.subCard} shadow-xs flex flex-col justify-between`}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase">Sentiment</span>
                  <div className="flex items-center justify-around my-2">
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 rounded-full bg-[#9CB080] text-[#273338] flex items-center justify-center">
                        <MaterialIcon name="thumb_up" size={14} filled />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">900</p>
                        <p className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-bold">↑ 100%</p>
                      </div>
                    </div>
                    <div className={`h-8 w-px ${theme.classes.divider}`} />
                    <div className="flex items-center space-x-2">
                      <span className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <MaterialIcon name="thumb_down" size={14} filled />
                      </span>
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">300</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">↘ 100%</p>
                      </div>
                    </div>
                  </div>
                  <div className={`w-full ${theme.classes.divider} h-2 rounded-full overflow-hidden flex`}>
                    <div className="h-full bg-[#9CB080] w-[75%]" />
                    <div className="h-full bg-amber-400 w-[25%]" />
                  </div>
                </div>

              </div>

              {/* Bottom Row: Average Ratings & Online Listings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Average Ratings */}
                <div className={`p-5 rounded-2xl ${theme.classes.subCard} shadow-xs`}>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block mb-3">
                    Average Ratings
                  </span>
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center space-x-1.5">
                      <MaterialIcon name="star" size={20} filled className="text-amber-400" />
                      <span className="text-3xl font-black text-slate-900 dark:text-white">4.9</span>
                    </div>
                    <span className="text-xs font-black text-[#273338] bg-[#9CB080] px-2.5 py-0.5 rounded-full">
                      Top Rated
                    </span>
                  </div>

                  {/* 5-Star Distribution Bars */}
                  <div className="space-y-1.5">
                    {[
                      { star: '5 Stars', pct: 85 },
                      { star: '4 Stars', pct: 60 },
                      { star: '3 Stars', pct: 20 },
                      { star: '2 Stars', pct: 10 },
                      { star: '1 Star', pct: 4 },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center text-xs space-x-2">
                        <span className="w-14 text-[11px] text-slate-500 dark:text-slate-300 font-medium">{item.star}</span>
                        <div className={`flex-1 ${theme.classes.divider} h-2 rounded-full overflow-hidden`}>
                          <div className="h-full bg-[#9CB080] rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Online Listings Breakdown */}
                <div className={`p-5 rounded-2xl ${theme.classes.subCard} shadow-xs flex flex-col justify-between`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Online Listings
                  </span>

                  <div className="flex items-center justify-between py-2">
                    {/* Donut Chart Visualization with Palette Colors */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-white/10"
                          strokeWidth="5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#2B5748]"
                          strokeDasharray="65, 100"
                          strokeWidth="5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-[#9CB080]"
                          strokeDasharray="20, 100"
                          strokeDashoffset="-65"
                          strokeWidth="5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-xs font-black text-slate-900 dark:text-white">85%</span>
                    </div>

                    {/* Legend */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#2B5748]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Live (65%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#9CB080]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Processing (20%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-xs bg-[#618764]" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Opted Out (10%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Unavailable (5%)</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
