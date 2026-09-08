import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal'
import { theme } from '@/theme'

interface PricingSectionProps {
  onSelectPlan: (plan: string) => void
}

const plans = [
  {
    name: 'Starter',
    price: '$97',
    period: '/Month',
    subhead: 'Perfect for freelancers & solo marketers',
    isPopular: false,
    features: [
      '3 Sub-Accounts',
      'Unlimited Contacts',
      'Unlimited Users',
      '24/7 Support',
      'All Core Features',
    ],
    buttonText: 'Start Your Trial',
    buttonClass: 'bg-[#618764] hover:bg-[#527355] text-white font-bold shadow-md',
  },
  {
    name: 'Unlimited',
    price: '$297',
    period: '/Month',
    subhead: 'Built for growing agencies',
    isPopular: true,
    features: [
      'Everything in Starter Plan and...',
      'Unlimited Sub-Accounts',
      'Rebill Phone & Email (no markup)',
      'Basic API Access',
    ],
    buttonText: 'Start Your Trial',
    buttonClass: 'bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-black shadow-md',
  },
  {
    name: 'Agency Pro',
    price: '$497',
    period: '/Month',
    subhead: 'Ideal for SaaS-PRENEURs & Agencies looking to go SaaS',
    isPopular: false,
    features: [
      'Everything in Unlimited Plan and...',
      'SaaS Mode',
      'Automated Sub-Account Creation',
      'Rebill Phone & Email with Markup',
      'User/Agent Reporting',
      'Advanced API Access',
    ],
    buttonText: 'Start Your Trial',
    buttonClass: 'bg-[#618764] hover:bg-[#527355] text-white font-bold shadow-md',
  },
]

export function PricingSection({ onSelectPlan }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              PRICING
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Simple pricing. Serious marketing power.
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={300}>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-200 font-normal leading-relaxed">
              Claim your 14-day free trial to experience PropPulse before you commit.
            </p>
          </ScrollReveal>
        </div>

        {/* 3 Pricing Cards Grid (Plain Solid Colors) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, index) => (
            <ScrollReveal
              key={index}
              direction="up"
              delay={200 + index * 120}
              className="flex"
            >
              <div
                className={`relative w-full rounded-2xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 ${plan.isPopular
                    ? 'border-2 border-[#9CB080] bg-white dark:bg-[#202B2F] shadow-xl lg:-translate-y-2 z-10'
                    : `border ${theme.classes.border} bg-white dark:bg-[#2B5748] shadow-md`
                  }`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-md bg-[#9CB080] text-[#273338] text-[11px] font-black uppercase tracking-wider shadow-md">
                    MOST POPULAR
                  </div>
                )}

                <div>
                  {/* Plan Pill Name */}
                  <div className="text-center mb-4">
                    <span className="inline-block px-4 py-1 rounded-full text-xs font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#618764]/40 border border-[#D8E2D6] dark:border-[#618764]">
                      {plan.name}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-3">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-300 font-medium">
                      {plan.period}
                    </span>
                  </div>

                  {/* Subhead */}
                  <p className="text-xs sm:text-sm text-center text-slate-600 dark:text-slate-300 min-h-10 mb-8 font-normal">
                    {plan.subhead}
                  </p>

                  <div className={`w-full h-px ${theme.classes.divider} mb-8`} />

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 text-xs sm:text-sm">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start space-x-3 text-slate-700 dark:text-slate-200">
                        <MaterialIcon name="check" size={16} className="text-[#2B5748] dark:text-[#9CB080] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="space-y-3 text-center pt-4">
                  <button
                    onClick={() => onSelectPlan(plan.name)}
                    className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer active:scale-95 ${plan.buttonClass}`}
                  >
                    {plan.buttonText}
                  </button>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Experience it for 14 Days FREE
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Billing Footnote */}
        <p className="text-[11px] text-center text-slate-500 dark:text-slate-300 max-w-2xl mx-auto mt-10 italic">
          *Credit card required. You'll be auto-charged at your selected plan rate when the trial ends unless you cancel. Cancel anytime in account settings.
        </p>

      </div>
    </section>
  )
}
