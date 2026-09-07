export type CmaStoryMode = 'seller' | 'buyer'

export interface CmaSubjectPropertyInput {
  formattedAddress: string
  beds?: number
  baths?: number
  squareFeet?: number
  propertyType?: string
  purchaseDate?: string | Date
  purchasePrice?: number
  estimatedValue: number
  estimatedMortgageBalance?: number
  equity?: number
  equityPercent?: number
}

export interface CmaComparableInput {
  address: string
  soldPrice: number
  beds?: number
  baths?: number
  squareFeet?: number
  pricePerSqft?: number
  soldDate?: string | Date
  daysOnMarket?: number
  distanceMiles?: number
}

export interface ValuationRangeInput {
  low: number
  target: number
  high: number
  confidenceScore?: number
}

export interface GenerateCmaStoryInput {
  mode: CmaStoryMode
  subjectProperty: CmaSubjectPropertyInput
  comparables: CmaComparableInput[]
  valuationRange?: ValuationRangeInput
  cmaReportId?: string
  shareId?: string
  tone?: 'professional' | 'consultative' | 'concise'
}

export interface CalculatedCmaMetrics {
  avgCompPriceSqft: number
  medianSoldPrice: number
  avgDaysOnMarket: number
  marketVelocity: 'Fast (Seller-Favorable)' | 'Balanced' | 'Cool (Buyer-Favorable)'
  appreciationTotalDollar: number
  appreciationTotalPercent: number
  appreciationAnnualCagr: number
  monthlyEquityAccrual: number
  holdingPeriodYears: number
  subjectPricePerSqft: number
  compCount: number
}

export interface CmaStoryOutput {
  mode: CmaStoryMode
  headline: string
  executiveSummary: string
  appreciationStory: string
  compsAnalysis: string
  recommendedStrategy: string
  formattedHtml: string
  formattedMarkdown: string
  metrics: CalculatedCmaMetrics
  compliance: {
    passed: boolean
    flags: string[]
  }
}
