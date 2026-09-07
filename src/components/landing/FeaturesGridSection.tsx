import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'
import { theme } from '@/theme'

const features = [
  {
    iconName: 'chat',
    title: 'CRM, pipelines & unified conversations',
    description:
      'Track every buyer and seller from first inquiry to closing day while keeping every text, email, call, social message and website chat connected to their record. Give agents, teams and brokerages complete visibility into every opportunity, conversation and next step.',
  },
  {
    iconName: 'smart_toy',
    title: 'AI-powered conversations',
    description:
      "Never miss a lead because you're at a showing, meeting with clients or negotiating a contract. AI can answer calls, respond to texts, engage website visitors and keep conversations moving 24/7.",
  },
  {
    iconName: 'account_tree',
    title: 'Workflow automation',
    description:
      'Automatically send follow-ups, appointment reminders, nurture campaigns and transaction updates based on where buyers and sellers are in their journey. Stay top of mind without adding more to your day.',
  },
  {
    iconName: 'domain',
    title: 'Property & transaction management with Custom Objects',
    description:
      'Create custom property records that automatically connect to buyer and seller contacts. Capture contact and property information from a single form, manage buyer-to-property and seller-to-property relationships, and trigger personalized notifications for everyone involved.',
  },
  {
    iconName: 'dashboard',
    title: 'Website, funnel & landing page builder',
    description:
      'Launch listing pages, property funnels, home valuation campaigns and open house registration pages in minutes. Every lead flows directly into your CRM, conversations and automations.',
  },
  {
    iconName: 'star',
    title: 'Reputation management',
    description:
      'Automatically request reviews after successful closings, monitor feedback and build a reputation that generates more referrals, repeat business and new listings.',
  },
]

export function FeaturesGridSection() {
  return (
    <section id="features" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              POWERFUL CAPABILITIES
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Engineered for Modern Real Estate Closers
            </h2>
          </ScrollReveal>
        </div>

        {/* 6-Card Features Grid (Plain Solid Colors) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feat, index) => {
            return (
              <ScrollReveal key={index} direction="up" delay={150 + index * 80}>
                <div className={`group h-full relative rounded-2xl ${theme.classes.card} p-8 shadow-md hover:border-[#9CB080] transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between`}>
                  <div className="space-y-5">
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] flex items-center justify-center text-[#2B5748] dark:text-[#9CB080] group-hover:scale-105 group-hover:bg-[#9CB080] group-hover:text-[#273338] transition-all duration-300 shadow-xs">
                      <MaterialIcon name={feat.iconName} size={24} />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
                      {feat.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
                      {feat.description}
                    </p>
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
