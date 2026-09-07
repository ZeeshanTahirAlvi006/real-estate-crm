import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'

export function GenericVsPropPulseSection() {
  return (
    <section className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Outer Container with Peeking Robot */}
        <div className="relative max-w-5xl mx-auto">

          {/* Peeking 3D Robot AI Mascot */}
          <div className="absolute -top-24 sm:-top-32 left-4 sm:left-12 z-20 w-28 h-28 sm:w-36 sm:h-36 pointer-events-none drop-shadow-xl">
            <img
              src="/images/landing/ai_robot_mascot.jpg"
              alt="PropPulse AI Assistant"
              className="w-full h-full object-contain rounded-2xl border-2 border-[#9CB080] shadow-md"
            />
          </div>

          {/* Main Card Container (Plain Solid Colors) */}
          <ScrollReveal direction="up" delay={200}>
            <div className={`rounded-3xl border-2 border-[#618764] bg-white dark:bg-[#2B5748] p-8 sm:p-14 shadow-xl relative overflow-hidden`}>

              {/* Header inside Card */}
              <div className="text-center max-w-2xl mx-auto mb-14 pt-6 space-y-3">
                <span className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
                  PROPPULSE VS GENERIC TOOLS
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                  Why real estate professionals choose PropPulse over generic marketing tools
                </h2>
              </div>

              {/* 3 Comparison Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">

                {/* Column 1 */}
                <div className="space-y-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-[#618764] text-white flex items-center justify-center shadow-xs">
                    <MaterialIcon name="bolt" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Built for speed-to-lead, not just contact storage
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                    Most CRMs let you organize contacts. PropPulse is designed to help you capture them, follow up instantly and nurture them automatically so you never lose a deal to a slow response.
                  </p>
                </div>

                {/* Column 2 */}
                <div className="space-y-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-[#618764] text-white flex items-center justify-center shadow-xs">
                    <MaterialIcon name="layers" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    One platform could replace your entire tech stack
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                    Your CRM, funnels, email, SMS, calendars, automation, reputation management and payments all live in one place so you can cancel the subscriptions draining your budget.
                  </p>
                </div>

                {/* Column 3 */}
                <div className="space-y-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-[#618764] text-white flex items-center justify-center shadow-xs">
                    <MaterialIcon name="sync" size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    Designed for closers, not IT departments
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                    Everything is drag-and-drop, ready to launch and backed by 24/7 support so you spend time selling properties instead of troubleshooting software.
                  </p>
                </div>

              </div>

            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  )
}
