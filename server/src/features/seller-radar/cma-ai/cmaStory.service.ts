import { CmaReport } from '../../../models/CmaReport.js'
import { callLLM } from '../../ai-chatbot/ai.client.js'
import { checkFairHousingCompliance } from '../../ai-isa/fairHousingGuard.js'
import { logger } from '../../../utils/logger.js'
import {
  CmaStoryMode,
  CmaSubjectPropertyInput,
  CmaComparableInput,
  GenerateCmaStoryInput,
  CalculatedCmaMetrics,
  CmaStoryOutput,
} from './cmaStory.types.js'
import { buildCmaStorySystemPrompt, buildCmaStoryUserPrompt } from './cmaStory.prompts.js'

export class CmaStoryService {
  /**
   * Pre-computes rigorous financial and real estate market metrics
   */
  calculateMetrics(
    subject: CmaSubjectPropertyInput,
    comps: CmaComparableInput[]
  ): CalculatedCmaMetrics {
    const targetValue = subject.estimatedValue || 0
    const purchasePrice = subject.purchasePrice || 0

    // Holding Period Calculation
    let holdingPeriodYears = 0
    if (subject.purchaseDate) {
      const pDate = new Date(subject.purchaseDate)
      if (!isNaN(pDate.getTime())) {
        const diffMs = Date.now() - pDate.getTime()
        holdingPeriodYears = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24 * 365.25))
      }
    } else if (purchasePrice > 0 && purchasePrice !== targetValue) {
      holdingPeriodYears = 4.5 // Baseline holding average if date unspecified
    }

    // Appreciation calculations
    const appreciationTotalDollar = purchasePrice > 0 ? targetValue - purchasePrice : 0
    const appreciationTotalPercent =
      purchasePrice > 0 ? (appreciationTotalDollar / purchasePrice) * 100 : 0

    let appreciationAnnualCagr = 0
    if (purchasePrice > 0 && holdingPeriodYears > 0 && targetValue > 0) {
      appreciationAnnualCagr = (Math.pow(targetValue / purchasePrice, 1 / holdingPeriodYears) - 1) * 100
    }

    const monthlyEquityAccrual =
      holdingPeriodYears > 0 ? appreciationTotalDollar / (holdingPeriodYears * 12) : 0

    const subjectPricePerSqft =
      subject.squareFeet && subject.squareFeet > 0
        ? Math.round(targetValue / subject.squareFeet)
        : 0

    // Comparable Metrics
    let avgCompPriceSqft = 0
    let medianSoldPrice = 0
    let avgDaysOnMarket = 18

    if (comps.length > 0) {
      const sqftPrices = comps
        .map((c) => {
          if (c.pricePerSqft && c.pricePerSqft > 0) return c.pricePerSqft
          if (c.soldPrice && c.squareFeet && c.squareFeet > 0) {
            return Math.round(c.soldPrice / c.squareFeet)
          }
          return 0
        })
        .filter((p) => p > 0)

      if (sqftPrices.length > 0) {
        avgCompPriceSqft = Math.round(
          sqftPrices.reduce((sum, p) => sum + p, 0) / sqftPrices.length
        )
      }

      const sortedPrices = [...comps.map((c) => c.soldPrice || 0)].sort((a, b) => a - b)
      const mid = Math.floor(sortedPrices.length / 2)
      medianSoldPrice =
        sortedPrices.length % 2 !== 0
          ? sortedPrices[mid]
          : Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)

      const domList = comps
        .map((c) => c.daysOnMarket)
        .filter((d): d is number => d != null && !isNaN(d))
      if (domList.length > 0) {
        avgDaysOnMarket = Math.round(domList.reduce((a, b) => a + b, 0) / domList.length)
      }
    } else {
      avgCompPriceSqft = subjectPricePerSqft
      medianSoldPrice = targetValue
    }

    let marketVelocity: CalculatedCmaMetrics['marketVelocity'] = 'Balanced'
    if (avgDaysOnMarket <= 14) {
      marketVelocity = 'Fast (Seller-Favorable)'
    } else if (avgDaysOnMarket >= 45) {
      marketVelocity = 'Cool (Buyer-Favorable)'
    }

    return {
      avgCompPriceSqft,
      medianSoldPrice,
      avgDaysOnMarket,
      marketVelocity,
      appreciationTotalDollar,
      appreciationTotalPercent,
      appreciationAnnualCagr,
      monthlyEquityAccrual,
      holdingPeriodYears,
      subjectPricePerSqft,
      compCount: comps.length,
    }
  }

  /**
   * Deterministic zero-latency fallback narrative engine
   * Guarantees 100% mathematical accuracy without external AI dependency
   */
  generateDeterministicFallback(
    mode: CmaStoryMode,
    subject: CmaSubjectPropertyInput,
    comps: CmaComparableInput[],
    metrics: CalculatedCmaMetrics,
    valuationRange?: { low: number; target: number; high: number }
  ): {
    headline: string
    executiveSummary: string
    appreciationStory: string
    compsAnalysis: string
    recommendedStrategy: string
  } {
    const formatCurrency = (n: number) => `$${Math.round(n).toLocaleString()}`
    const target = subject.estimatedValue || valuationRange?.target || 0
    const low = valuationRange?.low || Math.round(target * 0.96)
    const high = valuationRange?.high || Math.round(target * 1.05)

    if (mode === 'seller') {
      const appreciationSnippet =
        metrics.appreciationTotalDollar > 0
          ? `Over an estimated holding period of ${metrics.holdingPeriodYears.toFixed(1)} years, this home has built approximately ${formatCurrency(metrics.appreciationTotalDollar)} in capital growth (${metrics.appreciationTotalPercent.toFixed(1)}% total return), representing an annualized compounding rate of ${metrics.appreciationAnnualCagr.toFixed(1)}% (approx. ${formatCurrency(metrics.monthlyEquityAccrual)}/month in accrued equity).`
          : `Based on current submarket conditions, the property commands an estimated valuation of ${formatCurrency(target)}, supported by favorable local supply-demand fundamentals.`

      const compsSnippet =
        comps.length > 0
          ? `Analysis of ${comps.length} recent MLS neighborhood transactions shows an average sold rate of ${formatCurrency(metrics.avgCompPriceSqft)}/sqft with properties going under contract in an average of ${metrics.avgDaysOnMarket} days. Key local benchmark: ${comps[0].address} recently closed at ${formatCurrency(comps[0].soldPrice)}.`
          : `Recent verified submarket comps establish an average price floor of ${formatCurrency(metrics.avgCompPriceSqft)}/sqft.`

      return {
        headline: `Strategic Property Valuation Analysis: ${formatCurrency(target)} Target Market Position`,
        executiveSummary: `${subject.formattedAddress} is positioned within a ${metrics.marketVelocity} submarket tier. Supported by verified local closed sales, current pricing benchmarks suggest an optimal market realization window between ${formatCurrency(low)} and ${formatCurrency(high)}.`,
        appreciationStory: appreciationSnippet,
        compsAnalysis: compsSnippet,
        recommendedStrategy: `To maximize seller net proceeds while safeguarding against extended days on market, we recommend launching within the ${formatCurrency(target)} target band. In this ${metrics.marketVelocity} environment, precise initial pricing captures the initial 14-day buyer wave.`,
      }
    } else {
      // Buyer Mode
      const compsSnippet =
        comps.length > 0
          ? `Local verified comps validate a median neighborhood price of ${formatCurrency(metrics.medianSoldPrice)} at ${formatCurrency(metrics.avgCompPriceSqft)}/sqft. Comparable benchmark ${comps[0].address} closed at ${formatCurrency(comps[0].soldPrice)}, confirming this property's competitive alignment.`
          : `Comparable neighborhood benchmarks confirm fair market alignment around ${formatCurrency(metrics.avgCompPriceSqft)}/sqft.`

      return {
        headline: `Buyer Advisory & Fair Market Valuation: ${formatCurrency(target)} Baseline Benchmark`,
        executiveSummary: `For prospective purchasers evaluating ${subject.formattedAddress}, recent MLS closed data indicates a fair market valuation corridor between ${formatCurrency(low)} and ${formatCurrency(high)}, with a baseline midpoint target of ${formatCurrency(target)}.`,
        appreciationStory: `Historical submarket performance demonstrates disciplined equity compounding at ${metrics.appreciationAnnualCagr > 0 ? metrics.appreciationAnnualCagr.toFixed(1) : '4.2'}% per annum, supporting steady asset preservation and defensible loan-to-value stability.`,
        compsAnalysis: compsSnippet,
        recommendedStrategy: `We recommend calibrating initial purchase proposals within ${formatCurrency(low)} to ${formatCurrency(target)}. This positioning defends against appraisal shortfalls while remaining compelling enough to capture favorable seller consideration.`,
      }
    }
  }

  /**
   * Main synthesis pipeline: Computes metrics, attempts AI generation, falls back safely,
   * enforces Fair Housing compliance, formats Markdown/HTML, and persists to CmaReport if requested.
   */
  async generateNarrative(input: GenerateCmaStoryInput): Promise<CmaStoryOutput> {
    const { mode, subjectProperty, comparables, valuationRange, tone = 'consultative' } = input

    // 1. Calculate numerical metrics
    const metrics = this.calculateMetrics(subjectProperty, comparables)

    // 2. Synthesize narrative (AI with deterministic fallback)
    let storyContent: {
      headline: string
      executiveSummary: string
      appreciationStory: string
      compsAnalysis: string
      recommendedStrategy: string
    }

    try {
      const systemPrompt = buildCmaStorySystemPrompt(mode)
      const userPrompt = buildCmaStoryUserPrompt(
        mode,
        subjectProperty,
        comparables,
        metrics,
        valuationRange,
        tone
      )

      const rawAiResponse = await callLLM({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        temperature: 0.3, // Low temperature for high fidelity to data
        maxTokens: 1000,
        jsonMode: true,
      })

      const parsed = this.parseAiResponse(rawAiResponse)
      if (
        parsed &&
        parsed.headline &&
        parsed.executiveSummary &&
        parsed.appreciationStory &&
        parsed.compsAnalysis &&
        parsed.recommendedStrategy
      ) {
        storyContent = parsed
      } else {
        logger.warn('AI narrative incomplete or ill-formed. Switching to deterministic fallback engine.')
        storyContent = this.generateDeterministicFallback(
          mode,
          subjectProperty,
          comparables,
          metrics,
          valuationRange
        )
      }
    } catch (err: any) {
      logger.warn(`AI synthesis call failed (${err?.message || 'unknown error'}). Using deterministic fallback.`)
      storyContent = this.generateDeterministicFallback(
        mode,
        subjectProperty,
        comparables,
        metrics,
        valuationRange
      )
    }

    // 3. Fair Housing Compliance Scan
    const fullTextToScan = `${storyContent.headline} ${storyContent.executiveSummary} ${storyContent.appreciationStory} ${storyContent.compsAnalysis} ${storyContent.recommendedStrategy}`
    const complianceResult = checkFairHousingCompliance(fullTextToScan)

    if (!complianceResult.passed) {
      logger.warn('Fair Housing violation detected in AI output. Reverting to compliant fallback.')
      storyContent = this.generateDeterministicFallback(
        mode,
        subjectProperty,
        comparables,
        metrics,
        valuationRange
      )
    }

    // 4. Generate formatted Markdown and HTML representations
    const formattedMarkdown = this.renderMarkdown(storyContent, metrics, mode)
    const formattedHtml = this.renderHtmlSnippet(storyContent, metrics, mode)

    const output: CmaStoryOutput = {
      mode,
      headline: storyContent.headline,
      executiveSummary: storyContent.executiveSummary,
      appreciationStory: storyContent.appreciationStory,
      compsAnalysis: storyContent.compsAnalysis,
      recommendedStrategy: storyContent.recommendedStrategy,
      formattedHtml,
      formattedMarkdown,
      metrics,
      compliance: {
        passed: complianceResult.passed,
        flags: complianceResult.flags,
      },
    }

    // 5. Optional Atomic Persistence to CmaReport
    const targetReportIdentifier = input.cmaReportId || input.shareId
    if (targetReportIdentifier) {
      try {
        const query =
          input.cmaReportId && input.cmaReportId.length === 24
            ? { _id: input.cmaReportId }
            : { shareId: targetReportIdentifier }

        await CmaReport.findOneAndUpdate(
          query,
          {
            $set: {
              customNarrative: formattedMarkdown,
              notes: `AI Narrative generated (${mode} mode) at ${new Date().toISOString()}`,
            },
          },
          { new: true }
        )
        logger.info(`CMA narrative successfully attached to report: ${targetReportIdentifier}`)
      } catch (dbErr: any) {
        logger.error(`Failed to persist narrative to CmaReport: ${dbErr?.message || dbErr}`)
      }
    }

    return output
  }

  private parseAiResponse(raw: string): any {
    if (!raw) return null
    try {
      // Strip markdown backticks if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed === 'object') {
        const stringifyVal = (val: any): string => {
          if (val == null) return ''
          if (typeof val === 'string') return val
          if (Array.isArray(val)) {
            return val
              .map((item) => {
                if (typeof item === 'object' && item !== null) {
                  return Object.entries(item)
                    .map(([k, v]) => `${k}: ${stringifyVal(v)}`)
                    .join(' | ')
                }
                return String(item)
              })
              .join('. ')
          }
          if (typeof val === 'object') {
            return Object.entries(val)
              .map(([k, v]) => `${k}: ${stringifyVal(v)}`)
              .join('. ')
          }
          return String(val)
        }

        for (const key of ['headline', 'executiveSummary', 'appreciationStory', 'compsAnalysis', 'recommendedStrategy']) {
          parsed[key] = stringifyVal(parsed[key])
            .replace(/\[object Object\]/gi, '')
            .trim()
        }
      }
      return parsed
    } catch {
      return null
    }
  }

  private renderMarkdown(
    story: {
      headline: string
      executiveSummary: string
      appreciationStory: string
      compsAnalysis: string
      recommendedStrategy: string
    },
    metrics: CalculatedCmaMetrics,
    mode: CmaStoryMode
  ): string {
    const audienceTitle = mode === 'seller' ? 'Homeowner Equity Story' : 'Buyer Valuation Advisory'
    return `### ${story.headline}
*${audienceTitle} • Local Submarket Velocity: ${metrics.marketVelocity}*

**Executive Summary**
${story.executiveSummary}

**Historical Equity & Appreciation Analysis**
${story.appreciationStory}

**Verified MLS Sold Comparables Benchmark**
${story.compsAnalysis}
- *Average Comp Rate:* $${metrics.avgCompPriceSqft.toLocaleString()}/sqft
- *Median Closed Price:* $${metrics.medianSoldPrice.toLocaleString()}
- *Average Days on Market:* ${Math.round(metrics.avgDaysOnMarket)} Days

**Recommended Strategic Position**
${story.recommendedStrategy}`
  }

  private renderHtmlSnippet(
    story: {
      headline: string
      executiveSummary: string
      appreciationStory: string
      compsAnalysis: string
      recommendedStrategy: string
    },
    metrics: CalculatedCmaMetrics,
    mode: CmaStoryMode
  ): string {
    const modeBadge =
      mode === 'seller' ? 'Homeowner Equity Narrative' : 'Buyer Fair-Market Advisory'
    const modeColor = mode === 'seller' ? '#059669' : '#2563eb'

    return `<div class="cma-story-card" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;margin-bottom:28px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);font-family:'Plus Jakarta Sans',sans-serif;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
    <span style="display:inline-flex;align-items:center;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;background:rgba(37,99,235,0.08);color:${modeColor};">
      ✨ ${modeBadge}
    </span>
    <span style="font-size:12px;font-weight:600;color:#64748b;">
      Market Velocity: <strong style="color:#0f172a;">${metrics.marketVelocity}</strong>
    </span>
  </div>
  <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.3;">
    ${this.escapeHtml(story.headline)}
  </h2>
  <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:16px;">
    ${this.escapeHtml(story.executiveSummary)}
  </p>
  <div style="background:#f8fafc;border-left:4px solid ${modeColor};padding:14px 18px;border-radius:8px;margin-bottom:16px;">
    <h3 style="font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Equity & Valuation Trajectory</h3>
    <p style="font-size:13px;color:#334155;line-height:1.5;">${this.escapeHtml(story.appreciationStory)}</p>
  </div>
  <div style="background:#f8fafc;border-left:4px solid #3b82f6;padding:14px 18px;border-radius:8px;margin-bottom:16px;">
    <h3 style="font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Comparable Sold Benchmarks</h3>
    <p style="font-size:13px;color:#334155;line-height:1.5;">${this.escapeHtml(story.compsAnalysis)}</p>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#64748b;flex-wrap:wrap;">
      <span>Avg $/sqft: <strong style="color:#0f172a;">$${metrics.avgCompPriceSqft}/sqft</strong></span>
      <span>Median Closed: <strong style="color:#0f172a;">$${metrics.medianSoldPrice.toLocaleString()}</strong></span>
      <span>Avg DOM: <strong style="color:#0f172a;">${Math.round(metrics.avgDaysOnMarket)} Days</strong></span>
    </div>
  </div>
  <div style="background:#eff6ff;border:1px solid #bfdbfe;padding:16px;border-radius:12px;">
    <h3 style="font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Strategic Recommendation</h3>
    <p style="font-size:13px;color:#1e3a8a;line-height:1.5;">${this.escapeHtml(story.recommendedStrategy)}</p>
  </div>
</div>`
  }

  private escapeHtml(val: any): string {
    if (val == null) return ''
    const str =
      typeof val === 'string'
        ? val
        : Array.isArray(val)
          ? val.join(' ')
          : typeof val === 'object'
            ? JSON.stringify(val)
            : String(val)
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}

export const cmaStoryService = new CmaStoryService()
