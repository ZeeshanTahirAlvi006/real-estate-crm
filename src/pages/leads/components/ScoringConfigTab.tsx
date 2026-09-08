import { useState, useEffect } from 'react'
import {
  useGetScoringConfigQuery,
  useUpdateScoringConfigMutation,
} from '@/store/api/leadsApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import type {
  SourceWeight,
  KeywordWeight,
  PriceTierWeight,
  MessageLengthBonus,
} from '@/types'

export function ScoringConfigTab() {
  const { data: config, isLoading } = useGetScoringConfigQuery()
  const [updateConfig, { isLoading: isUpdating }] = useUpdateScoringConfigMutation()

  // Local config form state
  const [baseScore, setBaseScore] = useState(50)
  const [sourceWeights, setSourceWeights] = useState<SourceWeight[]>([])
  const [keywordWeights, setKeywordWeights] = useState<KeywordWeight[]>([])
  const [priceTierWeights, setPriceTierWeights] = useState<PriceTierWeight[]>([])
  const [financingBonus, setFinancingBonus] = useState(5)
  const [messageLengthBonus, setMessageLengthBonus] = useState<MessageLengthBonus>({
    minLength: 100,
    points: 5,
  })

  // New item inputs
  const [newKeyword, setNewKeyword] = useState('')
  const [newKeywordPoints, setNewKeywordPoints] = useState(10)

  // Interactive Live Score Simulator State
  const [simSource, setSimSource] = useState('zillow')
  const [simPrice, setSimPrice] = useState(650000)
  const [simMessage, setSimMessage] = useState(
    'Hi, I am a cash buyer pre-approved for up to $800k looking to buy ASAP near downtown.'
  )

  useEffect(() => {
    if (config) {
      setBaseScore(config.baseScore ?? 50)
      setSourceWeights(config.sourceWeights || [])
      setKeywordWeights(config.keywordWeights || [])
      setPriceTierWeights(config.priceTierWeights || [])
      setFinancingBonus(config.financingBonus ?? 5)
      if (config.messageLengthBonus) {
        setMessageLengthBonus(config.messageLengthBonus)
      }
    }
  }, [config])

  const handleUpdateSourceWeight = (sourceType: string, points: number) => {
    setSourceWeights((prev) =>
      prev.map((sw) => (sw.sourceType === sourceType ? { ...sw, points } : sw))
    )
  }

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return
    const kw = newKeyword.trim().toLowerCase()
    if (keywordWeights.some((k) => k.keyword.toLowerCase() === kw)) {
      toast.error('Keyword already exists')
      return
    }
    setKeywordWeights((prev) => [...prev, { keyword: kw, points: newKeywordPoints }])
    setNewKeyword('')
    setNewKeywordPoints(10)
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywordWeights((prev) => prev.filter((k) => k.keyword !== keyword))
  }

  const handleUpdatePriceTier = (index: number, points: number) => {
    setPriceTierWeights((prev) =>
      prev.map((tier, idx) => (idx === index ? { ...tier, points } : tier))
    )
  }

  const handleSave = async () => {
    try {
      await updateConfig({
        baseScore,
        sourceWeights,
        keywordWeights,
        priceTierWeights,
        financingBonus,
        messageLengthBonus,
      }).unwrap()
      toast.success('Scoring configuration updated')
    } catch {
      toast.error('Failed to update scoring rules')
    }
  }

  // Calculate simulated score live
  const calculateSimulatedScore = () => {
    let score = baseScore
    const breakdown: { reason: string; points: number }[] = [
      { reason: 'Base Score', points: baseScore },
    ]

    // Source weight
    const sw = sourceWeights.find((w) => w.sourceType === simSource)
    if (sw && sw.points !== 0) {
      score += sw.points
      breakdown.push({ reason: `Source: ${simSource}`, points: sw.points })
    }

    // Price tier weight
    const tier = priceTierWeights.find(
      (t) => simPrice >= t.minPrice && simPrice <= t.maxPrice
    )
    if (tier && tier.points !== 0) {
      score += tier.points
      breakdown.push({
        reason: `Price: $${(tier.minPrice / 1000).toFixed(0)}k - $${(tier.maxPrice / 1000).toFixed(0)}k`,
        points: tier.points,
      })
    }

    // Keyword weights
    const lowerMessage = simMessage.toLowerCase()
    for (const kw of keywordWeights) {
      if (lowerMessage.includes(kw.keyword.toLowerCase())) {
        score += kw.points
        breakdown.push({ reason: `Keyword: "${kw.keyword}"`, points: kw.points })
      }
    }

    // Financing bonus
    const financingKeywords = ['pre-approved', 'cash', 'proof of funds', 'conventional loan', 'fha']
    if (financingKeywords.some((fk) => lowerMessage.includes(fk))) {
      score += financingBonus
      breakdown.push({ reason: 'Financing Verified', points: financingBonus })
    }

    // Message length bonus
    if (simMessage.length >= messageLengthBonus.minLength) {
      score += messageLengthBonus.points
      breakdown.push({
        reason: `Message > ${messageLengthBonus.minLength} chars`,
        points: messageLengthBonus.points,
      })
    }

    const finalScore = Math.max(0, Math.min(100, score))
    return { finalScore, breakdown }
  }

  const { finalScore, breakdown } = calculateSimulatedScore()

  const getScoreColor = (sc: number) => {
    if (sc >= 80) return 'text-[#2B5748] dark:text-[#9CB080] bg-[#9CB080]/20 border-[#9CB080]/40'
    if (sc >= 50) return 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
    return 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
        <Skeleton className="h-64 w-full rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/60">
        <div>
          <h3 className="font-bold text-sm text-[#273338] dark:text-white">
            Scoring Engine
          </h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
            Configure automated heuristic scoring (0–100) for inbound leads.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          size="sm"
          className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-lg shrink-0 border border-[#9CB080] shadow-xs cursor-pointer"
        >
          {isUpdating ? (
            <MaterialIcon name="refresh" size={16} className="animate-spin" />
          ) : (
            <MaterialIcon name="save" size={16} />
          )}
          <span>Save Rules</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Forms (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Base Score & Universal Bonuses */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="calculate" size={18} className="text-[#618764]" />
                <span>Base Score</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Starting baseline score applied to all newly ingested leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 p-3 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50">
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">Baseline Score</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={baseScore}
                      onChange={(e) => setBaseScore(Number(e.target.value) || 0)}
                      className="h-8 font-mono text-xs font-bold bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                    />
                    <span className="text-[#75887E] dark:text-[#A0B2A6] text-xs font-bold">pts</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50">
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">Financing Bonus</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={financingBonus}
                      onChange={(e) => setFinancingBonus(Number(e.target.value) || 0)}
                      className="h-8 font-mono text-xs font-bold bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                    />
                    <span className="text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">+pts</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/50">
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">Message Bonus</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={messageLengthBonus.points}
                      onChange={(e) =>
                        setMessageLengthBonus({
                          ...messageLengthBonus,
                          points: Number(e.target.value) || 0,
                        })
                      }
                      className="h-8 font-mono text-xs font-bold bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                    />
                    <span className="text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">+pts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Source Credibility Weights */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="hub" size={18} className="text-[#618764]" />
                <span>Source Weights</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Points awarded based on lead source channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sourceWeights.map((sw) => (
                  <div
                    key={sw.sourceType}
                    className="p-3 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/50 bg-[#EDF2EB]/50 dark:bg-[#202B2F] space-y-1.5"
                  >
                    <span className="font-semibold text-xs capitalize text-[#273338] dark:text-white truncate block">
                      {sw.sourceType.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={-50}
                        max={50}
                        value={sw.points}
                        onChange={(e) =>
                          handleUpdateSourceWeight(sw.sourceType, Number(e.target.value) || 0)
                        }
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-bold shrink-0">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. High-Intent Keyword Weights */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="chat" size={18} className="text-[#618764]" />
                <span>Intent Keywords</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Bonus points for high-intent keywords found in inquiries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              {/* Add Keyword Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  placeholder="New intent keyword (e.g. cash, 1031 exchange)..."
                  className="h-8 text-xs flex-1 bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={-50}
                    max={50}
                    value={newKeywordPoints}
                    onChange={(e) => setNewKeywordPoints(Number(e.target.value) || 0)}
                    className="h-8 w-16 text-center text-xs font-mono font-bold bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                  />
                  <span className="text-xs text-[#75887E] dark:text-[#A0B2A6] font-bold">pts</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddKeyword}
                  className="h-8 text-xs font-semibold gap-1 border-[#D8E2D6] dark:border-[#618764]/60"
                >
                  <MaterialIcon name="add" size={14} />
                  <span>Add</span>
                </Button>
              </div>

              {/* Keywords Tag Cloud */}
              <div className="flex flex-wrap gap-2 pt-1">
                {keywordWeights.map((kw) => (
                  <Badge
                    key={kw.keyword}
                    variant="outline"
                    className="px-2.5 py-1 text-xs gap-1.5 bg-[#EDF2EB] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/50 text-[#273338] dark:text-white font-medium rounded-lg"
                  >
                    <span>{kw.keyword}</span>
                    <span className="font-mono text-[#2B5748] dark:text-[#9CB080] font-bold">
                      +{kw.points}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw.keyword)}
                      className="text-[#75887E] dark:text-[#A0B2A6] hover:text-red-600 dark:hover:text-red-400 ml-1 cursor-pointer"
                    >
                      <MaterialIcon name="close" size={13} />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Price Tier Bonuses */}
          <Card className="bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-xs">
            <CardHeader className="pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-[#273338] dark:text-white">
                <MaterialIcon name="payments" size={18} className="text-[#618764]" />
                <span>Price Tiers</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Score adjustments based on listing price range.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {priceTierWeights.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/50 bg-[#EDF2EB]/50 dark:bg-[#202B2F]"
                  >
                    <span className="font-semibold text-xs text-[#273338] dark:text-white">
                      ${(tier.minPrice / 1000).toFixed(0)}k –{' '}
                      {tier.maxPrice > 10000000
                        ? 'Unlimited'
                        : `$${(tier.maxPrice / 1000).toFixed(0)}k`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={-50}
                        max={50}
                        value={tier.points}
                        onChange={(e) => handleUpdatePriceTier(idx, Number(e.target.value) || 0)}
                        className="h-7 w-16 text-center text-xs font-mono font-bold bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                      />
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] font-bold">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Score Sandbox (1 col) */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-[#D8E2D6] dark:border-[#618764] rounded-xl shadow-md bg-white dark:bg-[#254238]">
            <CardHeader className="pb-3 bg-[#EDF2EB]/60 dark:bg-[#202B2F] rounded-t-xl border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#273338] dark:text-white">
                  <MaterialIcon name="analytics" size={18} className="text-[#618764]" />
                  <span>Live Simulator</span>
                </span>
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-0.5 font-mono font-extrabold border ${getScoreColor(
                    finalScore
                  )}`}
                >
                  {finalScore} / 100
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Simulate lead scoring in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Source Select */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">Test Source</Label>
                <select
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#202B2F] text-xs font-medium text-[#273338] dark:text-white"
                >
                  <option value="zillow">Zillow</option>
                  <option value="realtor">Realtor.com</option>
                  <option value="meta_ads">Meta Ads</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="website">Website</option>
                  <option value="webhook">Custom Webhook</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              {/* Price Input */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">Property Price ($)</Label>
                <Input
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(Number(e.target.value) || 0)}
                  className="h-8 font-mono text-xs font-bold bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-[#4A5D54] dark:text-[#A0B2A6]">Inquiry Message</Label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  rows={4}
                  className="w-full text-xs rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#202B2F] p-2 focus:outline-none focus:ring-1 focus:ring-[#9CB080] text-[#273338] dark:text-white leading-relaxed"
                />
              </div>

              {/* Real-time Calculation Breakdown */}
              <div className="space-y-2 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                  Calculation Breakdown
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-md bg-[#EDF2EB]/50 dark:bg-[#202B2F] text-[11px]"
                    >
                      <span className="text-[#273338] dark:text-white truncate">{item.reason}</span>
                      <span
                        className={`font-mono font-bold ${
                          item.points >= 0
                            ? 'text-[#2B5748] dark:text-[#9CB080]'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.points >= 0 ? `+${item.points}` : item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ScoringConfigTab
