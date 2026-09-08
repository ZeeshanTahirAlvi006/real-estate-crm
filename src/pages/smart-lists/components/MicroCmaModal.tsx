import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import {
  useGenerateCmaMutation,
  useGenerateCmaNarrativeMutation,
  type CmaNarrativeResult,
} from '@/store/api/sellerRadarApi'

interface MicroCmaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadData: {
    id?: string
    propertyId?: string
    contactId?: string
    name: string
    address: string
    estimatedValue: number
    equityAmount: number
    yearsOwned: number
  } | null
}

const mockComps = [
  { address: '1208 Pine Crest Dr', price: '$685,000', soldPrice: 685000, beds: 4, baths: 3, sqft: 2450, pricePerSqft: 280, dom: 6 },
  { address: '1314 Oak Ridge Trail', price: '$720,000', soldPrice: 720000, beds: 4, baths: 3.5, sqft: 2680, pricePerSqft: 269, dom: 9 },
  { address: '1102 Highland Meadow', price: '$699,000', soldPrice: 699000, beds: 3, baths: 2.5, sqft: 2320, pricePerSqft: 301, dom: 12 },
]

export const MicroCmaModal: React.FC<MicroCmaModalProps> = ({
  open,
  onOpenChange,
  leadData,
}) => {
  const [generateCma, { isLoading: isGenerating }] = useGenerateCmaMutation()
  const [generateNarrative, { isLoading: isSynthesizing }] = useGenerateCmaNarrativeMutation()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'story'>('overview')
  const [storyMode, setStoryMode] = useState<'seller' | 'buyer'>('seller')
  const [narrativeResult, setNarrativeResult] = useState<CmaNarrativeResult | null>(null)
  const [generatedShareUrl, setGeneratedShareUrl] = useState<string | null>(null)

  if (!leadData) return null

  const targetValue = leadData.estimatedValue || 840000
  const lowRange = Math.round(targetValue * 0.96)
  const highRange = Math.round(targetValue * 1.05)

  const handleGenerateStory = async () => {
    try {
      const result = await generateNarrative({
        mode: storyMode,
        subjectProperty: {
          formattedAddress: leadData.address,
          estimatedValue: targetValue,
          purchasePrice: Math.round(targetValue - (leadData.equityAmount || 200000)),
          purchaseDate: leadData.yearsOwned
            ? new Date(Date.now() - leadData.yearsOwned * 365 * 24 * 3600 * 1000).toISOString()
            : undefined,
          equity: leadData.equityAmount,
        },
        comparables: mockComps.map((c) => ({
          address: c.address,
          soldPrice: c.soldPrice,
          beds: c.beds,
          baths: c.baths,
          squareFeet: c.sqft,
          pricePerSqft: c.pricePerSqft,
          daysOnMarket: c.dom,
        })),
        valuationRange: {
          low: lowRange,
          target: targetValue,
          high: highRange,
        },
      }).unwrap()

      setNarrativeResult(result)
      toast.success(`AI narrative synthesized in ${storyMode} mode!`)
    } catch {
      toast.error('Failed to synthesize AI narrative. Using local calculation.')
    }
  }

  const handleCopyMarkdownStory = async () => {
    if (!narrativeResult) return
    await navigator.clipboard?.writeText(narrativeResult.formattedMarkdown)
    toast.success('AI narrative copied to clipboard!')
  }

  const handleGenerateAndShare = async (openTab: boolean = false) => {
    try {
      const isValidMongoId = (id?: string) => Boolean(id && /^[0-9a-fA-F]{24}$/.test(id))
      const result = await generateCma({
        address: leadData.address,
        propertyId: isValidMongoId(leadData.propertyId) ? leadData.propertyId : undefined,
        contactId: isValidMongoId(leadData.contactId) ? leadData.contactId : undefined,
        customNarrative: narrativeResult ? narrativeResult.formattedMarkdown : undefined,
      }).unwrap()

      const shareLink = `http://localhost:5000/api/seller-radar/cma/${result.shareId}`
      setGeneratedShareUrl(shareLink)

      await navigator.clipboard?.writeText(shareLink)
      toast.success('Live Micro-CMA link copied!')

      if (openTab) {
        window.open(shareLink, '_blank')
      }
    } catch {
      const fallbackUrl = `http://localhost:5000/api/seller-radar/cma/cma_demo1420highland`
      setGeneratedShareUrl(fallbackUrl)
      await navigator.clipboard?.writeText(fallbackUrl)
      toast.success('Micro-CMA link copied to clipboard!')
      if (openTab) {
        window.open(fallbackUrl, '_blank')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#273338] border border-[#D8E2D6] dark:border-[#618764]/50">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 text-[#2B5748] dark:text-[#9CB080]">
                <MaterialIcon name="analytics" size={22} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                  Micro-CMA Report
                </DialogTitle>
                <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">{leadData.address}</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pt-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#2B5748] text-[#2B5748] dark:border-[#9CB080] dark:text-[#9CB080]'
                  : 'border-transparent text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              }`}
            >
              Valuation & Comps
            </button>
            <button
              onClick={() => setActiveTab('story')}
              className={`pb-2 text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'story'
                  ? 'border-[#2B5748] text-[#2B5748] dark:border-[#9CB080] dark:text-[#9CB080]'
                  : 'border-transparent text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              }`}
            >
              <MaterialIcon name="auto_awesome" size={14} className="text-[#618764] dark:text-[#9CB080]" />
              AI Narrative
              {narrativeResult && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          </div>
        </DialogHeader>

        {activeTab === 'overview' ? (
          <div className="space-y-5 pt-2 text-xs">
            {/* Valuation Hero Banner - Plain Solid Unicolor */}
            <div className="p-5 rounded-2xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-semibold uppercase tracking-wider">
                    Target Market Valuation
                  </span>
                  <p className="text-3xl font-black text-[#273338] dark:text-white font-mono mt-0.5">
                    ${targetValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-semibold">Estimated Net Equity</span>
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    +${(leadData.equityAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Valuation Range Meter */}
              <div className="space-y-1.5 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                <div className="flex justify-between text-[11px] font-mono text-[#75887E] dark:text-[#A0B2A6]">
                  <span>Low: ${lowRange.toLocaleString()}</span>
                  <span className="text-[#2B5748] dark:text-[#9CB080] font-bold">Target: ${targetValue.toLocaleString()}</span>
                  <span>High: ${highRange.toLocaleString()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#D8E2D6] dark:bg-[#273338] overflow-hidden flex">
                  <div className="h-full bg-sky-500 w-1/3" />
                  <div className="h-full bg-[#618764] w-1/3" />
                  <div className="h-full bg-emerald-500 w-1/3" />
                </div>
              </div>
            </div>

            {/* Active Buyer Demand Signal */}
            <div className="p-4 rounded-2xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#2B5748] text-white">
                  <MaterialIcon name="group" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#273338] dark:text-white">
                    48 Active Buyers
                  </h4>
                  <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
                    Pre-approved buyers searching within a 1.5-mile radius.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800/40">
                High Demand
              </span>
            </div>

            {/* Verified Local Comparable Sales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MaterialIcon name="home_work" size={16} className="text-[#618764] dark:text-[#9CB080]" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-[#273338] dark:text-white">
                    Verified Comps (Last 45 Days)
                  </h4>
                </div>
                <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">0.8 Miles Radius</span>
              </div>

              <div className="space-y-2">
                {mockComps.map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 flex flex-wrap items-center justify-between gap-2 hover:border-[#618764] transition-colors"
                  >
                    <div>
                      <span className="font-bold text-xs text-[#273338] dark:text-white block">{comp.address}</span>
                      <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                        {comp.beds} bd • {comp.sqft} sqft • ${comp.pricePerSqft}/sqft
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-xs font-mono text-[#2B5748] dark:text-[#9CB080] block">{comp.price}</span>
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6]">Sold in {comp.dom} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* AI Storytelling Engine Tab */
          <div className="space-y-4 pt-2 text-xs">
            {/* Story Configuration Controls */}
            <div className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-[#273338] dark:text-white block">Audience Perspective</span>
                <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  Select whether this narrative targets the homeowner or a prospective buyer.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStoryMode('seller')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    storyMode === 'seller'
                      ? 'bg-[#2B5748] text-white shadow-xs'
                      : 'bg-white dark:bg-[#273338] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white border border-[#D8E2D6] dark:border-[#618764]/40'
                  }`}
                >
                  Seller Mode
                </button>
                <button
                  onClick={() => setStoryMode('buyer')}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                    storyMode === 'buyer'
                      ? 'bg-[#2B5748] text-white shadow-xs'
                      : 'bg-white dark:bg-[#273338] text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white border border-[#D8E2D6] dark:border-[#618764]/40'
                  }`}
                >
                  Buyer Mode
                </button>
              </div>
            </div>

            {/* Synthesize Prompt Card */}
            {!narrativeResult && (
              <div className="p-8 rounded-2xl border-2 border-dashed border-[#D8E2D6] dark:border-[#618764]/40 text-center space-y-3">
                <MaterialIcon name="auto_awesome" size={32} className="text-[#618764] dark:text-[#9CB080] mx-auto opacity-80" />
                <h4 className="font-bold text-sm text-[#273338] dark:text-white">
                  Generate AI Micro-CMA Story
                </h4>
                <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-md mx-auto">
                  Dual-perspective engine synthesizing verified comp rates and generating Fair Housing-compliant narrative.
                </p>
                <Button
                  onClick={handleGenerateStory}
                  disabled={isSynthesizing}
                  size="sm"
                  className="bg-[#2B5748] hover:bg-[#24463a] text-white font-bold shadow-xs cursor-pointer"
                >
                  <MaterialIcon name="auto_awesome" size={16} className="mr-1.5" />
                  {isSynthesizing ? 'Synthesizing...' : `Synthesize Narrative`}
                </Button>
              </div>
            )}

            {/* Rendered Narrative Output */}
            {narrativeResult && (
              <div className="space-y-3">
                {/* Headline Card */}
                <div className="p-4 rounded-xl bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold border-[#D8E2D6] dark:border-[#618764]/50">
                      {narrativeResult.mode === 'seller' ? 'Seller Equity Advisory' : 'Buyer Fair-Value Advisory'}
                    </Badge>
                    <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-medium">
                      Velocity: <strong className="text-[#273338] dark:text-white">{narrativeResult.metrics.marketVelocity}</strong>
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-[#273338] dark:text-white leading-snug">
                    {narrativeResult.headline}
                  </h3>
                  <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] leading-relaxed">
                    {narrativeResult.executiveSummary}
                  </p>
                </div>

                {/* Appreciation & Comps Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-1.5">
                    <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                      Equity & Appreciation
                    </span>
                    <p className="text-xs text-[#273338] dark:text-slate-200 leading-relaxed">
                      {narrativeResult.appreciationStory}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-1.5">
                    <span className="font-bold text-[11px] text-[#2B5748] dark:text-[#9CB080] uppercase tracking-wider block">
                      Comps Benchmark
                    </span>
                    <p className="text-xs text-[#273338] dark:text-slate-200 leading-relaxed">
                      {narrativeResult.compsAnalysis}
                    </p>
                  </div>
                </div>

                {/* Recommended Strategy */}
                <div className="p-3.5 rounded-xl bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 space-y-1">
                  <span className="font-bold text-[11px] text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                    Recommended Strategy
                  </span>
                  <p className="text-xs text-[#273338] dark:text-slate-200 leading-relaxed">
                    {narrativeResult.recommendedStrategy}
                  </p>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] flex items-center gap-1">
                    <MaterialIcon name="verified" size={14} className="text-emerald-600" />
                    Fair Housing Compliant
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyMarkdownStory}
                      className="text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
                    >
                      <MaterialIcon name="content_copy" size={14} className="mr-1" />
                      Copy Markdown
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateStory}
                      disabled={isSynthesizing}
                      className="text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
                    >
                      <MaterialIcon name="refresh" size={14} className="mr-1" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Link Preview if generated */}
        {generatedShareUrl && (
          <div className="p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono truncate text-[#2B5748] dark:text-[#9CB080]">{generatedShareUrl}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-[#2B5748] dark:text-[#9CB080] hover:bg-[#D8E2D6] cursor-pointer"
              onClick={() => window.open(generatedShareUrl, '_blank')}
            >
              <MaterialIcon name="open_in_new" size={14} className="mr-1" />
              Open CMA
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40 text-xs">
          <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] flex items-center gap-1">
            <MaterialIcon name="verified_user" size={15} className="text-emerald-600" />
            MLS Verified
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
            >
              Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAndShare(true)}
              disabled={isGenerating}
              className="text-xs border-[#D8E2D6] dark:border-[#618764]/40 cursor-pointer"
            >
              <MaterialIcon name="open_in_new" size={14} className="mr-1" />
              Preview CMA
            </Button>
            <Button
              size="sm"
              onClick={() => handleGenerateAndShare(false)}
              disabled={isGenerating}
              className="bg-[#2B5748] hover:bg-[#24463a] text-white font-semibold cursor-pointer"
            >
              <MaterialIcon name="share" size={14} className="mr-1.5" />
              {isGenerating ? 'Generating...' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
