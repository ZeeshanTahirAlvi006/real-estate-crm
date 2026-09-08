import { CmaStoryMode, CmaSubjectPropertyInput, CmaComparableInput, CalculatedCmaMetrics } from './cmaStory.types.js'

export const buildCmaStorySystemPrompt = (mode: CmaStoryMode): string => {
  const roleDescription =
    mode === 'seller'
      ? 'You are an elite, fiduciary real estate valuation analyst crafting an objective, data-backed Equity Appreciation & Valuation Story for a homeowner considering selling.'
      : 'You are an elite, fiduciary real estate advisory analyst crafting an objective, data-backed Fair Market Valuation & Offer Analysis Story for a prospective homebuyer.'

  return `${roleDescription}

CORE OBJECTIVES:
1. Ground every statement strictly in the provided mathematical metrics and verified MLS sold comparables.
2. Maintain complete Federal Fair Housing Act compliance:
   - NEVER mention race, religion, ethnicity, familial status, children, schools as demographics, crime rates, or neighborhood stereotyping.
   - Focus exclusively on property physical characteristics, financial appreciation, sold prices, square footage, and days on market velocity.
3. Deliver a polished, human-like narrative that makes complex property statistics instantly understandable and actionable.

OUTPUT FORMAT:
Return a JSON object with these EXACT keys:
{
  "headline": "A compelling 1-sentence hook highlighting the net valuation or market opportunity. Plain string.",
  "executiveSummary": "A concise 2-3 sentence overview framing the subject property in today's local submarket. Plain string.",
  "appreciationStory": "A detailed narrative of historical value growth, equity compounding rate, and holding-period return. Plain string.",
  "compsAnalysis": "A comparative narrative paragraph citing specific sold comps by address, sold price, and $/sqft benchmarks. Must be a single plain text string paragraph, NEVER an array or nested object.",
  "recommendedStrategy": "An actionable, strategic recommendation (for sellers: pricing band & timing; for buyers: offer positioning & terms). Plain string."
}
IMPORTANT: Every field in the JSON object MUST be a plain string. Do NOT use nested objects or arrays for any field. Do NOT include markdown backticks.`
}

export const buildCmaStoryUserPrompt = (
  mode: CmaStoryMode,
  subject: CmaSubjectPropertyInput,
  comps: CmaComparableInput[],
  metrics: CalculatedCmaMetrics,
  valuationRange?: { low: number; target: number; high: number },
  tone: string = 'consultative'
): string => {
  const formatCurrency = (val?: number) => (val != null ? `$${Math.round(val).toLocaleString()}` : 'N/A')

  const compsList = comps
    .map(
      (c, i) =>
        `Comp ${i + 1}: ${c.address} | Sold: ${formatCurrency(c.soldPrice)} | Sqft: ${c.squareFeet || 'N/A'} | $/sqft: ${formatCurrency(c.pricePerSqft)} | DOM: ${c.daysOnMarket ?? 'N/A'} days | Distance: ${c.distanceMiles != null ? `${c.distanceMiles} mi` : 'Immediate Area'}`
    )
    .join('\n')

  return `TARGET PROPERTY DATA:
- Address: ${subject.formattedAddress}
- Specs: ${subject.beds || 3} Beds, ${subject.baths || 2} Baths, ${subject.squareFeet ? `${subject.squareFeet.toLocaleString()} sqft` : 'N/A'}
- Property Type: ${subject.propertyType || 'Single Family Residence'}
- Current Market Target: ${formatCurrency(subject.estimatedValue)}
- Estimated Mortgage Balance: ${formatCurrency(subject.estimatedMortgageBalance)}
- Accumulated Net Equity: ${formatCurrency(subject.equity)} (${subject.equityPercent != null ? `${subject.equityPercent.toFixed(1)}%` : 'N/A'})
- Historical Purchase: ${formatCurrency(subject.purchasePrice)} (${subject.purchaseDate ? new Date(subject.purchaseDate).toLocaleDateString() : 'Historical Records'})
${valuationRange ? `- Valuation Range: Low ${formatCurrency(valuationRange.low)} | Target ${formatCurrency(valuationRange.target)} | High ${formatCurrency(valuationRange.high)}` : ''}

PRE-COMPUTED MARKET METRICS:
- Total Historical Appreciation: ${formatCurrency(metrics.appreciationTotalDollar)} (+${metrics.appreciationTotalPercent.toFixed(1)}%)
- Compound Annual Growth Rate (CAGR): ${metrics.appreciationAnnualCagr.toFixed(2)}% per year
- Monthly Equity Accrual: ${formatCurrency(metrics.monthlyEquityAccrual)} / month
- Holding Period: ${metrics.holdingPeriodYears.toFixed(1)} years
- Subject $/sqft: ${formatCurrency(metrics.subjectPricePerSqft)} / sqft
- Neighborhood Comp Avg $/sqft: ${formatCurrency(metrics.avgCompPriceSqft)} / sqft
- Median Sold Comp Price: ${formatCurrency(metrics.medianSoldPrice)}
- Average Days on Market (DOM): ${Math.round(metrics.avgDaysOnMarket)} days
- Local Submarket Velocity: ${metrics.marketVelocity}

RECENT VERIFIED NEIGHBORHOOD SOLD COMPS:
${compsList || 'No direct comps listed; use macro submarket trends.'}

REQUEST PARAMETERS:
- Audience Mode: ${mode.toUpperCase()} (${mode === 'seller' ? 'Homeowner considering sale' : 'Prospective buyer preparing an offer'})
- Tone: ${tone}

Generate the full JSON narrative following the required structure.`
}
