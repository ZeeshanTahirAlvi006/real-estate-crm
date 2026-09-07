import { IPropertyAddress, PropertyType } from '../../models/Property.js'
import { IComparableComp, IValuationRange } from '../../models/CmaReport.js'

export interface SellerRadarProspect {
  id: string
  propertyId: string
  contactId: string
  name: string
  phone: string
  email: string
  address: string
  propertyType: PropertyType
  propensityScore: number // 0-100
  estimatedValue: number
  estimatedMortgageBalance: number
  equityAmount: number
  equityPercent: number
  yearsOwned: number
  purchaseDate: string
  purchasePrice: number
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
  hotProspectsCount: number // >= 80% propensity
  warmProspectsCount: number // 60-79% propensity
  anniversariesThisMonth: number
  equityDistribution: {
    under200k: number
    between200kAnd500k: number
    above500k: number
  }
  topProspects: SellerRadarProspect[]
}

export interface ProspectsQueryFilters {
  page?: number
  limit?: number
  minEquity?: number
  minProbability?: number
  search?: string
  propertyType?: string
  sortBy?: 'probabilityOfSelling' | 'equity' | 'estimatedValue' | 'purchaseDate'
  sortOrder?: 'asc' | 'desc'
}

export interface AnalyzePropertyInput {
  address: string | IPropertyAddress
  contactId?: string
  propertyId?: string
  purchasePrice?: number
  purchaseDate?: string | Date
  currentMortgageRate?: number
  beds?: number
  baths?: number
  squareFeet?: number
  propertyType?: PropertyType
  saveProperty?: boolean
}

export interface PropertyAnalysisResult {
  address: IPropertyAddress
  estimatedValue: number
  valuationRange: IValuationRange
  estimatedMortgageBalance: number
  equity: number
  equityPercent: number
  probabilityOfSelling: number
  sellSignals: string[]
  yearsOwned: number
  purchaseDate: Date
  purchasePrice: number
  currentMortgageRate: number
  comparables: IComparableComp[]
  activeBuyerDemandCount: number
  dataSource: 'attom_live' | 'attom_mock_fallback'
  propertyId?: string
}

export interface GenerateCmaInput {
  propertyId?: string
  contactId?: string
  address?: string | IPropertyAddress
  customNarrative?: string
  lowRangeModifier?: number // e.g. 0.95
  highRangeModifier?: number // e.g. 1.05
  notes?: string
}

export interface CmaLandingPageData {
  shareId: string
  publicUrl: string
  subjectProperty: {
    formattedAddress: string
    beds?: number
    baths?: number
    squareFeet?: number
    propertyType?: string
    purchaseDate?: string
    estimatedValue: number
    equity: number
    equityPercent: number
  }
  valuationRange: IValuationRange
  comparables: IComparableComp[]
  activeBuyerDemandCount: number
  agentBranding: {
    name: string
    phone: string
    email: string
    brokerageName: string
    avatarUrl?: string
    licenseNumber?: string
  }
  customNarrative?: string
  createdAt: string
  expiresAt: string
}
