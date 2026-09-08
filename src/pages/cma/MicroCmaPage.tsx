import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useGetCmaReportQuery } from '@/store/api/sellerRadarApi'
import { toast } from 'sonner'

const fallbackData = {
  subjectProperty: {
    formattedAddress: '1420 Highland Ave, Austin TX 78703',
    beds: 4,
    baths: 3,
    squareFeet: 2450,
    equity: 520000,
    estimatedMortgage: 320000,
  },
  valuationRange: {
    low: 806000,
    target: 840000,
    high: 882000,
  },
  activeBuyerDemandCount: 48,
  comparables: [
    { address: '1208 Pine Crest Dr', soldPrice: 685000, beds: 4, baths: 3, squareFeet: 2450, pricePerSqft: 280, daysOnMarket: 6 },
    { address: '1314 Oak Ridge Trail', soldPrice: 720000, beds: 4, baths: 3.5, squareFeet: 2680, pricePerSqft: 269, daysOnMarket: 9 },
    { address: '1102 Highland Meadow', soldPrice: 699000, beds: 3, baths: 2.5, squareFeet: 2320, pricePerSqft: 301, daysOnMarket: 12 },
  ],
  agentBranding: {
    name: 'Sarah Jenkins',
    brokerageName: 'PropPulse Premier Realty',
    phone: '+1 (555) 839-2001',
    email: 'sarah.jenkins@proppulse.com',
  },
}

export function MicroCmaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [storyMode, setStoryMode] = useState<'seller' | 'buyer'>('seller')

  const { data: remoteData } = useGetCmaReportQuery(id || 'cma_demo1420highland', {
    skip: !id || id === 'demo',
  })

  const report = remoteData || fallbackData
  const prop = report.subjectProperty || fallbackData.subjectProperty
  const range = report.valuationRange || fallbackData.valuationRange
  const comps = report.comparables || fallbackData.comparables
  const agent = report.agentBranding || fallbackData.agentBranding

  const pricePerSqft = prop.squareFeet ? Math.round(range.target / prop.squareFeet) : 342

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    toast.success('Micro-CMA page link copied!')
  }

  const handleOpenWhatsApp = () => {
    navigate('/inbox?channel=whatsapp')
  }

  const handleOpenEmail = () => {
    navigate('/inbox?channel=email')
  }

  return (
    <div className="min-h-screen bg-[#F5F7F4] dark:bg-[#273338] text-[#273338] dark:text-white transition-colors py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Navigation Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-4 rounded-2xl border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 px-2.5 text-xs border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
            >
              <MaterialIcon name="arrow_back" size={16} className="mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-[#273338] dark:text-white">
                Micro-CMA Valuation
              </h1>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">{prop.formattedAddress}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
            >
              <MaterialIcon name="share" size={15} className="mr-1" />
              Copy Link
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs bg-[#2B5748] hover:bg-[#24463a] text-white shadow-xs cursor-pointer"
            >
              <MaterialIcon name="print" size={15} className="mr-1" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Hero Valuation Card - Solid Unicolor */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#2B5748] text-white shadow-md space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/15">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
              <span className="px-2.5 py-1 rounded-lg bg-[#202B2F] border border-white/10">
                {prop.beds || 4} Beds • {prop.baths || 3} Baths • {(prop.squareFeet || 2450).toLocaleString()} SqFt
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#202B2F] border border-white/10 font-mono">
                ${pricePerSqft}/SqFt
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-wider text-[#9CB080] font-bold">
              Verified Public Tax Registry
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <span className="text-xs text-white/80 font-semibold uppercase tracking-wider block">
                Target Market Valuation
              </span>
              <p className="text-3xl sm:text-4xl font-black font-mono mt-1 text-white">
                ${range.target.toLocaleString()}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs text-white/80 font-semibold uppercase tracking-wider block">
                Estimated Net Equity
              </span>
              <p className="text-2xl sm:text-3xl font-black font-mono mt-1 text-[#9CB080]">
                +${(prop.equity || 520000).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Valuation Range Meter - Solid Unicolor Bar */}
          <div className="space-y-2 pt-4 border-t border-white/15">
            <div className="flex justify-between text-xs font-mono text-white/80">
              <span>Low: ${range.low.toLocaleString()}</span>
              <span className="text-[#9CB080] font-bold">Target: ${range.target.toLocaleString()}</span>
              <span>High: ${range.high.toLocaleString()}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-[#202B2F] overflow-hidden flex p-0.5">
              <div className="h-full bg-sky-500 w-1/3 rounded-l-full" />
              <div className="h-full bg-[#618764] w-1/3" />
              <div className="h-full bg-[#9CB080] w-1/3 rounded-r-full" />
            </div>
          </div>
        </div>

        {/* Active Buyer Demand Card - Solid Unicolor */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40">
              <MaterialIcon name="group" size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#273338] dark:text-white">
                {report.activeBuyerDemandCount || 48} Active Pre-Approved Buyers
              </h3>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                Qualified buyers actively searching for homes in this immediate radius.
              </p>
            </div>
          </div>
          <Badge className="bg-[#2B5748] hover:bg-[#24463a] text-white text-xs font-bold px-3 py-1">
            High Demand
          </Badge>
        </div>

        {/* AI Valuation Narrative & Equity Story */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center gap-2">
              <MaterialIcon name="auto_awesome" size={20} className="text-[#618764] dark:text-[#9CB080]" />
              <h3 className="font-bold text-sm text-[#273338] dark:text-white">
                Valuation Narrative & Equity Story
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStoryMode('seller')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storyMode === 'seller'
                    ? 'bg-[#2B5748] text-white shadow-xs'
                    : 'bg-[#EDF2EB] dark:bg-[#273338] text-[#75887E] dark:text-[#A0B2A6]'
                }`}
              >
                Seller Mode
              </button>
              <button
                onClick={() => setStoryMode('buyer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  storyMode === 'buyer'
                    ? 'bg-[#2B5748] text-white shadow-xs'
                    : 'bg-[#EDF2EB] dark:bg-[#273338] text-[#75887E] dark:text-[#A0B2A6]'
                }`}
              >
                Buyer Mode
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed">
            <div className="p-4 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
              <span className="font-bold text-xs text-[#273338] dark:text-white block mb-1">
                Executive Market Summary
              </span>
              <p className="text-[#75887E] dark:text-slate-200">
                {storyMode === 'seller'
                  ? 'Subject residence shows a +44% equity surge since acquisition, supported by robust submarket inventory absorption and sustained high-density buyer demand.'
                  : 'Property demonstrates steady valuation fundamentals with resilient asset equity, supported by strong verified local comparable transactions.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-300 block mb-1">
                  Equity Appreciation Story
                </span>
                <p className="text-[#75887E] dark:text-slate-200">
                  Annualized compound appreciation rate is tracking at 6.8% per annum. Favorable mortgage lock-in enhances net equity extraction feasibility.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40">
                <span className="font-bold text-xs text-[#2B5748] dark:text-[#9CB080] block mb-1">
                  Comparable Benchmark
                </span>
                <p className="text-[#75887E] dark:text-slate-200">
                  Closed sales within 0.8 miles average 8 days on market at 99.2% list-to-sold price efficiency.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Neighborhood Comparable Sales */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center gap-2">
              <MaterialIcon name="home_work" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
              <h3 className="font-bold text-sm text-[#273338] dark:text-white">
                Verified Neighborhood Comps
              </h3>
            </div>
            <span className="text-xs text-[#75887E] dark:text-[#A0B2A6]">Within 1.2 Miles</span>
          </div>

          <div className="space-y-2.5">
            {comps.map((comp: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/40 flex flex-wrap items-center justify-between gap-3 hover:border-[#618764] transition-colors"
              >
                <div>
                  <h4 className="font-bold text-xs text-[#273338] dark:text-white">{comp.address}</h4>
                  <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                    {comp.beds} bd • {comp.baths} ba • {comp.squareFeet} sqft • ${comp.pricePerSqft}/sqft
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-xs font-mono text-[#2B5748] dark:text-[#9CB080] block">
                    ${(comp.soldPrice || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">
                    Sold in {comp.daysOnMarket || 8} days
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Agent / Brokerage Contact Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/40 mx-auto flex items-center justify-center font-bold text-xl">
            {agent.name ? agent.name.charAt(0) : 'A'}
          </div>

          <div>
            <h3 className="font-bold text-base text-[#273338] dark:text-white">{agent.name}</h3>
            <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">{agent.brokerageName}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              onClick={handleOpenWhatsApp}
              className="h-9 px-4 text-xs font-semibold bg-[#008069] hover:bg-[#006a57] text-white shadow-xs cursor-pointer"
            >
              <MaterialIcon name="chat" size={16} className="mr-1.5" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={handleOpenEmail}
              className="h-9 px-4 text-xs font-semibold bg-[#2B5748] hover:bg-[#24463a] text-white shadow-xs cursor-pointer"
            >
              <MaterialIcon name="mail" size={16} className="mr-1.5" />
              Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
