import React, { useState } from 'react'
import {
  SparklesIcon,
  PhoneIcon,
  DocumentChartBarIcon,
  GiftIcon,
  HomeModernIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { useAppDispatch } from '@/store/hooks'
import { openDialer, startDialingSession } from '@/store/slices/dialerSlice'
import { MicroCmaModal } from './MicroCmaModal'
import { toast } from 'sonner'

interface SellerRadarLead {
  id: string
  name: string
  phone: string
  address: string
  propensityScore: number
  estimatedValue: number
  equityAmount: number
  yearsOwned: number
  mortgageRate: string
  keySignal: string
}

const mockSellerRadarLeads: SellerRadarLead[] = [
  {
    id: 's-1',
    name: 'Robert & Patricia Vance',
    phone: '+1 (555) 849-2041',
    address: '1420 Highland Ave, Austin TX 78703',
    propensityScore: 96,
    estimatedValue: 840000,
    equityAmount: 520000,
    yearsOwned: 9.2,
    mortgageRate: '3.12%',
    keySignal: '10-Yr Purchase Anniversary • Empty Nester Signal • 62% Equity',
  },
  {
    id: 's-2',
    name: 'Marcus Sterling',
    phone: '+1 (555) 712-9034',
    address: '890 Barton Springs Rd, Austin TX 78704',
    propensityScore: 92,
    estimatedValue: 1150000,
    equityAmount: 780000,
    yearsOwned: 7.8,
    mortgageRate: '3.35%',
    keySignal: 'High Appreciation Zone (+38%) • Equity Peak Indicator',
  },
  {
    id: 's-3',
    name: 'Elena Rostova',
    phone: '+1 (555) 438-1920',
    address: '3204 Westlake Dr, Austin TX 78746',
    propensityScore: 89,
    estimatedValue: 1450000,
    equityAmount: 990000,
    yearsOwned: 11.4,
    mortgageRate: '2.87%',
    keySignal: 'Free & Clear Equity (68%) • Upsizing Inquiries on Zillow',
  },
  {
    id: 's-4',
    name: 'David & Karen Miller',
    phone: '+1 (555) 902-3341',
    address: '512 Oak Ridge Trail, Round Rock TX 78681',
    propensityScore: 85,
    estimatedValue: 560000,
    equityAmount: 310000,
    yearsOwned: 6.5,
    mortgageRate: '3.75%',
    keySignal: 'Relocation Tax Registry Match • School District Change',
  },
]

export const SellerRadarTab: React.FC = () => {
  const dispatch = useAppDispatch()
  const [selectedCmaLead, setSelectedCmaLead] = useState<SellerRadarLead | null>(null)
  const [isCmaOpen, setIsCmaOpen] = useState(false)

  const handleCallLead = (lead: SellerRadarLead) => {
    dispatch(openDialer({ lineCount: 1 }))
    dispatch(
      startDialingSession({
        targets: [
          {
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
          },
        ],
      })
    )
  }

  const handleOpenCma = (lead: SellerRadarLead) => {
    setSelectedCmaLead(lead)
    setIsCmaOpen(true)
  }

  const handleSendAnniversaryUpdate = (lead: SellerRadarLead) => {
    toast.success(`Home Anniversary Equity Update dispatched via SMS & Email to ${lead.name}`)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-primary via-chart-3 to-chart-2 text-primary-foreground shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
            <SparklesIcon className="w-4 h-4" />
            <span>AI Predictive Equity Scanner</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            Predictive "Seller Radar" & Equity Engine
          </h2>
          <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
            Continuously scans public tax registries, mortgage lock-in rates, and length-of-tenure data to flag homeowners with high statistical probability of selling within 6–12 months.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
            <span className="text-[11px] text-white/80 block uppercase font-bold">Identified Targets</span>
            <span className="text-2xl font-black font-mono">14 Homeowners</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-2xl text-center">
            <span className="text-[11px] text-white/80 block uppercase font-bold">Total Trapped Equity</span>
            <span className="text-2xl font-black font-mono text-emerald-300">$6.4M</span>
          </div>
        </div>
      </div>

      {/* Seller Radar Cards Grid */}
      <div className="space-y-4">
        {mockSellerRadarLeads.map((lead) => (
          <div
            key={lead.id}
            className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs hover:border-primary/40 transition-all space-y-4"
          >
            {/* Top Row: Info & Score */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-base border border-primary/20">
                  <HomeModernIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-foreground">{lead.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">({lead.phone})</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{lead.address}</p>
                </div>
              </div>

              {/* Propensity Score Badge */}
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl">
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                <div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {lead.propensityScore}% Propensity
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Predicted Listing Probability</span>
                </div>
              </div>
            </div>

            {/* Financial & Equity Stats Pill Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Est. Market Value</span>
                <span className="font-extrabold text-foreground text-sm font-mono">
                  ${lead.estimatedValue.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Net Home Equity</span>
                <span className="font-extrabold text-emerald-500 text-sm font-mono">
                  +${lead.equityAmount.toLocaleString()}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Tenure / Ownership</span>
                <span className="font-bold text-foreground text-sm font-mono">
                  {lead.yearsOwned} Years
                </span>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Locked Mortgage Rate</span>
                <span className="font-bold text-primary text-sm font-mono">
                  {lead.mortgageRate} fixed
                </span>
              </div>
            </div>

            {/* Signals and Trigger Actions */}
            <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                <CheckBadgeIcon className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">{lead.keySignal}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendAnniversaryUpdate(lead)}
                  className="text-xs h-8"
                >
                  <GiftIcon className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  Anniversary Equity SMS
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCma(lead)}
                  className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <DocumentChartBarIcon className="w-3.5 h-3.5 mr-1" />
                  Generate Micro-CMA
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleCallLead(lead)}
                  className="text-xs h-8 shadow-xs"
                >
                  <PhoneIcon className="w-3.5 h-3.5 mr-1" />
                  Call Homeowner
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Micro-CMA Modal */}
      <MicroCmaModal
        open={isCmaOpen}
        onOpenChange={setIsCmaOpen}
        leadData={selectedCmaLead}
      />
    </div>
  )
}
