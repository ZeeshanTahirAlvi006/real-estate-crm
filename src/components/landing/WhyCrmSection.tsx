import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal.tsx'

export function WhyCrmSection() {
  return (
    <section id="why-crm" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-bold tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              WHY YOU NEED A CRM
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Your real estate business is losing opportunities every day
            </h2>
          </ScrollReveal>
        </div>

        {/* 2-Column Side-by-Side Comparison (Problems vs Solutions) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">

          {/* PROBLEMS CARD */}
          <ScrollReveal direction="right" delay={300}>
            <div className="h-full rounded-2xl border border-rose-400/40 dark:border-rose-500/40 bg-white dark:bg-[#2B5748] p-8 shadow-md hover:border-rose-500 transition-all duration-300">
              <div className="flex items-center space-x-2.5 mb-8">
                <span className="p-2 rounded-lg bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center">
                  <MaterialIcon name="warning" size={18} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-rose-500 dark:text-rose-300">
                  PROBLEMS
                </span>
              </div>

              <div className="space-y-6 text-sm sm:text-base text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <p>
                    Every missed call is a buyer who called another agent.
                  </p>
                </div>

                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <p>
                    Buyer, seller and property information lives across multiple tools, spreadsheets and inboxes.
                  </p>
                </div>

                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-center text-xs font-bold">
                    ✕
                  </span>
                  <p>
                    Manual follow-up and administrative work eat into the time you should be spending on showings, negotiations and closings.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* SOLUTIONS CARD (Theme Accent) */}
          <ScrollReveal direction="left" delay={400}>
            <div className="h-full rounded-2xl border-2 border-[#9CB080] bg-white dark:bg-[#2B5748] p-8 shadow-md transition-all duration-300">
              <div className="flex items-center space-x-2.5 mb-8">
                <span className="p-2 rounded-lg bg-[#9CB080] text-[#273338] flex items-center justify-center">
                  <MaterialIcon name="check_circle" size={18} filled />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-[#273338] dark:text-[#9CB080]">
                  SOLUTIONS
                </span>
              </div>

              <div className="space-y-6 text-sm sm:text-base text-slate-700 dark:text-white font-normal leading-relaxed">
                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-[#9CB080] text-[#273338] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <p>
                    Capture, assign and follow up with every lead the moment they come in.
                  </p>
                </div>

                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-[#9CB080] text-[#273338] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <p>
                    Keep contacts, conversations, properties and transactions organized in one platform.
                  </p>
                </div>

                <div className="flex items-start space-x-3.5">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-[#9CB080] text-[#273338] flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <p>
                    Automate repetitive tasks so you can spend less time managing data and more time generating commissions.
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
