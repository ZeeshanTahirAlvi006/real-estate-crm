export type SplitModel = 'fixed' | 'tiered' | 'capped'

export interface DeductionInput {
  type: string
  label: string
  amount: number
  percentage?: number
}

export interface CalculateCommissionInput {
  salePrice: number
  commissionRate?: number // e.g. 3.0%
  splitModel?: SplitModel
  splitPercentAgent?: number // e.g. 80
  franchiseFeePercent?: number // e.g. 6.0%
  tcFee?: number // e.g. 395
  eoInsuranceFee?: number // e.g. 150
  deskFee?: number // e.g. 100
  referralFeePercent?: number // e.g. 25%
  agentId?: string // if provided, checks agent's YTD contribution towards cap
  capThreshold?: number // e.g. 18000
  customDeductions?: DeductionInput[]
}

export interface CommissionCalculationResult {
  salePrice: number
  commissionRate: number
  grossCommission: number
  franchiseDeduction: number
  referralDeduction: number
  adjustedGCI: number
  effectiveAgentSplit: number
  effectiveBrokerageSplit: number
  splitModel: SplitModel
  isCapped: boolean
  capThreshold: number
  priorYtdContribution: number
  brokerageContributionThisDeal: number
  newYtdContribution: number
  capRemaining: number
  agentGrossPayout: number
  itemizedDeductions: Array<{
    type: string
    label: string
    amount: number
    percentage?: number
  }>
  totalPostSplitDeductions: number
  agentNetPayout: number
  brokerageNetProfit: number
}

export interface CreateCommissionInput {
  transactionId?: string
  dealId?: string
  contactId?: string
  agentId: string
  salePrice: number
  commissionRate?: number
  splitModel?: SplitModel
  splitPercentAgent?: number
  franchiseFeePercent?: number
  tcFee?: number
  eoInsuranceFee?: number
  deskFee?: number
  referralFeePercent?: number
  capThreshold?: number
  customDeductions?: DeductionInput[]
  settlementDate?: string
  notes?: string
  status?: 'draft' | 'pending_approval' | 'approved' | 'paid'
}

export interface CommissionDto {
  id: string
  brokerageId: string
  transactionId?: string
  dealId?: string
  contactId?: string
  agentId: string
  agentName: string
  salePrice: number
  commissionRate: number
  grossCommission: number
  splitModel: SplitModel
  splitPercentAgent: number
  splitPercentBrokerage: number
  isCapped: boolean
  capThreshold: number
  agentYtdContribution: number
  deductions: DeductionInput[]
  adjustedGCI: number
  agentGrossPayout: number
  agentNetPayout: number
  brokerageNetProfit: number
  status: 'draft' | 'pending_approval' | 'approved' | 'paid'
  settlementDate?: string
  paidAt?: string
  approvedBy?: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AgentCommissionReportDto {
  agentId: string
  agentName: string
  agentEmail: string
  totalDealsClosed: number
  totalSalesVolume: number
  totalGrossCommission: number
  totalAgentNetPayout: number
  totalBrokerageRetained: number
  annualCap: number
  capContributionYtd: number
  capRemaining: number
  capPercent: number
  isCapped: boolean
}

export interface BrokerageCommissionReportDto {
  period: string
  totalVolume: number
  totalGrossCommission: number
  totalAgentPayouts: number
  totalBrokerageRetained: number
  averageCommissionRate: number
  settlementCount: number
  pendingApprovalCount: number
  agentReports: AgentCommissionReportDto[]
}

export interface CommissionQueryParams {
  agentId?: string
  transactionId?: string
  dealId?: string
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}
