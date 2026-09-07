import mongoose from 'mongoose'
import { Commission, ICommission } from '../../models/Commission.js'
import { User, IUser } from '../../models/User.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import {
  CalculateCommissionInput,
  CommissionCalculationResult,
  CreateCommissionInput,
  CommissionDto,
  CommissionQueryParams,
  BrokerageCommissionReportDto,
  AgentCommissionReportDto,
  SplitModel,
} from './commission.types.js'

function formatCommissionDto(c: ICommission): CommissionDto {
  return {
    id: c._id.toString(),
    brokerageId: c.brokerageId.toString(),
    transactionId: c.transactionId?.toString(),
    dealId: c.dealId?.toString(),
    contactId: c.contactId?.toString(),
    agentId: c.agentId.toString(),
    agentName: c.agentName,
    salePrice: c.salePrice,
    commissionRate: c.commissionRate,
    grossCommission: c.grossCommission,
    splitModel: c.splitModel,
    splitPercentAgent: c.splitPercentAgent,
    splitPercentBrokerage: c.splitPercentBrokerage,
    isCapped: c.isCapped,
    capThreshold: c.capThreshold,
    agentYtdContribution: c.agentYtdContribution,
    deductions: c.deductions.map((d) => ({
      type: d.type,
      label: d.label,
      amount: d.amount,
      percentage: d.percentage,
    })),
    adjustedGCI: c.adjustedGCI,
    agentGrossPayout: c.agentGrossPayout,
    agentNetPayout: c.agentNetPayout,
    brokerageNetProfit: c.brokerageNetProfit,
    status: c.status,
    settlementDate: c.settlementDate ? c.settlementDate.toISOString() : undefined,
    paidAt: c.paidAt ? c.paidAt.toISOString() : undefined,
    approvedBy: c.approvedBy?.toString(),
    notes: c.notes,
    createdBy: c.createdBy.toString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

export function computeCommissionSplit(
  input: CalculateCommissionInput,
  priorYtdContribution: number = 0,
  agentPriorYtdGci: number = 0
): CommissionCalculationResult {
  const salePrice = input.salePrice
  const commissionRate = input.commissionRate ?? 3.0
  const grossCommission = Math.round(salePrice * (commissionRate / 100))

  const franchiseFeePercent = input.franchiseFeePercent ?? 6.0
  const franchiseDeduction = Math.round(grossCommission * (franchiseFeePercent / 100))

  const referralFeePercent = input.referralFeePercent ?? 0
  const referralDeduction = Math.round(grossCommission * (referralFeePercent / 100))

  const adjustedGCI = Math.max(0, grossCommission - franchiseDeduction - referralDeduction)

  const splitModel: SplitModel = input.splitModel ?? 'fixed'
  const capThreshold = input.capThreshold ?? 18000
  let effectiveAgentSplit = input.splitPercentAgent ?? 80
  let effectiveBrokerageSplit = 100 - effectiveAgentSplit
  let isCapped = false
  let brokerageContributionThisDeal = 0

  if (splitModel === 'fixed') {
    effectiveAgentSplit = input.splitPercentAgent ?? 80
    effectiveBrokerageSplit = 100 - effectiveAgentSplit
    brokerageContributionThisDeal = Math.round(adjustedGCI * (effectiveBrokerageSplit / 100))
  } else if (splitModel === 'tiered') {
    // Sliding scale tiering based on accumulated annual GCI
    const totalGciAfterThis = agentPriorYtdGci + adjustedGCI
    if (totalGciAfterThis <= 100000) {
      effectiveAgentSplit = 70
    } else if (totalGciAfterThis <= 250000) {
      effectiveAgentSplit = 80
    } else {
      effectiveAgentSplit = 90
    }
    effectiveBrokerageSplit = 100 - effectiveAgentSplit
    brokerageContributionThisDeal = Math.round(adjustedGCI * (effectiveBrokerageSplit / 100))
  } else if (splitModel === 'capped') {
    const remainingCap = Math.max(0, capThreshold - priorYtdContribution)
    if (remainingCap <= 0) {
      // 100% Cap already achieved!
      isCapped = true
      effectiveAgentSplit = 100
      effectiveBrokerageSplit = 0
      brokerageContributionThisDeal = 0
    } else {
      const standardBrokerageCut = Math.round(adjustedGCI * ((100 - (input.splitPercentAgent ?? 80)) / 100))
      if (standardBrokerageCut >= remainingCap) {
        // Caps out on this exact deal
        isCapped = true
        brokerageContributionThisDeal = remainingCap
        effectiveBrokerageSplit = adjustedGCI > 0 ? (remainingCap / adjustedGCI) * 100 : 0
        effectiveAgentSplit = 100 - effectiveBrokerageSplit
      } else {
        // Under cap threshold
        isCapped = false
        effectiveAgentSplit = input.splitPercentAgent ?? 80
        effectiveBrokerageSplit = 100 - effectiveAgentSplit
        brokerageContributionThisDeal = standardBrokerageCut
      }
    }
  }

  const agentGrossPayout = Math.max(0, adjustedGCI - brokerageContributionThisDeal)

  // Itemized post-split deductions
  const itemizedDeductions: Array<{ type: string; label: string; amount: number; percentage?: number }> = []

  if (franchiseDeduction > 0) {
    itemizedDeductions.push({
      type: 'franchise_royalty',
      label: `Franchise Royalty (${franchiseFeePercent}%)`,
      amount: franchiseDeduction,
      percentage: franchiseFeePercent,
    })
  }

  if (referralDeduction > 0) {
    itemizedDeductions.push({
      type: 'referral_fee',
      label: `Referral Fee (${referralFeePercent}%)`,
      amount: referralDeduction,
      percentage: referralFeePercent,
    })
  }

  const tcFee = input.tcFee ?? 395
  if (tcFee > 0) {
    itemizedDeductions.push({ type: 'tc_fee', label: 'Transaction Coordinator', amount: tcFee })
  }

  const eoFee = input.eoInsuranceFee ?? 150
  if (eoFee > 0) {
    itemizedDeductions.push({ type: 'eo_insurance', label: 'Errors & Omissions (E&O)', amount: eoFee })
  }

  const deskFee = input.deskFee ?? 100
  if (deskFee > 0) {
    itemizedDeductions.push({ type: 'desk_fee', label: 'Desk & Tech Platform Fee', amount: deskFee })
  }

  if (input.customDeductions && input.customDeductions.length > 0) {
    for (const d of input.customDeductions) {
      itemizedDeductions.push({
        type: d.type || 'custom',
        label: d.label,
        amount: d.amount,
        percentage: d.percentage,
      })
    }
  }

  const totalPostSplitDeductions = (tcFee > 0 ? tcFee : 0) +
    (eoFee > 0 ? eoFee : 0) +
    (deskFee > 0 ? deskFee : 0) +
    (input.customDeductions ? input.customDeductions.reduce((acc, c) => acc + (c.amount || 0), 0) : 0)

  const agentNetPayout = Math.max(0, agentGrossPayout - totalPostSplitDeductions)
  const brokerageNetProfit = brokerageContributionThisDeal
  const newYtdContribution = priorYtdContribution + brokerageContributionThisDeal
  const capRemaining = Math.max(0, capThreshold - newYtdContribution)

  return {
    salePrice,
    commissionRate,
    grossCommission,
    franchiseDeduction,
    referralDeduction,
    adjustedGCI,
    effectiveAgentSplit: Number(effectiveAgentSplit.toFixed(2)),
    effectiveBrokerageSplit: Number(effectiveBrokerageSplit.toFixed(2)),
    splitModel,
    isCapped,
    capThreshold,
    priorYtdContribution,
    brokerageContributionThisDeal,
    newYtdContribution,
    capRemaining,
    agentGrossPayout,
    itemizedDeductions,
    totalPostSplitDeductions,
    agentNetPayout,
    brokerageNetProfit,
  }
}

export class CommissionService {
  async calculate(user: IUser, input: CalculateCommissionInput): Promise<CommissionCalculationResult> {
    let priorYtdContribution = 0
    let agentPriorYtdGci = 0

    const targetAgentId = input.agentId || (user.role === 'agent' ? user.id : undefined)

    if (targetAgentId && mongoose.Types.ObjectId.isValid(targetAgentId)) {
      const currentYear = new Date().getFullYear()
      const startOfYear = new Date(currentYear, 0, 1)

      const history = await Commission.find({
        brokerageId: user.brokerageId,
        agentId: targetAgentId,
        settlementDate: { $gte: startOfYear },
        status: { $in: ['approved', 'paid'] },
      }).select('brokerageNetProfit grossCommission').lean()

      priorYtdContribution = history.reduce((acc, c) => acc + (c.brokerageNetProfit || 0), 0)
      agentPriorYtdGci = history.reduce((acc, c) => acc + (c.grossCommission || 0), 0)
    }

    return computeCommissionSplit(input, priorYtdContribution, agentPriorYtdGci)
  }

  async create(user: IUser, input: CreateCommissionInput): Promise<CommissionDto> {
    const agent = await User.findOne({
      _id: input.agentId,
      brokerageId: user.brokerageId,
    }).lean()

    if (!agent) {
      throw new AppError('Assigned agent not found in brokerage', 404)
    }

    const calcResult = await this.calculate(user, {
      ...input,
      agentId: input.agentId,
    })

    const newCommission = await Commission.create({
      brokerageId: user.brokerageId,
      transactionId: input.transactionId ? new mongoose.Types.ObjectId(input.transactionId) : undefined,
      dealId: input.dealId ? new mongoose.Types.ObjectId(input.dealId) : undefined,
      contactId: input.contactId ? new mongoose.Types.ObjectId(input.contactId) : undefined,
      agentId: agent._id,
      agentName: `${agent.firstName} ${agent.lastName}`.trim(),
      salePrice: input.salePrice,
      commissionRate: calcResult.commissionRate,
      grossCommission: calcResult.grossCommission,
      splitModel: calcResult.splitModel,
      splitPercentAgent: calcResult.effectiveAgentSplit,
      splitPercentBrokerage: calcResult.effectiveBrokerageSplit,
      isCapped: calcResult.isCapped,
      capThreshold: calcResult.capThreshold,
      agentYtdContribution: calcResult.priorYtdContribution,
      deductions: calcResult.itemizedDeductions,
      adjustedGCI: calcResult.adjustedGCI,
      agentGrossPayout: calcResult.agentGrossPayout,
      agentNetPayout: calcResult.agentNetPayout,
      brokerageNetProfit: calcResult.brokerageNetProfit,
      status: input.status || 'draft',
      settlementDate: input.settlementDate ? new Date(input.settlementDate) : new Date(),
      notes: input.notes,
      createdBy: user._id,
    })

    logger.info(`[Commission] Created settlement ledger entry for agent ${agent._id} on transaction ${input.transactionId || 'custom'}`)
    return formatCommissionDto(newCommission)
  }

  async list(user: IUser, params: CommissionQueryParams): Promise<{ commissions: CommissionDto[]; total: number; page: number; limit: number }> {
    const query: any = { brokerageId: user.brokerageId }

    if (user.role === 'agent') {
      query.agentId = user._id
    } else if (params.agentId && mongoose.Types.ObjectId.isValid(params.agentId)) {
      query.agentId = params.agentId
    }

    if (params.transactionId && mongoose.Types.ObjectId.isValid(params.transactionId)) {
      query.transactionId = params.transactionId
    }

    if (params.dealId && mongoose.Types.ObjectId.isValid(params.dealId)) {
      query.dealId = params.dealId
    }

    if (params.status) {
      query.status = params.status
    }

    if (params.startDate || params.endDate) {
      query.settlementDate = {}
      if (params.startDate) query.settlementDate.$gte = new Date(params.startDate)
      if (params.endDate) query.settlementDate.$lte = new Date(params.endDate)
    }

    const page = Math.max(1, Number(params.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20))
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      Commission.find(query).sort({ settlementDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      Commission.countDocuments(query),
    ])

    return {
      commissions: items.map(formatCommissionDto),
      total,
      page,
      limit,
    }
  }

  async getById(user: IUser, id: string): Promise<CommissionDto> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid commission ID', 400)
    }

    const query: any = { _id: id, brokerageId: user.brokerageId }
    if (user.role === 'agent') {
      query.agentId = user._id
    }

    const item = await Commission.findOne(query)
    if (!item) {
      throw new AppError('Commission record not found', 404)
    }

    return formatCommissionDto(item)
  }

  async updateStatus(user: IUser, id: string, status: 'draft' | 'pending_approval' | 'approved' | 'paid', notes?: string): Promise<CommissionDto> {
    if (!['super_admin', 'brokerage_owner', 'team_lead'].includes(user.role)) {
      throw new AppError('Insufficient permissions to approve or disburse commissions', 403)
    }

    const query: any = { _id: id, brokerageId: user.brokerageId }
    const commission = await Commission.findOne(query)
    if (!commission) {
      throw new AppError('Commission record not found', 404)
    }

    commission.status = status
    if (notes) commission.notes = notes
    if (status === 'approved' || status === 'paid') {
      commission.approvedBy = user._id
    }
    if (status === 'paid') {
      commission.paidAt = new Date()
    }

    await commission.save()
    logger.info(`[Commission] Updated commission status to ${status} for ID ${id}`)
    return formatCommissionDto(commission)
  }

  async getReport(user: IUser, startDate?: string, endDate?: string): Promise<BrokerageCommissionReportDto> {
    const currentYear = new Date().getFullYear()
    const start = startDate ? new Date(startDate) : new Date(currentYear, 0, 1)
    const end = endDate ? new Date(endDate) : new Date()

    const query: any = {
      brokerageId: user.brokerageId,
      settlementDate: { $gte: start, $lte: end },
    }

    if (user.role === 'agent') {
      query.agentId = user._id
    }

    const [commissions, agents] = await Promise.all([
      Commission.find(query).lean(),
      User.find({
        brokerageId: user.brokerageId,
        role: { $in: ['agent', 'team_lead', 'brokerage_owner'] },
      }).select('firstName lastName email').lean(),
    ])

    const agentMap: Record<string, AgentCommissionReportDto> = {}

    for (const a of agents) {
      const aId = a._id.toString()
      agentMap[aId] = {
        agentId: aId,
        agentName: `${a.firstName} ${a.lastName}`.trim(),
        agentEmail: a.email,
        totalDealsClosed: 0,
        totalSalesVolume: 0,
        totalGrossCommission: 0,
        totalAgentNetPayout: 0,
        totalBrokerageRetained: 0,
        annualCap: 18000,
        capContributionYtd: 0,
        capRemaining: 18000,
        capPercent: 0,
        isCapped: false,
      }
    }

    let totalVolume = 0
    let totalGrossCommission = 0
    let totalAgentPayouts = 0
    let totalBrokerageRetained = 0
    let pendingApprovalCount = 0

    for (const c of commissions) {
      totalVolume += c.salePrice || 0
      totalGrossCommission += c.grossCommission || 0
      totalAgentPayouts += c.agentNetPayout || 0
      totalBrokerageRetained += c.brokerageNetProfit || 0

      if (c.status === 'pending_approval' || c.status === 'draft') {
        pendingApprovalCount++
      }

      const aId = c.agentId.toString()
      if (!agentMap[aId]) {
        agentMap[aId] = {
          agentId: aId,
          agentName: c.agentName || 'Agent',
          agentEmail: '',
          totalDealsClosed: 0,
          totalSalesVolume: 0,
          totalGrossCommission: 0,
          totalAgentNetPayout: 0,
          totalBrokerageRetained: 0,
          annualCap: c.capThreshold || 18000,
          capContributionYtd: 0,
          capRemaining: c.capThreshold || 18000,
          capPercent: 0,
          isCapped: false,
        }
      }

      const rep = agentMap[aId]
      rep.totalDealsClosed += 1
      rep.totalSalesVolume += c.salePrice || 0
      rep.totalGrossCommission += c.grossCommission || 0
      rep.totalAgentNetPayout += c.agentNetPayout || 0
      rep.totalBrokerageRetained += c.brokerageNetProfit || 0
      rep.capContributionYtd += c.brokerageNetProfit || 0
      rep.annualCap = c.capThreshold || 18000
    }

    const agentReports: AgentCommissionReportDto[] = Object.values(agentMap).map((rep) => {
      const capRem = Math.max(0, rep.annualCap - rep.capContributionYtd)
      const capPct = rep.annualCap > 0 ? Math.min(100, Math.round((rep.capContributionYtd / rep.annualCap) * 100)) : 100
      return {
        ...rep,
        capRemaining: capRem,
        capPercent: capPct,
        isCapped: capRem === 0,
      }
    })

    const averageCommissionRate = totalVolume > 0 ? Number(((totalGrossCommission / totalVolume) * 100).toFixed(2)) : 3.0

    return {
      period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
      totalVolume,
      totalGrossCommission,
      totalAgentPayouts,
      totalBrokerageRetained,
      averageCommissionRate,
      settlementCount: commissions.length,
      pendingApprovalCount,
      agentReports: user.role === 'agent'
        ? agentReports.filter((r) => r.agentId === user.id)
        : agentReports.sort((a, b) => b.totalGrossCommission - a.totalGrossCommission),
    }
  }
}

export const commissionService = new CommissionService()
