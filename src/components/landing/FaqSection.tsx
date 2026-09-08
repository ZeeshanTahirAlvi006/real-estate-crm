import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { ScrollReveal } from '@/hooks/useScrollReveal.tsx'
import { theme } from '@/theme'

const faqs = [
  {
    question: 'What is PropPulse OS?',
    answer:
      'PropPulse OS is an all-in-one real estate execution platform and autonomous CRM designed specifically for agents, brokerages, and property managers. It unifies lead capture, automated omni-channel follow-up (AI calling, SMS, email), full pipeline transactions, e-signatures, commission tracking, and client portal experiences into a single synchronized dashboard.',
  },
  {
    question: 'What tools does PropPulse replace?',
    answer:
      'PropPulse OS replaces your standalone CRM (like Follow Up Boss or Salesforce), dialer & VoIP systems, SMS marketing software, funnel and landing page builders, email marketing tools (like Mailchimp or ActiveCampaign), calendar schedulers (Calendly), document e-signing tools (DocuSign), and review management platforms.',
  },
  {
    question: 'Can I white-label PropPulse and sell it as my own platform?',
    answer:
      'Yes! With our Agency Pro plan, you can completely white-label PropPulse OS under your own brokerage brand, custom domain, and company logo. You can create automated sub-accounts for your agents, team members, or client brokerages with customized pricing and feature access.',
  },
  {
    question: 'How does PropPulse help me manage multiple client accounts?',
    answer:
      'Our multi-tenant architecture lets you manage unlimited agents, teams, or client portfolios with role-based permissions (Brokerage Owner, Agent, Business Lead, Super Admin). You can switch workspaces seamlessly with isolated data privacy and unified administrative reporting.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Absolutely! We offer a 14-day risk-free trial with full access to all core features, pipeline management, AI conversational agents, and marketing tools. You can set up your workspace, import existing leads, and close deals before ever paying a dime.',
  },
  {
    question: 'Does PropPulse offer support if I get stuck?',
    answer:
      'Yes, our team provides 24/7 live concierge chat and ticketing support, comprehensive video onboarding walkthroughs, daily live Q&A webinars, and extensive documentation to ensure you and your team are set up for massive success.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-24 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-3">
          <ScrollReveal direction="down" delay={100}>
            <p className="text-xs sm:text-sm font-black tracking-widest text-[#2B5748] dark:text-[#9CB080] uppercase">
              FAQ
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Got questions? We got answers.
            </h2>
          </ScrollReveal>
        </div>

        {/* 6 Accordion Cards (Plain Solid Colors) */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <ScrollReveal key={index} direction="up" delay={150 + index * 60}>
                <div
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? 'border-2 border-[#9CB080] bg-white dark:bg-[#202B2F] shadow-md'
                      : `border ${theme.classes.border} bg-white dark:bg-[#2B5748] hover:border-[#9CB080]`
                  }`}
                >
                  <button
                    onClick={() => toggle(index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between space-x-4 cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                      {faq.question}
                    </span>
                    <span
                      className={`p-1.5 rounded-lg border border-[#D8E2D6] dark:border-[#618764] transition-transform duration-300 flex items-center justify-center ${
                        isOpen ? 'transform rotate-180 bg-[#9CB080] text-[#273338]' : 'bg-slate-100 dark:bg-[#202B2F] text-slate-700 dark:text-white'
                      }`}
                    >
                      <MaterialIcon name="expand_more" size={20} />
                    </span>
                  </button>

                  {isOpen && (
                    <div className={`px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-slate-600 dark:text-slate-200 font-normal leading-relaxed border-t ${theme.classes.divider} animate-fadeIn`}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )
          })}
        </div>

      </div>
    </section>
  )
}
