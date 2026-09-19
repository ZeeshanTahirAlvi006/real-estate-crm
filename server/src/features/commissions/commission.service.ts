import mongoose from 'mongoose'
import { Commission, ICommission } from '../../models/Commission.js'
import { User, IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import { Settings } from '../../models/Settings.js'
import { Deal } from '../../models/Deal.js'
import { Contact } from '../../models/Contact.js'
import { Transaction } from '../../models/Transaction.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import {
  CalculateCommissionInput,
  CommissionCalculationResult,
  CreateCommissionInput,
  CommissionDto,
  CommissionQueryParams,
  BrokerageCommissionReportDto,
  AgentCommissionReportDto,
  SplitModel,
  UpdateBrokerageCapInput,
  UpdateAgentCapInput,
  BrokerageCapSettingsDto,
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

  const splitModel: SplitModel = input.splitModel ?? 'capped'
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
  } else {
    // 'capped' split model
    const standardBrokerageCut = Math.round(adjustedGCI * ((100 - (input.splitPercentAgent ?? 80)) / 100))
    brokerageContributionThisDeal = standardBrokerageCut
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Universal Cap Clamping Guard:
  // Under ANY plan where capThreshold > 0, the brokerage contribution this deal
  // is strictly capped to the remaining allowance (capThreshold - priorYtdContribution).
  // It is mathematically impossible for prior + current to exceed capThreshold.
  // ═══════════════════════════════════════════════════════════════════════════
  if (capThreshold > 0) {
    const remainingCap = Math.max(0, capThreshold - priorYtdContribution)
    if (remainingCap <= 0) {
      // 100% Cap already achieved prior to this deal!
      isCapped = true
      brokerageContributionThisDeal = 0
      effectiveBrokerageSplit = 0
      effectiveAgentSplit = 100
    } else if (brokerageContributionThisDeal >= remainingCap) {
      // Reaches or crosses cap threshold on this deal!
      isCapped = true
      brokerageContributionThisDeal = remainingCap
      effectiveBrokerageSplit = adjustedGCI > 0 ? Number(((remainingCap / adjustedGCI) * 100).toFixed(2)) : 0
      effectiveAgentSplit = Number((100 - effectiveBrokerageSplit).toFixed(2))
    } else {
      isCapped = false
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

  const totalPostSplitDeductions =
    (tcFee > 0 ? tcFee : 0) +
    (eoFee > 0 ? eoFee : 0) +
    (deskFee > 0 ? deskFee : 0) +
    (input.customDeductions ? input.customDeductions.reduce((acc, c) => acc + (c.amount || 0), 0) : 0)

  const agentNetPayout = Math.max(0, agentGrossPayout - totalPostSplitDeductions)
  const brokerageNetProfit = brokerageContributionThisDeal
  const newYtdContribution = Math.min(capThreshold, priorYtdContribution + brokerageContributionThisDeal)
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
    const t0 = process.hrtime.bigint()
    let priorYtdContribution = 0
    let agentPriorYtdGci = 0

    if (!user.brokerageId) {
      return computeCommissionSplit(input, 0, 0)
    }

    const targetAgentId = input.agentId || (user.role === 'agent' ? user.id : undefined)
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())

    let agentDoc: any = null
    if (targetAgentId && mongoose.Types.ObjectId.isValid(targetAgentId)) {
      const aId = new mongoose.Types.ObjectId(targetAgentId.toString())
      agentDoc = await User.findOne({ _id: aId, brokerageId: bId })
        .select('commissionCap commissionSplitPercent commissionModel')
        .lean()
    }

    let brokerageDoc: any = null
    if (input.capThreshold === undefined || input.splitPercentAgent === undefined) {
      brokerageDoc = await Brokerage.findById(bId)
        .select('defaultCommissionCap defaultCommissionSplitAgent')
        .lean()
    }

    // Dynamic Cascading Precedence:
    // Deal Input Override >> Agent Custom Config >> Brokerage Default >> System Fallback ($18k, 80%)
    const resolvedCapThreshold =
      input.capThreshold ??
      agentDoc?.commissionCap ??
      brokerageDoc?.defaultCommissionCap ??
      18000

    const resolvedSplitPercentAgent =
      input.splitPercentAgent ??
      agentDoc?.commissionSplitPercent ??
      brokerageDoc?.defaultCommissionSplitAgent ??
      80

    const resolvedSplitModel = input.splitModel ?? agentDoc?.commissionModel ?? 'capped'

    if (targetAgentId && mongoose.Types.ObjectId.isValid(targetAgentId)) {
      const currentYear = new Date().getFullYear()
      const startOfYear = new Date(currentYear, 0, 1)
      const aId = new mongoose.Types.ObjectId(targetAgentId.toString())

      const history = await Commission.find({
        brokerageId: bId,
        agentId: aId,
        settlementDate: { $gte: startOfYear },
        status: { $in: ['approved', 'paid'] },
      })
        .select('brokerageNetProfit grossCommission')
        .lean()

      priorYtdContribution = history.reduce((acc, c) => acc + (c.brokerageNetProfit || 0), 0)
      agentPriorYtdGci = history.reduce((acc, c) => acc + (c.grossCommission || 0), 0)
    }

    const result = computeCommissionSplit(
      {
        ...input,
        capThreshold: resolvedCapThreshold,
        splitPercentAgent: resolvedSplitPercentAgent,
        splitModel: resolvedSplitModel,
      },
      priorYtdContribution,
      agentPriorYtdGci
    )

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:calculate] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms (agent: ${targetAgentId || 'self'})`)

    return result
  }

  async create(user: IUser, input: CreateCommissionInput): Promise<CommissionDto> {
    const t0 = process.hrtime.bigint()

    if (!user.brokerageId) {
      throw new AppError('An assigned brokerage is required to create commission records', HTTP_STATUS.FORBIDDEN)
    }
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())

    if (!mongoose.Types.ObjectId.isValid(input.agentId)) {
      throw new AppError('Invalid agent ID', 400)
    }
    const aId = new mongoose.Types.ObjectId(input.agentId.toString())

    const agent = await User.findOne({
      _id: aId,
      brokerageId: bId,
    }).lean()

    if (!agent) {
      const existsAnywhere = await User.findById(aId)
      if (existsAnywhere) {
        throw new AppError('The assigned agent belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
      }
      throw new AppError('Assigned agent not found in brokerage', 404)
    }

    if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
      const contact = await Contact.findOne({
        _id: new mongoose.Types.ObjectId(input.contactId),
        brokerageId: bId,
        isDeleted: false,
      })
      if (!contact) {
        const existsAnywhere = await Contact.findById(input.contactId)
        if (existsAnywhere) {
          throw new AppError('The selected contact belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
        }
        throw new AppError('Contact not found', 404)
      }
    }

    if (input.dealId && mongoose.Types.ObjectId.isValid(input.dealId)) {
      const deal = await Deal.findOne({
        _id: new mongoose.Types.ObjectId(input.dealId),
        brokerageId: bId,
        isDeleted: false,
      })
      if (!deal) {
        const existsAnywhere = await Deal.findById(input.dealId)
        if (existsAnywhere) {
          throw new AppError('The selected deal belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
        }
        throw new AppError('Deal not found', 404)
      }
    }

    if (input.transactionId && mongoose.Types.ObjectId.isValid(input.transactionId)) {
      const tx = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(input.transactionId),
        brokerageId: bId,
        isDeleted: false,
      })
      if (!tx) {
        const existsAnywhere = await Transaction.findById(input.transactionId)
        if (existsAnywhere) {
          throw new AppError('The selected transaction belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
        }
        throw new AppError('Transaction not found', 404)
      }
    }

    const calcResult = await this.calculate(user, {
      ...input,
      agentId: input.agentId,
    })

    const newCommission = await Commission.create({
      brokerageId: bId,
      transactionId: input.transactionId && mongoose.Types.ObjectId.isValid(input.transactionId) ? new mongoose.Types.ObjectId(input.transactionId) : undefined,
      dealId: input.dealId && mongoose.Types.ObjectId.isValid(input.dealId) ? new mongoose.Types.ObjectId(input.dealId) : undefined,
      contactId: input.contactId && mongoose.Types.ObjectId.isValid(input.contactId) ? new mongoose.Types.ObjectId(input.contactId) : undefined,
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
      createdBy: new mongoose.Types.ObjectId(user._id.toString()),
    })

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:create] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms (commission: ${newCommission._id})`)
    logger.info(`[Commission] Created settlement ledger entry for agent ${agent._id} on transaction ${input.transactionId || 'custom'}`)
    return formatCommissionDto(newCommission)
  }

  async list(user: IUser, params: CommissionQueryParams): Promise<{ commissions: CommissionDto[]; total: number; page: number; limit: number }> {
    const t0 = process.hrtime.bigint()
    if (!user.brokerageId) {
      return { commissions: [], total: 0, page: 1, limit: params.limit || 20 }
    }
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())
    const query: any = { brokerageId: bId }

    if (user.role === 'agent') {
      query.agentId = new mongoose.Types.ObjectId(user._id.toString())
    } else if (params.agentId && mongoose.Types.ObjectId.isValid(params.agentId)) {
      query.agentId = new mongoose.Types.ObjectId(params.agentId)
    }

    if (params.transactionId && mongoose.Types.ObjectId.isValid(params.transactionId)) {
      query.transactionId = new mongoose.Types.ObjectId(params.transactionId)
    }

    if (params.dealId && mongoose.Types.ObjectId.isValid(params.dealId)) {
      query.dealId = new mongoose.Types.ObjectId(params.dealId)
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
      Commission.find(query).sort({ settlementDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Commission.countDocuments(query),
    ])

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:list] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms (count: ${items.length})`)

    return {
      commissions: items.map(formatCommissionDto as any),
      total,
      page,
      limit,
    }
  }

  async getById(user: IUser, id: string): Promise<CommissionDto> {
    const t0 = process.hrtime.bigint()
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid commission ID', 400)
    }

    if (!user.brokerageId) {
      throw new AppError('Commission record not found', 404)
    }

    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())
    const query: any = { _id: new mongoose.Types.ObjectId(id), brokerageId: bId }
    if (user.role === 'agent') {
      query.agentId = new mongoose.Types.ObjectId(user._id.toString())
    }

    const item = await Commission.findOne(query).lean()
    if (!item) {
      const existsAnywhere = await Commission.findById(id)
      if (existsAnywhere) {
        throw new AppError('This commission record belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
      }
      throw new AppError('Commission record not found', 404)
    }

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:getById] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms`)

    return formatCommissionDto(item as any)
  }

  async updateStatus(user: IUser, id: string, status: 'draft' | 'pending_approval' | 'approved' | 'paid', notes?: string): Promise<CommissionDto> {
    if (!['super_admin', 'brokerage_owner', 'team_lead'].includes(user.role)) {
      throw new AppError('Insufficient permissions to approve or disburse commissions', 403)
    }

    if (!user.brokerageId) {
      throw new AppError('An assigned brokerage is required to update commissions', HTTP_STATUS.FORBIDDEN)
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid commission ID', 400)
    }

    const t0 = process.hrtime.bigint()
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())
    const cId = new mongoose.Types.ObjectId(id)

    const updateFields: any = { status }
    if (notes) updateFields.notes = notes
    if (status === 'approved' || status === 'paid') {
      updateFields.approvedBy = new mongoose.Types.ObjectId(user._id.toString())
    }
    if (status === 'paid') {
      updateFields.paidAt = new Date()
    }

    const commission = await Commission.findOneAndUpdate(
      { _id: cId, brokerageId: bId },
      { $set: updateFields },
      { new: true }
    ).lean()

    if (!commission) {
      const existsAnywhere = await Commission.findById(id)
      if (existsAnywhere) {
        throw new AppError('This commission record belongs to another brokerage', HTTP_STATUS.FORBIDDEN)
      }
      throw new AppError('Commission record not found', 404)
    }

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:updateStatus] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms (status: ${status})`)
    logger.info(`[Commission] Updated commission status to ${status} for ID ${id}`)
    return formatCommissionDto(commission as any)
  }

  async getReport(user: IUser, startDate?: string, endDate?: string): Promise<BrokerageCommissionReportDto> {
    const t0 = process.hrtime.bigint()
    const currentYear = new Date().getFullYear()
    const start = startDate ? new Date(startDate) : new Date(currentYear, 0, 1)
    const end = endDate ? new Date(endDate) : new Date()

    if (!user.brokerageId) {
      return {
        period: `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`,
        totalVolume: 0,
        totalGrossCommission: 0,
        totalAgentPayouts: 0,
        totalBrokerageRetained: 0,
        averageCommissionRate: 3.0,
        settlementCount: 0,
        pendingApprovalCount: 0,
        agentReports: [],
      }
    }

    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())

    const query: any = {
      brokerageId: bId,
      settlementDate: { $gte: start, $lte: end },
    }

    if (user.role === 'agent') {
      query.agentId = new mongoose.Types.ObjectId(user._id.toString())
    }

    const [commissions, agents, brokerageDoc] = await Promise.all([
      Commission.find(query).lean(),
      User.find({
        brokerageId: bId,
        role: { $in: ['agent', 'team_lead', 'brokerage_owner'] },
      })
        .select('firstName lastName email commissionCap commissionSplitPercent')
        .lean(),
      Brokerage.findById(bId).select('defaultCommissionCap defaultCommissionSplitAgent').lean(),
    ])

    const brokerageDefaultCap = (brokerageDoc as any)?.defaultCommissionCap ?? 18000
    const agentMap: Record<string, AgentCommissionReportDto> = {}

    for (const a of agents) {
      const aId = a._id.toString()
      const effectiveCap = (a as any).commissionCap ?? brokerageDefaultCap
      agentMap[aId] = {
        agentId: aId,
        agentName: `${a.firstName} ${a.lastName}`.trim(),
        agentEmail: a.email,
        totalDealsClosed: 0,
        totalSalesVolume: 0,
        totalGrossCommission: 0,
        totalAgentNetPayout: 0,
        totalBrokerageRetained: 0,
        annualCap: effectiveCap,
        capContributionYtd: 0,
        capRemaining: effectiveCap,
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
        const annualCap = c.capThreshold || brokerageDefaultCap
        agentMap[aId] = {
          agentId: aId,
          agentName: c.agentName || 'Agent',
          agentEmail: '',
          totalDealsClosed: 0,
          totalSalesVolume: 0,
          totalGrossCommission: 0,
          totalAgentNetPayout: 0,
          totalBrokerageRetained: 0,
          annualCap,
          capContributionYtd: 0,
          capRemaining: annualCap,
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
    }

    const agentReports: AgentCommissionReportDto[] = Object.values(agentMap).map((rep) => {
      // Hard clamp: cap contribution displayed should never exceed annualCap
      const effectiveCap = rep.annualCap > 0 ? rep.annualCap : brokerageDefaultCap
      const effectiveContribution = Math.min(effectiveCap, rep.capContributionYtd)
      const capRem = Math.max(0, effectiveCap - effectiveContribution)
      const capPct = effectiveCap > 0 ? Math.min(100, Math.round((effectiveContribution / effectiveCap) * 100)) : 100
      return {
        ...rep,
        annualCap: effectiveCap,
        capContributionYtd: effectiveContribution,
        capRemaining: capRem,
        capPercent: capPct,
        isCapped: capRem === 0,
      }
    })

    const averageCommissionRate = totalVolume > 0 ? Number(((totalGrossCommission / totalVolume) * 100).toFixed(2)) : 3.0

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:getReport] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms (commissions: ${commissions.length})`)

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

  async getCapSettings(user: IUser): Promise<BrokerageCapSettingsDto> {
    const t0 = process.hrtime.bigint()
    if (!user.brokerageId) {
      return {
        brokerageId: '',
        defaultCommissionCap: 18000,
        defaultCommissionSplitAgent: 80,
      }
    }
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())
    const brokerage = await Brokerage.findById(bId)
      .select('defaultCommissionCap defaultCommissionSplitAgent updatedAt')
      .lean()

    if (!brokerage) {
      throw new AppError('Brokerage not found', 404)
    }

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:getCapSettings] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms`)

    return {
      brokerageId: user.brokerageId.toString(),
      defaultCommissionCap: (brokerage as any).defaultCommissionCap ?? 18000,
      defaultCommissionSplitAgent: (brokerage as any).defaultCommissionSplitAgent ?? 80,
      updatedAt: brokerage.updatedAt ? brokerage.updatedAt.toISOString() : undefined,
    }
  }

  async updateBrokerageCap(user: IUser, input: UpdateBrokerageCapInput): Promise<BrokerageCapSettingsDto> {
    if (!['super_admin', 'brokerage_owner'].includes(user.role)) {
      throw new AppError('Only brokerage owners or super admins can update commission cap rules', 403)
    }
    if (!user.brokerageId) {
      throw new AppError('An assigned brokerage is required to update commission cap rules', HTTP_STATUS.FORBIDDEN)
    }

    const t0 = process.hrtime.bigint()
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())

    const updateFields: any = {
      defaultCommissionCap: input.defaultCommissionCap,
    }
    if (input.defaultCommissionSplitAgent !== undefined) {
      updateFields.defaultCommissionSplitAgent = input.defaultCommissionSplitAgent
    }

    const updatedBrokerage = await Brokerage.findByIdAndUpdate(bId, { $set: updateFields }, { new: true }).lean()

    if (!updatedBrokerage) {
      throw new AppError('Brokerage not found', 404)
    }

    // Also sync Settings.brokerageConfig if present
    await Settings.updateOne(
      { brokerageId: bId, scope: 'brokerage' },
      {
        $set: {
          'brokerageConfig.defaultCommissionCap': input.defaultCommissionCap,
          ...(input.defaultCommissionSplitAgent !== undefined && {
            'brokerageConfig.defaultCommissionSplitAgent': input.defaultCommissionSplitAgent,
          }),
        },
      }
    ).catch((err) => logger.warn('[Commission] Non-critical settings sync warning:', err))

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:updateBrokerageCap] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms`)
    logger.info(`[Commission] Brokerage ${bId} default cap updated to $${input.defaultCommissionCap}`)

    return {
      brokerageId: user.brokerageId.toString(),
      defaultCommissionCap: (updatedBrokerage as any).defaultCommissionCap,
      defaultCommissionSplitAgent: (updatedBrokerage as any).defaultCommissionSplitAgent ?? 80,
      updatedAt: updatedBrokerage.updatedAt ? updatedBrokerage.updatedAt.toISOString() : undefined,
    }
  }

  async updateAgentCap(user: IUser, agentId: string, input: UpdateAgentCapInput): Promise<{ success: boolean; user: any }> {
    if (!['super_admin', 'brokerage_owner'].includes(user.role)) {
      throw new AppError('Only brokerage owners or super admins can update agent commission caps', 403)
    }
    if (!user.brokerageId) {
      throw new AppError('An assigned brokerage is required to update agent commission caps', HTTP_STATUS.FORBIDDEN)
    }

    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new AppError('Invalid agent ID', 400)
    }

    const t0 = process.hrtime.bigint()
    const bId = new mongoose.Types.ObjectId(user.brokerageId.toString())
    const aId = new mongoose.Types.ObjectId(agentId)

    const updateFields: any = {}
    if (input.commissionCap !== undefined) {
      updateFields.commissionCap = input.commissionCap
    }
    if (input.commissionSplitPercent !== undefined) {
      updateFields.commissionSplitPercent = input.commissionSplitPercent
    }
    if (input.commissionModel !== undefined) {
      updateFields.commissionModel = input.commissionModel
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: aId, brokerageId: bId },
      { $set: updateFields },
      { new: true }
    )
      .select('_id firstName lastName email role commissionCap commissionSplitPercent commissionModel')
      .lean()

    if (!updatedUser) {
      throw new AppError('Agent not found in brokerage', 404)
    }

    const t1 = process.hrtime.bigint()
    console.log(`[COMMISSION-PERF][service:updateAgentCap] ${(Number(t1 - t0) / 1e6).toFixed(3)}ms`)
    logger.info(`[Commission] Agent ${agentId} cap updated to ${input.commissionCap === null ? 'brokerage default' : `$${input.commissionCap}`}`)

    return {
      success: true,
      user: {
        id: updatedUser._id.toString(),
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role,
        commissionCap: (updatedUser as any).commissionCap,
        commissionSplitPercent: (updatedUser as any).commissionSplitPercent,
        commissionModel: (updatedUser as any).commissionModel,
      },
    }
  }
}

export const commissionService = new CommissionService()
