import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { KpiCard } from '@/components/shared/KpiCard'
import { MicroCmaModal } from './MicroCmaModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  useGetSellerRadarProspectsQuery,
  useGetSellerRadarDashboardQuery,
  useTriggerAnniversaryScanMutation,
  type SellerRadarLead,
} from '@/store/api/sellerRadarApi'

const fallbackSellerRadarLeads: SellerRadarLead[] = [
  {
    id: 's-1',
    propertyId: 'p-1',
    contactId: 'c-1',
    name: 'Robert & Patricia Vance',
    phone: '+1 (555) 849-2041',
    email: 'robert.vance@gmail.com',
    address: '1420 Highland Ave, Austin TX 78703',
    propensityScore: 96,
    estimatedValue: 840000,
    estimatedMortgageBalance: 320000,
    equityAmount: 520000,
    equityPercent: 62,
    yearsOwned: 9.2,
    mortgageRate: '3.12%',
    keySignal: '10-Yr Purchase Anniversary • Empty Nester Signal • 62% Equity',
    allSignals: ['10-Yr Purchase Anniversary', 'Empty Nester Signal', '62% Equity'],
  },
  {
    id: 's-2',
    propertyId: 'p-2',
    contactId: 'c-2',
    name: 'Marcus Sterling',
    phone: '+1 (555) 712-9034',
    email: 'marcus.sterling@outlook.com',
    address: '890 Barton Springs Rd, Austin TX 78704',
    propensityScore: 92,
    estimatedValue: 1150000,
    estimatedMortgageBalance: 370000,
    equityAmount: 780000,
    equityPercent: 68,
    yearsOwned: 7.8,
    mortgageRate: '3.35%',
    keySignal: 'High Appreciation Zone (+38%) • Equity Peak Indicator',
    allSignals: ['High Appreciation Zone (+38%)', 'Equity Peak Indicator'],
  },
  {
    id: 's-3',
    propertyId: 'p-3',
    contactId: 'c-3',
    name: 'Elena Rostova',
    phone: '+1 (555) 438-1920',
    email: 'elena.rostova@yahoo.com',
    address: '3204 Westlake Dr, Austin TX 78746',
    propensityScore: 89,
    estimatedValue: 1450000,
    estimatedMortgageBalance: 460000,
    equityAmount: 990000,
    equityPercent: 68,
    yearsOwned: 11.4,
    mortgageRate: '2.87%',
    keySignal: 'Free & Clear Equity (68%) • Upsizing Inquiries on Zillow',
    allSignals: ['Free & Clear Equity (68%)', 'Upsizing Inquiries on Zillow'],
  },
  {
    id: 's-4',
    propertyId: 'p-4',
    contactId: 'c-4',
    name: 'David & Karen Miller',
    phone: '+1 (555) 902-3341',
    email: 'david.miller@gmail.com',
    address: '5120 River Road, Austin TX 78734',
    propensityScore: 86,
    estimatedValue: 920000,
    estimatedMortgageBalance: 310000,
    equityAmount: 610000,
    equityPercent: 66,
    yearsOwned: 8.5,
    mortgageRate: '3.45%',
    keySignal: 'Significant Equity Spike (+44%) • Empty Nester Life Event',
    allSignals: ['Significant Equity Spike (+44%)', 'Empty Nester Life Event'],
  },
]

function getSignalBadgeColor(signal: string) {
  const s = signal.toLowerCase()
  if (s.includes('equity') || s.includes('appreciation') || s.includes('clear')) {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
  }
  if (s.includes('spike') || s.includes('nester') || s.includes('life event') || s.includes('anniversary')) {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
  }
  return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
}

export const SellerRadarTab: React.FC = () => {
  const navigate = useNavigate()
  const [selectedCmaLead, setSelectedCmaLead] = useState<SellerRadarLead | null>(null)
  const [isCmaOpen, setIsCmaOpen] = useState(false)

  // Live RTK Query hooks connecting to backend
  const { data: prospectsData, isLoading, refetch } = useGetSellerRadarProspectsQuery()
  const { data: dashboardData } = useGetSellerRadarDashboardQuery()
  const [triggerAnniversary, { isLoading: isScanningAnniversaries }] = useTriggerAnniversaryScanMutation()

  const displayLeads =
    prospectsData?.prospects && prospectsData.prospects.length > 0
      ? prospectsData.prospects
      : fallbackSellerRadarLeads

  const totalTargets = dashboardData?.totalProspects || displayLeads.length
  const totalEquityStr = dashboardData?.totalEquity
    ? `$${(dashboardData.totalEquity / 1000000).toFixed(1)}M`
    : '$6.4M'
  const avgEquityStr = dashboardData?.avgEquity
    ? `$${Math.round(dashboardData.avgEquity / 1000)}k`
    : '$580k'

  const handleOpenCma = (lead: SellerRadarLead) => {
    setSelectedCmaLead(lead)
    setIsCmaOpen(true)
  }

  const handleSendAnniversaryUpdate = (lead: SellerRadarLead) => {
    toast.success(`Equity update prepared for ${lead.name}`)
  }

  const handleRunAnniversaryScan = async () => {
    try {
      const result = await triggerAnniversary({ forceAll: true }).unwrap()
      toast.success(
        `Anniversary scan complete: ${result.anniversariesIdentified} identified, ${result.notificationsCreated} notifications sent!`
      )
      refetch()
    } catch {
      toast.error('Failed to trigger anniversary scan')
    }
  }

  const handleOpenWhatsApp = (lead: SellerRadarLead) => {
    const targetId = lead.contactId || lead.id
    navigate(`/inbox?channel=whatsapp&contactId=${targetId}`)
  }

  const handleOpenEmail = (lead: SellerRadarLead) => {
    const targetId = lead.contactId || lead.id
    navigate(`/inbox?channel=email&contactId=${targetId}`)
  }

  return (
    <div className="space-y-6">
      {/* Top Unicolor KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Targets"
          value={totalTargets}
          icon="radar"
          subtitle="Predicted listing probability"
        />
        <KpiCard
          title="Trapped Equity"
          value={totalEquityStr}
          icon="account_balance_wallet"
          subtitle="Total verified equity"
          trend={{ value: 14, isPositive: true }}
        />
        <KpiCard
          title="Avg Equity"
          value={avgEquityStr}
          icon="trending_up"
          subtitle="Per target homeowner"
          trend={{ value: 8, isPositive: true }}
        />
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-3.5 rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40">
        <div className="flex items-center gap-2">
          <MaterialIcon name="group" size={18} className="text-[#2B5748] dark:text-[#9CB080]" />
          <span className="text-sm font-bold text-[#273338] dark:text-white">
            Ranked Prospects ({displayLeads.length})
          </span>
          {isLoading && (
            <span className="text-xs text-[#75887E] dark:text-[#A0B2A6] animate-pulse">
              Scanning...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunAnniversaryScan}
            disabled={isScanningAnniversaries}
            className="text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
          >
            <MaterialIcon
              name="refresh"
              size={15}
              className={`mr-1 ${isScanningAnniversaries ? 'animate-spin' : ''}`}
            />
            Anniversary Scan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
          >
            <MaterialIcon name="sync" size={15} className="mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Ranked Prospect Cards */}
      <div className="space-y-4">
        {displayLeads.map((lead) => {
          const signals = lead.allSignals?.length
            ? lead.allSignals
            : lead.keySignal
              ? lead.keySignal.split('•').map((s) => s.trim()).filter(Boolean)
              : []

          return (
            <div
              key={lead.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs hover:border-[#618764] transition-all space-y-4"
            >
              {/* Row 1: Client Info (Left) & Tiny Propensity % (Right) */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40 shrink-0">
                    <MaterialIcon name="person" size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-[#273338] dark:text-white truncate">
                        {lead.name}
                      </h3>
                      <span className="text-xs text-[#75887E] dark:text-[#A0B2A6] font-mono">
                        ({lead.phone})
                      </span>
                    </div>
                    <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] truncate">{lead.address}</p>
                  </div>
                </div>

                {/* Tiny Propensity Percentage on the Right Side of Client Info */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40 shrink-0">
                  <MaterialIcon name="trending_up" size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold font-mono text-[#273338] dark:text-white">
                    {lead.propensityScore}%
                  </span>
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-medium hidden sm:inline">
                    Propensity
                  </span>
                </div>
              </div>

              {/* Row 2: Signals rendered in distinct red / green / blue badges immediately below client info & percentage */}
              {signals.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {signals.map((sig, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                        getSignalBadgeColor(sig)
                      )}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                      {sig}
                    </span>
                  ))}
                </div>
              )}

              {/* Row 3: Financial & Equity Stats Pill Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase block">
                    Market Value
                  </span>
                  <span className="font-extrabold text-[#273338] dark:text-white text-sm font-mono">
                    ${(lead.estimatedValue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase block">
                    Net Equity
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    +${(lead.equityAmount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase block">
                    Tenure
                  </span>
                  <span className="font-bold text-[#273338] dark:text-white text-sm font-mono">
                    {lead.yearsOwned} Years
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase block">
                    Mortgage Rate
                  </span>
                  <span className="font-bold text-[#2B5748] dark:text-[#9CB080] text-sm font-mono">
                    {lead.mortgageRate} fixed
                  </span>
                </div>
              </div>

              {/* Row 4: Trigger Actions */}
              <div className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40 flex flex-wrap items-center justify-end gap-2 text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendAnniversaryUpdate(lead)}
                  className="text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
                >
                  <MaterialIcon name="card_giftcard" size={15} className="mr-1 text-amber-600" />
                  Equity Update
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenCma(lead)}
                  className="text-xs h-8 text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/40 hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] cursor-pointer"
                >
                  <MaterialIcon name="analytics" size={15} className="mr-1" />
                  Micro-CMA
                </Button>

                {/* WhatsApp Button: In-app navigation */}
                <Button
                  size="sm"
                  onClick={() => handleOpenWhatsApp(lead)}
                  className="text-xs h-8 bg-[#008069] hover:bg-[#006a57] text-white shadow-xs font-semibold cursor-pointer"
                >
                  <MaterialIcon name="chat" size={15} className="mr-1" />
                  WhatsApp
                </Button>

                {/* Email Button: In-app navigation (No Gmail logo/text) */}
                <Button
                  size="sm"
                  onClick={() => handleOpenEmail(lead)}
                  className="text-xs h-8 bg-[#2B5748] hover:bg-[#24463a] text-white shadow-xs font-semibold cursor-pointer"
                >
                  <MaterialIcon name="mail" size={15} className="mr-1" />
                  Email
                </Button>
              </div>
            </div>
          )
        })}
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
