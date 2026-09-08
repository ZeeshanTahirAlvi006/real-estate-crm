import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'
import { theme } from '@/theme'

const steps = [
  {
    step: '01',
    badge: 'Pipeline',
    badgeClass: 'bg-[#618764] text-white border-[#618764]',
    image: '/images/landing/how_it_works_lead_capture.jpg',
    iconName: 'filter_alt',
    iconBg: 'bg-[#618764] text-white',
    title: 'Capture more leads',
    description:
      'Generate buyer and seller leads through listing pages, home valuation funnels, open house registrations and website forms. Every inquiry is automatically organized and routed for immediate follow-up.',
  },
  {
    step: '02',
    badge: 'AI replied in 2s',
    badgeClass: 'bg-[#9CB080] text-[#273338] border-[#9CB080]',
    image: '/images/landing/how_it_works_follow_up.jpg',
    iconName: 'chat_bubble',
    iconBg: 'bg-[#9CB080] text-[#273338]',
    title: 'Automate your follow-up',
    description:
      'Keep buyers and sellers engaged with personalized texts, emails, voicemail drops and appointment reminders that run automatically while you focus on serving clients.',
  },
  {
    step: '03',
    badge: 'Deal closed: $4,200',
    badgeClass: 'bg-[#2B5748] text-white border-[#2B5748]',
    image: '/images/landing/how_it_works_close_deals.jpg',
    iconName: 'attach_money',
    iconBg: 'bg-[#2B5748] text-white',
    title: 'Close more deals',
    description:
      'When every lead is tracked, every conversation is visible and every follow-up happens on time, you create a predictable system for winning more listings, closing more transactions and growing your market share.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              HOW IT WORKS
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Three steps to running a more efficient real estate business
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={300}>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
              From first inquiry to closing day, PropPulse helps you create a repeatable process that scales with your business.
            </p>
          </ScrollReveal>
        </div>

        {/* 3 Step Cards Grid (Plain Solid Colors) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((item, index) => {
            return (
              <ScrollReveal key={index} direction="up" delay={200 + index * 120}>
                <div className={`h-full rounded-2xl ${theme.classes.card} overflow-hidden shadow-md hover:border-[#9CB080] transition-all duration-300 flex flex-col group hover:-translate-y-1`}>

                  {/* Image Container with Floating Badge */}
                  <div className="relative h-60 w-full overflow-hidden bg-slate-900">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Floating Pill Badge */}
                    {/* <div
                      className={`absolute top-3 right-3 z-10 flex items-center px-3 py-1 rounded-full text-xs font-black shadow-md ${item.badgeClass}`}
                    >
                      <span>{item.badge}</span>
                    </div> */}
                  </div>

                  {/* Text Content */}
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Icon & Title */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-xs ${item.iconBg}`}>
                          <MaterialIcon name={item.iconName} size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {item.title}
                        </h3>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                </div>
              </ScrollReveal>
            )
          })}
        </div>

      </div>
    </section>
  )
}
