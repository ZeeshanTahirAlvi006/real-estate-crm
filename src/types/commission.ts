export type SplitModel = 'fixed' | 'tiered' | 'capped'

export interface DeductionItem {
  type: string
  label: string
  amount: number
  percentage?: number
}

export interface CalculateCommissionInput {
  salePrice: number
  commissionRate?: number
  splitModel?: SplitModel
  splitPercentAgent?: number
  franchiseFeePercent?: number
  tcFee?: number
  eoInsuranceFee?: number
  deskFee?: number
  referralFeePercent?: number
  agentId?: string
  capThreshold?: number
  customDeductions?: DeductionItem[]
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
  itemizedDeductions: DeductionItem[]
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
  customDeductions?: DeductionItem[]
  settlementDate?: string
  notes?: string
  status?: 'draft' | 'pending_approval' | 'approved' | 'paid'
}

export interface Commission {
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
  deductions: DeductionItem[]
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

export interface AgentCommissionReport {
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

export interface BrokerageCommissionReport {
  period: string
  totalVolume: number
  totalGrossCommission: number
  totalAgentPayouts: number
  totalBrokerageRetained: number
  averageCommissionRate: number
  settlementCount: number
  pendingApprovalCount: number
  agentReports: AgentCommissionReport[]
}
