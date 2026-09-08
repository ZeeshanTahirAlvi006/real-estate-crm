import { useState, useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal.tsx'
import { theme } from '@/theme'

interface HeroSectionProps {
  onOpenSignup: () => void
}

export function HeroSection({ onOpenSignup }: HeroSectionProps) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20
      const y = (e.clientY / window.innerHeight - 0.5) * 20
      setMouseOffset({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <section id="hero" className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <ScrollReveal direction="down" delay={100}>
              <div className={`inline-flex items-center px-4 py-1.5 rounded-full ${theme.classes.badgeAccent} text-xs tracking-widest uppercase shadow-xs`}>
                <span>ALL-IN-ONE CRM PLATFORM</span>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                The only CRM <br className="hidden sm:inline" />
                <span className="text-[#2B5748] dark:text-[#9CB080]">
                  real estate
                </span> <br />
                professionals need
              </h1>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={300}>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-200 max-w-xl font-normal leading-relaxed">
                Stop losing leads to slow follow-ups. PropPulse OS gives you everything to capture prospects, nurture relationships and close deals.
              </p>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={400}>
              <div className="space-y-3 pt-2">
                <button
                  onClick={onOpenSignup}
                  className={`group inline-flex items-center justify-center text-sm sm:text-base px-8 py-4 rounded-xl ${theme.classes.btnPrimary} shadow-lg active:scale-95`}
                >
                  <span>Start your FREE 14-day trial</span>
                  <MaterialIcon name="arrow_forward" size={20} className="ml-2.5 transition-transform group-hover:translate-x-1" />
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">
                  No long-term contracts. Cancel anytime.
                </p>
              </div>
            </ScrollReveal>

            {/* Quick Feature Badges */}
            <ScrollReveal direction="up" delay={500}>
              <div className="flex flex-wrap gap-4 pt-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                <div className="flex items-center space-x-1.5">
                  <MaterialIcon name="check_circle" size={16} filled className="text-[#2B5748] dark:text-[#9CB080]" />
                  <span>Instant Speed-to-Lead</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MaterialIcon name="check_circle" size={16} filled className="text-[#2B5748] dark:text-[#9CB080]" />
                  <span>AI Automated Calling & SMS</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <MaterialIcon name="check_circle" size={16} filled className="text-[#2B5748] dark:text-[#9CB080]" />
                  <span>No Setup Fees</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right Hero Interactive Floating Dashboard Preview */}
          <div className="lg:col-span-6 relative">
            <ScrollReveal direction="left" delay={300}>
              <div
                className="relative mx-auto max-w-lg transition-transform duration-500 ease-out"
                style={{
                  transform: `translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`,
                }}
              >
                {/* Floating Deal Closed Badge */}
                <div className="absolute -top-5 left-4 z-20 flex items-center px-4 py-2 rounded-full bg-[#202B2F] border border-[#9CB080] shadow-lg">
                  <span className="text-xs font-bold text-white">Deal closed: $4,200</span>
                </div>

                {/* Dashboard Outer Card (Plain Solid Colors) */}
                <div className={`rounded-2xl ${theme.classes.card} p-5 sm:p-6 shadow-xl text-slate-900 dark:text-white`}>

                  {/* Dashboard Header Bar */}
                  <div className={`flex items-center justify-between pb-4 border-b ${theme.classes.border}`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider block">WORKSPACE</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white">Real Estate CRM</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-[#618764] px-3 py-1 rounded-full text-white">
                      <div className="w-5 h-5 rounded-full bg-[#2B5748] text-white flex items-center justify-center text-[10px] font-bold">
                        SJ
                      </div>
                      <span className="text-xs font-bold text-white">Sara Johnson</span>
                    </div>
                  </div>

                  {/* 4 Metric KPI Cards */}
                  <div className="grid grid-cols-4 gap-2.5 py-4">
                    <div className={`p-2.5 rounded-xl ${theme.classes.subCard} shadow-xs text-center`}>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-300 uppercase">ACTIVE</p>
                      <p className="text-lg font-black text-[#618764] dark:text-[#9CB080] mt-0.5">320</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${theme.classes.subCard} shadow-xs text-center`}>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-300 uppercase">CLOSINGS</p>
                      <p className="text-lg font-black text-[#2B5748] dark:text-[#9CB080] mt-0.5">25</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${theme.classes.subCard} shadow-xs text-center`}>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-300 uppercase">SHOWINGS</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">200</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${theme.classes.subCard} shadow-xs text-center`}>
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-300 uppercase">REVENUE</p>
                      <p className="text-lg font-black text-[#2B5748] dark:text-[#9CB080] mt-0.5">$5M</p>
                    </div>
                  </div>

                  {/* Lead Pipeline Live Feed */}
                  <div className="space-y-2 py-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">LEAD PIPELINE</p>
                    <div className={`flex items-center justify-between p-2.5 rounded-lg ${theme.classes.subCard} shadow-xs`}>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#618764] text-white flex items-center justify-center text-xs font-bold">
                          MR
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Michael Rodriguez</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-300">Buyer: luxury townhouse</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#618764] text-white">
                        New Lead
                      </span>
                    </div>

                    <div className={`flex items-center justify-between p-2.5 rounded-lg ${theme.classes.subCard} shadow-xs`}>
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#9CB080] text-[#273338] flex items-center justify-center text-xs font-bold">
                          JD
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Jennifer Davis</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-300">Listing: family home</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#9CB080] text-[#273338]">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Conversions 30 Days Bar Graph */}
                  <div className={`pt-3 border-t ${theme.classes.border}`}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-600 dark:text-slate-200">Conversions (30 days)</span>
                      <span className="text-[#2B5748] dark:text-[#9CB080] font-bold hover:underline cursor-pointer text-[11px]">View report</span>
                    </div>
                    {/* Solid Plain Color Bar Graph Chart */}
                    <div className="flex items-end justify-between h-14 pt-2 px-1">
                      {[35, 45, 30, 60, 50, 40, 75, 65, 80, 70, 95, 100].map((val, idx) => (
                        <div
                          key={idx}
                          className="w-2.5 sm:w-3 rounded-t-sm bg-[#9CB080] hover:bg-[#8CA070] transition-all duration-300"
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </div>
    </section>
  )
}
