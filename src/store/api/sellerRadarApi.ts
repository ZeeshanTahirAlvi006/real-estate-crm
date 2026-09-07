import { baseApi } from './baseApi'

export interface SellerRadarLead {
  id: string
  propertyId: string
  contactId: string
  name: string
  phone: string
  email: string
  address: string
  propensityScore: number
  estimatedValue: number
  estimatedMortgageBalance: number
  equityAmount: number
  equityPercent: number
  yearsOwned: number
  mortgageRate: string
  keySignal: string
  allSignals: string[]
  assignedAgentName?: string
  lastContactedAt?: string
}

export interface SellerRadarDashboardMetrics {
  totalProspects: number
  totalEquity: number
  avgEquity: number
  avgSellProbability: number
  hotProspectsCount: number
  warmProspectsCount: number
  anniversariesThisMonth: number
  equityDistribution: {
    under200k: number
    between200kAnd500k: number
    above500k: number
  }
  topProspects: SellerRadarLead[]
}

export interface ProspectsResponse {
  data: SellerRadarLead[]
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ComparableComp {
  address: string
  soldPrice: number
  beds?: number
  baths?: number
  squareFeet?: number
  pricePerSqft?: number
  soldDate?: string
  distanceMiles?: number
  daysOnMarket?: number
}

export interface CmaReportResponse {
  _id: string
  shareId: string
  publicUrl: string
  subjectProperty: {
    formattedAddress: string
    beds?: number
    baths?: number
    squareFeet?: number
    propertyType?: string
    purchaseDate?: string
    purchasePrice?: number
    estimatedValue: number
    estimatedMortgageBalance?: number
    equity: number
    equityPercent: number
  }
  valuationRange: {
    low: number
    target: number
    high: number
    confidenceScore: number
  }
  comparables: ComparableComp[]
  activeBuyerDemandCount: number
  agentBranding: {
    name: string
    phone: string
    email: string
    brokerageName: string
    avatarUrl?: string
  }
  customNarrative?: string
  expiresAt: string
}

export interface GenerateCmaNarrativeInput {
  mode: 'seller' | 'buyer'
  subjectProperty: {
    formattedAddress: string
    beds?: number
    squareFeet?: number
    propertyType?: string
    purchaseDate?: string
    purchasePrice?: number
    estimatedValue: number
    estimatedMortgageBalance?: number
    equity?: number
    equityPercent?: number
  }
  comparables: Array<{
    address: string
    soldPrice: number
    beds?: number
    baths?: number
    squareFeet?: number
    pricePerSqft?: number
    daysOnMarket?: number
    distanceMiles?: number
  }>
  valuationRange?: {
    low: number
    target: number
    high: number
  }
  cmaReportId?: string
  shareId?: string
  tone?: 'professional' | 'consultative' | 'concise'
}

export interface CmaNarrativeResult {
  mode: 'seller' | 'buyer'
  headline: string
  executiveSummary: string
  appreciationStory: string
  compsAnalysis: string
  recommendedStrategy: string
  formattedHtml: string
  formattedMarkdown: string
  metrics: {
    avgCompPriceSqft: number
    medianSoldPrice: number
    avgDaysOnMarket: number
    marketVelocity: string
    appreciationTotalDollar: number
    appreciationTotalPercent: number
    appreciationAnnualCagr: number
    monthlyEquityAccrual: number
    holdingPeriodYears: number
    subjectPricePerSqft: number
    compCount: number
  }
  compliance: {
    passed: boolean
    flags: string[]
  }
}

export const sellerRadarApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSellerRadarProspects: builder.query<
      { prospects: SellerRadarLead[]; total: number; page: number; limit: number },
      { page?: number; limit?: number; minEquity?: number; minProbability?: number; search?: string } | void
    >({
      query: (params) => ({
        url: '/seller-radar/prospects',
        params: params || {},
      }),
      transformResponse: (response: any) => ({
        prospects: response.data || [],
        total: response.meta?.total || (response.data || []).length,
        page: response.meta?.page || 1,
        limit: response.meta?.limit || 20,
      }),
      providesTags: ['SellerRadar'],
    }),

    getSellerRadarDashboard: builder.query<SellerRadarDashboardMetrics, void>({
      query: () => '/seller-radar/dashboard',
      transformResponse: (response: any) => response.data,
      providesTags: ['SellerRadar'],
    }),

    analyzeProperty: builder.mutation<
      any,
      {
        address: string | { formattedAddress: string; street?: string; city?: string; state?: string }
        contactId?: string
        propertyId?: string
        purchasePrice?: number
        purchaseDate?: string
        currentMortgageRate?: number
        beds?: number
        baths?: number
        squareFeet?: number
        saveProperty?: boolean
      }
    >({
      query: (body) => ({
        url: '/seller-radar/analyze',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['SellerRadar'],
    }),

    generateCma: builder.mutation<
      CmaReportResponse,
      {
        propertyId?: string
        contactId?: string
        address?: string
        customNarrative?: string
        lowRangeModifier?: number
        highRangeModifier?: number
        notes?: string
      }
    >({
      query: (body) => ({
        url: '/seller-radar/cma/generate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['CmaReports'],
    }),

    generateCmaNarrative: builder.mutation<CmaNarrativeResult, GenerateCmaNarrativeInput>({
      query: (body) => ({
        url: '/seller-radar/cma/narrative',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['CmaReports'],
    }),

    triggerAnniversaryScan: builder.mutation<any, { forceAll?: boolean } | void>({
      query: (body) => ({
        url: '/seller-radar/anniversary/trigger',
        method: 'POST',
        body: body || {},
      }),
      transformResponse: (response: any) => response.data,
      invalidatesTags: ['SellerRadar', 'Notifications', 'Activities'],
    }),
  }),
})

export const {
  useGetSellerRadarProspectsQuery,
  useGetSellerRadarDashboardQuery,
  useAnalyzePropertyMutation,
  useGenerateCmaMutation,
  useGenerateCmaNarrativeMutation,
  useTriggerAnniversaryScanMutation,
} = sellerRadarApi
