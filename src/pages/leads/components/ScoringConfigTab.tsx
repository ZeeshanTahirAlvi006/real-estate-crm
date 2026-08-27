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
import {
  SparklesIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CalculatorIcon,
  FireIcon,
  CurrencyDollarIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline'
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
      setMessageLengthBonus(config.messageLengthBonus || { minLength: 100, points: 5 })
    }
  }, [config])

  // Handlers
  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase()
    if (!trimmed) return
    if (keywordWeights.some((kw) => kw.keyword === trimmed)) {
      toast.error('Keyword already exists')
      return
    }
    setKeywordWeights([...keywordWeights, { keyword: trimmed, points: Number(newKeywordPoints) || 5 }])
    setNewKeyword('')
  }

  const handleRemoveKeyword = (keyword: string) => {
    setKeywordWeights(keywordWeights.filter((kw) => kw.keyword !== keyword))
  }

  const handleUpdateSourceWeight = (sourceType: string, points: number) => {
    setSourceWeights(
      sourceWeights.map((sw) => (sw.sourceType === sourceType ? { ...sw, points } : sw))
    )
  }

  const handleUpdatePriceTier = (index: number, points: number) => {
    const updated = [...priceTierWeights]
    updated[index].points = points
    setPriceTierWeights(updated)
  }

  const handleSave = async () => {
    try {
      await updateConfig({
        baseScore: Number(baseScore) || 50,
        sourceWeights,
        keywordWeights,
        priceTierWeights,
        financingBonus: Number(financingBonus) || 0,
        messageLengthBonus,
      }).unwrap()
      toast.success('Scoring configuration updated successfully!')
    } catch {
      toast.error('Failed to update scoring configuration')
    }
  }

  // Interactive Calculator Logic
  const calculateSimulatedScore = () => {
    let score = Number(baseScore) || 50
    const breakdown: { reason: string; points: number }[] = [
      { reason: 'Base Score', points: Number(baseScore) || 50 },
    ]

    // Source weight
    const sw = sourceWeights.find((s) => s.sourceType.toLowerCase() === simSource.toLowerCase())
    if (sw && sw.points !== 0) {
      score += sw.points
      breakdown.push({ reason: `Source (${simSource})`, points: sw.points })
    }

    // Keywords
    const msgLower = (simMessage || '').toLowerCase()
    keywordWeights.forEach((kw) => {
      if (msgLower.includes(kw.keyword.toLowerCase())) {
        score += kw.points
        breakdown.push({ reason: `Keyword "${kw.keyword}"`, points: kw.points })
      }
    })

    // Price Tier
    if (simPrice > 0) {
      const tier = priceTierWeights.find(
        (t) => simPrice >= t.minPrice && simPrice < t.maxPrice
      )
      if (tier && tier.points !== 0) {
        score += tier.points
        breakdown.push({ reason: `Price Tier ($${tier.minPrice.toLocaleString()}+)`, points: tier.points })
      }
    }

    // Financing Bonus
    const financingKws = ['mortgage', 'financing', 'loan', 'pre-approved', 'pre approved', 'fha', 'va loan', 'down payment']
    if (financingKws.some((k) => msgLower.includes(k)) && financingBonus > 0) {
      score += financingBonus
      breakdown.push({ reason: 'Financing Mention Bonus', points: financingBonus })
    }

    // Message Length Bonus
    if (simMessage.length >= messageLengthBonus.minLength && messageLengthBonus.points > 0) {
      score += messageLengthBonus.points
      breakdown.push({ reason: `Detailed Message (> ${messageLengthBonus.minLength} chars)`, points: messageLengthBonus.points })
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)))
    return { finalScore, breakdown }
  }

  const { finalScore, breakdown } = calculateSimulatedScore()

  const getScoreColor = (sc: number) => {
    if (sc >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (sc >= 60) return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30'
    if (sc >= 40) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
    return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30'
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <FireIcon className="w-4 h-4 text-orange-500" />
            <span>Intent-Based Lead Scoring Engine</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically calculates a 0–100 lead quality score upon ingestion based on source credibility, intent keywords, price tiers, and financing readiness.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          size="sm"
          className="gap-1.5 font-semibold shrink-0 shadow-xs"
        >
          {isUpdating ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
          Save Scoring Rules
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Forms (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Base Score & Universal Bonuses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CalculatorIcon className="w-4 h-4 text-primary" />
                Base Score & Global Bonuses
              </CardTitle>
              <CardDescription className="text-xs">
                Starting baseline score applied to all newly ingested leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <Label className="text-xs font-semibold">Baseline Starting Score</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={baseScore}
                      onChange={(e) => setBaseScore(Number(e.target.value) || 0)}
                      className="h-8 font-mono text-xs font-bold"
                    />
                    <span className="text-muted-foreground text-xs font-bold">pts</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <Label className="text-xs font-semibold">Financing Mention Bonus</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={financingBonus}
                      onChange={(e) => setFinancingBonus(Number(e.target.value) || 0)}
                      className="h-8 font-mono text-xs font-bold"
                    />
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">+pts</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <Label className="text-xs font-semibold">Detailed Message Bonus</Label>
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
                      className="h-8 font-mono text-xs font-bold"
                    />
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">+pts</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Source Credibility Weights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-primary" />
                Lead Source Reliability Multipliers
              </CardTitle>
              <CardDescription className="text-xs">
                Award points based on historical conversion quality of portal channels.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sourceWeights.map((sw) => (
                  <div
                    key={sw.sourceType}
                    className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1.5"
                  >
                    <span className="font-semibold text-xs capitalize text-foreground truncate block">
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
                        className="h-7 text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold shrink-0">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. High-Intent Keyword Weights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-purple-500" />
                High-Intent Keywords & Phrases
              </CardTitle>
              <CardDescription className="text-xs">
                Inquiry messages containing these buyer/seller keywords receive bonus score adjustments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Add Keyword Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                  placeholder="Type new intent keyword (e.g. 1031 exchange, relocation)..."
                  className="h-8 text-xs flex-1"
                />
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={-50}
                    max={50}
                    value={newKeywordPoints}
                    onChange={(e) => setNewKeywordPoints(Number(e.target.value) || 0)}
                    className="h-8 w-16 text-center text-xs font-mono font-bold"
                  />
                  <span className="text-xs text-muted-foreground font-bold">pts</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddKeyword}
                  className="h-8 text-xs font-semibold gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Keyword
                </Button>
              </div>

              {/* Keywords Tag Cloud */}
              <div className="flex flex-wrap gap-2 pt-1">
                {keywordWeights.map((kw) => (
                  <Badge
                    key={kw.keyword}
                    variant="outline"
                    className="px-2.5 py-1 text-xs gap-1.5 bg-purple-500/10 border-purple-500/30 text-foreground font-medium"
                  >
                    <span>{kw.keyword}</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                      +{kw.points}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw.keyword)}
                      className="text-muted-foreground hover:text-destructive ml-1"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4. Price Tier Bonuses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CurrencyDollarIcon className="w-4 h-4 text-emerald-500" />
                Property Price Tier Bonuses
              </CardTitle>
              <CardDescription className="text-xs">
                Boost lead priority when inquiring about higher value listings.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {priceTierWeights.map((tier, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20"
                  >
                    <span className="font-semibold text-xs text-foreground">
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
                        className="h-7 w-16 text-center text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Score Sandbox (1 col) */}
        <div className="space-y-4">
          <Card className="sticky top-6 border-primary/40 shadow-lg">
            <CardHeader className="pb-3 bg-primary/5 rounded-t-xl border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalculatorIcon className="w-4 h-4 text-primary" />
                  Live Score Sandbox
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
              <CardDescription className="text-xs">
                Test any incoming lead profile to simulate how the engine scores it in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* Source Select */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Test Source</Label>
                <select
                  value={simSource}
                  onChange={(e) => setSimSource(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium"
                >
                  <option value="zillow">Zillow Premier</option>
                  <option value="realtor">Realtor.com</option>
                  <option value="meta_ads">Meta Ads</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="website">Website Widget</option>
                  <option value="webhook">Custom Webhook</option>
                  <option value="manual">Manual Entry</option>
                </select>
              </div>

              {/* Price Input */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Property Price ($)</Label>
                <Input
                  type="number"
                  value={simPrice}
                  onChange={(e) => setSimPrice(Number(e.target.value) || 0)}
                  className="h-8 font-mono text-xs font-bold"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Inquiry Message</Label>
                <textarea
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  rows={4}
                  className="w-full text-xs rounded-lg border border-border bg-background p-2 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              {/* Real-time Calculation Breakdown */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Score Calculation Breakdown
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-md bg-muted/40 text-[11px]"
                    >
                      <span className="text-foreground truncate">{item.reason}</span>
                      <span
                        className={`font-mono font-bold ${
                          item.points >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
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
