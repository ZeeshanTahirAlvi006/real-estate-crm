import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'
import { theme } from '@/theme'

const testimonials = [
  {
    quote:
      "PropPulse OS completely revolutionized our speed-to-lead. The AI responder contacts new Zillow and website inquiries within 2 seconds. Our appointment bookings surged by 180% in our first 60 days.",
    author: 'David Sterling',
    role: 'Managing Broker & Team Lead',
    brokerage: 'Sterling Premier Realty, Austin TX',
    dealVolume: '$42M Annual Volume',
    rating: 5,
  },
  {
    quote:
      "Replacing 5 separate subscriptions—our dialer, CRM, funnel builder, e-sign, and email automation—into one PropPulse dashboard saved us over $1,200 every month while keeping our agents focused.",
    author: 'Sarah Chen-Miller',
    role: 'Principal Broker',
    brokerage: 'Skyline Capital Estates, Seattle WA',
    dealVolume: '85 Closed Transactions/yr',
    rating: 5,
  },
  {
    quote:
      "The custom transaction objects and automated closing workflows mean none of our client deals fall through the cracks. It's the most powerful system built specifically for top producers.",
    author: 'Marcus Vance',
    role: 'Brokerage Owner',
    brokerage: 'Vance & Associates Commercial & Residential',
    dealVolume: '$65M Pipeline Managed',
    rating: 5,
  },
]

const badges = [
  { term: 'WINTER 2026', title: 'Easiest To Use', category: 'ENTERPRISE' },
  { term: 'SPRING 2026', title: 'Best Usability', category: 'MID-MARKET' },
  { term: 'SPRING 2026', title: 'Easiest To Do Business With', category: 'ENTERPRISE' },
  { term: 'SPRING 2026', title: 'Highest User Adoption', category: 'ENTERPRISE' },
  { term: 'SPRING 2026', title: 'Leader', category: 'ENTERPRISE' },
]

export function SocialProofSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const prev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))
  }

  const next = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1))
  }

  const active = testimonials[currentIndex]

  return (
    <section id="testimonials" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              SOCIAL PROOF
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Join the real estate professionals growing with PropPulse
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={300}>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
              Straight talk from PropPulse users who stopped losing leads and started filling their schedule.
            </p>
          </ScrollReveal>
        </div>

        {/* Testimonials Interactive Carousel with Left/Right Nav */}
        <ScrollReveal direction="up" delay={350}>
          <div className="relative max-w-4xl mx-auto mb-16">

            {/* Left Nav Button */}
            <button
              onClick={prev}
              aria-label="Previous testimonial"
              className={`absolute -left-4 sm:-left-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full ${theme.classes.card} text-slate-800 dark:text-white flex items-center justify-center hover:bg-[#9CB080] hover:text-[#273338] transition-all shadow-md cursor-pointer`}
            >
              <MaterialIcon name="chevron_left" size={24} />
            </button>

            {/* Right Nav Button */}
            <button
              onClick={next}
              aria-label="Next testimonial"
              className={`absolute -right-4 sm:-right-12 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full ${theme.classes.card} text-slate-800 dark:text-white flex items-center justify-center hover:bg-[#9CB080] hover:text-[#273338] transition-all shadow-md cursor-pointer`}
            >
              <MaterialIcon name="chevron_right" size={24} />
            </button>

            {/* Testimonial Card (Plain Solid Colors) */}
            <div className={`rounded-3xl ${theme.classes.card} p-8 sm:p-12 shadow-xl text-center relative overflow-hidden`}>
              <MaterialIcon name="format_quote" size={48} className="text-[#2B5748] dark:text-[#9CB080] mx-auto mb-4" />

              {/* Star Rating */}
              <div className="flex justify-center space-x-1 mb-6">
                {[...Array(active.rating)].map((_, i) => (
                  <MaterialIcon key={i} name="star" size={20} filled className="text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-lg sm:text-2xl text-slate-900 dark:text-white font-medium italic leading-relaxed max-w-2xl mx-auto mb-8">
                "{active.quote}"
              </blockquote>

              {/* Author Info */}
              <div>
                <p className="text-base font-bold text-slate-900 dark:text-white tracking-wide">
                  {active.author}
                </p>
                <p className="text-xs sm:text-sm text-[#2B5748] dark:text-[#9CB080] font-bold mt-0.5">
                  {active.role} | {active.brokerage}
                </p>
                <span className="inline-block mt-3 px-3 py-1 rounded-full bg-[#a8712e] text-white text-xs font-black">
                  {active.dealVolume}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500 dark:text-slate-300 max-w-2xl mx-auto mt-6 italic">
              *Results described are individual experiences and may not be typical. Your results will vary based on your business, effort, market conditions and other factors.
            </p>
          </div>
        </ScrollReveal>

        {/* 5 G2 Industry Recognition Badges */}
        <ScrollReveal direction="up" delay={500}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className={`rounded-xl ${theme.classes.subCard} p-4 text-center shadow-md transform hover:-translate-y-1 transition-all duration-300`}
              >
                <div className="flex items-center justify-center space-x-1 text-[9px] font-black text-slate-500 dark:text-slate-300 tracking-wider mb-2">
                  <span>{badge.term}</span>
                  <span className="w-3.5 h-3.5 rounded-xs bg-[#f15a24] text-white flex items-center justify-center text-[8px] font-bold">
                    G
                  </span>
                </div>

                <div className="my-2">
                  <p className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                    {badge.title}
                  </p>
                </div>

                <p className={`text-[9px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-widest pt-2 border-t ${theme.classes.divider}`}>
                  {badge.category}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

      </div>
    </section>
  )
}
