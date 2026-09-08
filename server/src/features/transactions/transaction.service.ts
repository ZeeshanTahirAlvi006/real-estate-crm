import mongoose from 'mongoose'
import { Transaction, ITransaction, ITransactionMilestone } from '../../models/Transaction.js'
import { DocumentRecord } from '../../models/Document.js'
import { Deal } from '../../models/Deal.js'
import { Contact } from '../../models/Contact.js'
import { User } from '../../models/User.js'
import { Activity } from '../../models/Activity.js'
import { getMilestonesForType } from './transaction.templates.js'
import {
  TransactionDto,
  CreateTransactionInput,
  ConvertDealInput,
  UpdateMilestoneInput,
  ListTransactionsQuery,
} from './transaction.types.js'
import { logger } from '../../utils/logger.js'
import { Pipeline } from '../../models/Pipeline.js'
import {
  emitDealStageChange,
  emitTransactionCreated,
  emitTransactionUpdated,
  emitNewNotification,
} from '../../config/socket.js'
import { formatDealDto } from '../deals/deal.types.js'

function computeProgress(milestones: ITransactionMilestone[]): number {
  if (!milestones || milestones.length === 0) return 0
  const completed = milestones.filter((m) => m.status === 'completed' || m.status === 'skipped').length
  return Math.round((completed / milestones.length) * 100)
}

function formatTransactionDto(t: ITransaction): TransactionDto {
  return {
    id: t._id.toString(),
    dealId: t.dealId?.toString(),
    contactId: t.contactId.toString(),
    contactName: t.contactName,
    contactEmail: t.contactEmail,
    contactPhone: t.contactPhone,
    propertyAddress: t.propertyAddress,
    type: t.type,
    status: t.status,
    purchasePrice: t.purchasePrice,
    earnestMoney: t.earnestMoney || 0,
    escrowCompany: t.escrowCompany,
    escrowOfficer: t.escrowOfficer,
    escrowOfficerPhone: t.escrowOfficerPhone,
    escrowOfficerEmail: t.escrowOfficerEmail,
    closingDate: t.closingDate.toISOString(),
    contractDate: t.contractDate ? t.contractDate.toISOString() : t.createdAt.toISOString(),
    assignedAgentId: t.assignedAgentId.toString(),
    assignedAgentName: t.assignedAgentName,
    progressPercent: t.progressPercent,
    milestones: (t.milestones || []).map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      status: m.status,
      dueDate: m.dueDate ? m.dueDate.toISOString() : undefined,
      completedAt: m.completedAt ? m.completedAt.toISOString() : undefined,
      completedBy: m.completedBy?.toString(),
      completedByName: m.completedByName,
      order: m.order,
      notes: m.notes,
    })),
    documents: (t.documents || []).map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      fileSize: d.fileSize,
      mimeType: d.mimeType,
      uploadedBy: d.uploadedBy?.toString(),
      uploadedByName: d.uploadedByName,
      uploadedAt: d.uploadedAt.toISOString(),
      clientVisible: d.clientVisible,
    })),
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

export class TransactionService {
  /**
   * Convert closed/under-contract Deal to full Escrow Transaction
   */
  async convertDealToTransaction(
    dealId: string,
    input: ConvertDealInput,
    user: { id: string; name: string; role?: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const dealQuery: any = { _id: dealId, isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      dealQuery.brokerageId = user.brokerageId
    }

    const deal = await Deal.findOne(dealQuery)

    if (!deal) {
      throw new Error('Deal not found or does not belong to this brokerage')
    }

    const contact = await Contact.findById(deal.contactId)
    const transactionType = input.type || 'buyer'
    const initialMilestones = getMilestonesForType(transactionType)
    const initialProgress = computeProgress(initialMilestones as ITransactionMilestone[])

    const effectiveBrokerageId = deal.brokerageId || user.brokerageId

    const transaction = await Transaction.create({
      brokerageId: effectiveBrokerageId,
      dealId: deal._id,
      contactId: deal.contactId,
      contactName: deal.contactName,
      contactEmail: contact?.email || '',
      contactPhone: contact?.phone || '',
      propertyAddress: deal.propertyAddress,
      type: transactionType,
      status: 'under_contract',
      purchasePrice: input.purchasePrice || deal.dealValue || 0,
      earnestMoney: input.earnestMoney || Math.round((input.purchasePrice || deal.dealValue || 0) * 0.02),
      escrowCompany: input.escrowCompany || 'First American Title & Escrow',
      escrowOfficer: input.escrowOfficer || 'Sarah Jenkins',
      escrowOfficerPhone: input.escrowOfficerPhone || '+1 (555) 948-2910',
      escrowOfficerEmail: input.escrowOfficerEmail || 'escrow@firstam-closing.com',
      closingDate: new Date(input.closingDate),
      contractDate: new Date(),
      assignedAgentId: deal.assignedAgentId || user.id,
      assignedAgentName: deal.assignedAgentName || user.name,
      progressPercent: initialProgress,
      milestones: initialMilestones,
      documents: [],
      notes: input.notes || deal.notes,
    })

    // Advance Deal stage in pipeline to 'Under Contract' and link to Transaction
    let stageName = 'Under Contract'
    try {
      const pipeline = await Pipeline.findById(deal.pipelineId)
      if (pipeline && pipeline.stages.length > 0) {
        const underContractStage = pipeline.stages.find((s) =>
          /under contract|escrow|pending|closing/i.test(s.name)
        )
        if (underContractStage) {
          deal.stageId = underContractStage._id
          deal.stageEnteredAt = new Date()
          stageName = underContractStage.name
        }
      }
      deal.isConvertedToEscrow = true
      deal.transactionId = transaction._id as mongoose.Types.ObjectId
      await deal.save()

      // Broadcast real-time deal stage transition so Kanban updates immediately for all connected users
      emitDealStageChange(formatDealDto(deal, stageName), effectiveBrokerageId.toString())
    } catch (err: any) {
      logger.warn(`[Transaction] Could not auto-advance deal stage: ${err.message}`)
    }

    // Log Activity
    await Activity.create({
      brokerageId: effectiveBrokerageId,
      contactId: deal.contactId,
      type: 'transaction_created',
      description: `Escrow opened for ${deal.propertyAddress} with target closing on ${new Date(input.closingDate).toLocaleDateString()}`,
      metadata: {
        dealId: deal._id.toString(),
        transactionId: transaction._id.toString(),
      },
      createdBy: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
      createdByName: user.name,
    })

    const dto = formatTransactionDto(transaction)

    // Broadcast real-time transaction creation
    emitTransactionCreated(dto, effectiveBrokerageId.toString(), transaction.assignedAgentId?.toString())

    // Emit notification to assigned agent if converted by someone else
    if (deal.assignedAgentId && deal.assignedAgentId.toString() !== user.id) {
      emitNewNotification(
        {
          type: 'stage_change',
          title: 'Deal Converted to Escrow',
          message: `${user.name} opened escrow for ${deal.propertyAddress}`,
          linkTo: `/transactions/${transaction._id}`,
        },
        deal.assignedAgentId.toString(),
        effectiveBrokerageId.toString()
      )
    }

    logger.info(`[Transaction] Deal ${dealId} converted to Transaction ${transaction._id}`)
    return dto
  }

  /**
   * Create standalone Transaction
   */
  async createTransaction(
    input: CreateTransactionInput,
    user: { id: string; name: string; role?: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const contactQuery: any = { _id: input.contactId, isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      contactQuery.brokerageId = user.brokerageId
    }
    const contact = await Contact.findOne(contactQuery)

    if (!contact) {
      throw new Error('Contact not found')
    }

    let agentId = input.assignedAgentId || user.id
    let agentName = user.name
    if (input.assignedAgentId) {
      const agent = await User.findById(input.assignedAgentId)
      if (agent) agentName = `${agent.firstName} ${agent.lastName}`
    }

    const transactionType = input.type || 'buyer'
    const initialMilestones = getMilestonesForType(transactionType)
    const initialProgress = computeProgress(initialMilestones as ITransactionMilestone[])

    const effectiveBrokerageId = user.brokerageId ? new mongoose.Types.ObjectId(user.brokerageId) : contact.brokerageId

    const transaction = await Transaction.create({
      brokerageId: effectiveBrokerageId,
      dealId: input.dealId ? new mongoose.Types.ObjectId(input.dealId) : undefined,
      contactId: contact._id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      contactEmail: contact.email || '',
      contactPhone: contact.phone || '',
      propertyAddress: input.propertyAddress,
      type: transactionType,
      status: 'under_contract',
      purchasePrice: input.purchasePrice,
      earnestMoney: input.earnestMoney || 0,
      escrowCompany: input.escrowCompany || 'First American Title & Escrow',
      escrowOfficer: input.escrowOfficer || 'Sarah Jenkins',
      escrowOfficerPhone: input.escrowOfficerPhone || '+1 (555) 948-2910',
      escrowOfficerEmail: input.escrowOfficerEmail || 'escrow@firstam-closing.com',
      closingDate: new Date(input.closingDate),
      contractDate: input.contractDate ? new Date(input.contractDate) : new Date(),
      assignedAgentId: new mongoose.Types.ObjectId(agentId),
      assignedAgentName: agentName,
      progressPercent: initialProgress,
      milestones: initialMilestones,
      documents: [],
      notes: input.notes,
    })

    const dto = formatTransactionDto(transaction)
    emitTransactionCreated(dto, effectiveBrokerageId.toString(), transaction.assignedAgentId?.toString())

    logger.info(`[Transaction] Created new transaction ${transaction._id}`)
    return dto
  }

  /**
   * List transactions with filters and pagination
   */
  async listTransactions(
    query: ListTransactionsQuery,
    user: { id: string; role: string; brokerageId: string }
  ): Promise<{ transactions: TransactionDto[]; total: number; metrics: Record<string, number> }> {
    const filter: Record<string, any> = {
      isDeleted: false,
    }

    if (user.role !== 'super_admin' && user.brokerageId) {
      filter.brokerageId = new mongoose.Types.ObjectId(user.brokerageId)
    }

    // Role-based filtering: agent only sees their own transactions unless admin/broker
    if (['agent', 'isa'].includes(user.role)) {
      filter.assignedAgentId = new mongoose.Types.ObjectId(user.id)
    } else if (query.assignedAgentId && query.assignedAgentId !== 'all') {
      filter.assignedAgentId = new mongoose.Types.ObjectId(query.assignedAgentId)
    }

    if (query.status && query.status !== 'all') {
      filter.status = query.status
    }

    if (query.type && query.type !== 'all') {
      filter.type = query.type
    }

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i')
      filter.$or = [{ propertyAddress: regex }, { contactName: regex }, { escrowCompany: regex }]
    }

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25))
    const skip = (page - 1) * limit

    const aggMatch: any = { isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      aggMatch.brokerageId = new mongoose.Types.ObjectId(user.brokerageId)
    }

    const [docs, total, activeSummary] = await Promise.all([
      Transaction.find(filter)
        .sort({ closingDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        { $match: aggMatch },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$purchasePrice' },
            activeCount: {
              $sum: { $cond: [{ $in: ['$status', ['under_contract', 'pending']] }, 1, 0] },
            },
            closedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] },
            },
          },
        },
      ]),
    ])

    const metrics = {
      totalVolume: activeSummary[0]?.totalVolume || 0,
      activeCount: activeSummary[0]?.activeCount || 0,
      closedCount: activeSummary[0]?.closedCount || 0,
    }

    return {
      transactions: docs.map((d: any) => formatTransactionDto(d)),
      total,
      metrics,
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    id: string,
    user: { id: string; role: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const filter: Record<string, any> = {
      _id: id,
      isDeleted: false,
    }

    if (user.role !== 'super_admin' && user.brokerageId) {
      filter.brokerageId = user.brokerageId
    }

    if (['agent', 'isa'].includes(user.role)) {
      filter.assignedAgentId = user.id
    }

    const transaction = await Transaction.findOne(filter)
    if (!transaction) {
      throw new Error('Transaction not found')
    }

    return formatTransactionDto(transaction)
  }

  /**
   * Update Milestone status and recalculate progress percent atomically
   */
  async updateMilestone(
    transactionId: string,
    milestoneId: string,
    input: UpdateMilestoneInput,
    user: { id: string; name: string; role?: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const query: any = { _id: transactionId, isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      query.brokerageId = user.brokerageId
    }

    const transaction = await Transaction.findOne(query)

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const milestoneIndex = transaction.milestones.findIndex((m) => m.id === milestoneId)
    if (milestoneIndex === -1) {
      throw new Error('Milestone not found')
    }

    const milestone = transaction.milestones[milestoneIndex]
    milestone.status = input.status
    if (input.notes !== undefined) milestone.notes = input.notes
    if (input.dueDate) milestone.dueDate = new Date(input.dueDate)

    if (input.status === 'completed') {
      milestone.completedAt = new Date()
      milestone.completedBy = new mongoose.Types.ObjectId(user.id)
      milestone.completedByName = user.name
    } else if (input.status === 'pending' || input.status === 'in_progress') {
      milestone.completedAt = undefined
      milestone.completedBy = undefined
      milestone.completedByName = undefined
    }

    transaction.progressPercent = computeProgress(transaction.milestones)
    if (transaction.progressPercent === 100 && transaction.status !== 'closed') {
      transaction.status = 'closed'
    }

    await transaction.save()

    const dto = formatTransactionDto(transaction)
    emitTransactionUpdated(dto, user.brokerageId, transaction.assignedAgentId?.toString())

    logger.info(`[Transaction] Updated milestone ${milestoneId} in transaction ${transactionId}`)
    return dto
  }

  /**
   * Attach Document to Transaction
   */
  async addDocument(
    transactionId: string,
    docData: {
      title: string
      category: any
      fileUrl: string
      fileName: string
      fileSize?: number
      mimeType?: string
      clientVisible?: boolean
    },
    user: { id: string; name: string; role?: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const query: any = { _id: transactionId, isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      query.brokerageId = user.brokerageId
    }

    const transaction = await Transaction.findOne(query)

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    const newDoc = {
      id: docId,
      title: docData.title,
      category: docData.category || 'other',
      fileUrl: docData.fileUrl,
      fileName: docData.fileName,
      fileSize: docData.fileSize || 0,
      mimeType: docData.mimeType || 'application/pdf',
      uploadedBy: new mongoose.Types.ObjectId(user.id),
      uploadedByName: user.name,
      uploadedAt: new Date(),
      clientVisible: docData.clientVisible !== false,
    }

    transaction.documents.push(newDoc)
    await transaction.save()

    // Create standalone DocumentRecord for global document registry
    await DocumentRecord.create({
      brokerageId: transaction.brokerageId || user.brokerageId,
      transactionId: transaction._id,
      contactId: transaction.contactId,
      dealId: transaction.dealId,
      title: docData.title,
      category: docData.category || 'other',
      fileName: docData.fileName,
      fileUrl: docData.fileUrl,
      fileSize: docData.fileSize || 0,
      mimeType: docData.mimeType || 'application/pdf',
      uploadedBy: user.id,
      uploadedByName: user.name,
      clientVisible: docData.clientVisible !== false,
    })

    logger.info(`[Transaction] Added document ${docId} to transaction ${transactionId}`)
    return formatTransactionDto(transaction)
  }

  /**
   * Remove Document from Transaction
   */
  async removeDocument(
    transactionId: string,
    docId: string,
    user: { id: string; role?: string; brokerageId: string }
  ): Promise<TransactionDto> {
    const query: any = { _id: transactionId, isDeleted: false }
    if (user.role !== 'super_admin' && user.brokerageId) {
      query.brokerageId = user.brokerageId
    }

    const transaction = await Transaction.findOneAndUpdate(
      query,
      { $pull: { documents: { id: docId } } },
      { new: true }
    )

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    await DocumentRecord.findOneAndUpdate(
      { transactionId, fileName: docId },
      { isDeleted: true }
    )

    logger.info(`[Transaction] Removed document ${docId} from transaction ${transactionId}`)
    return formatTransactionDto(transaction)
  }

  /**
   * Client VIP Portal: Get active transaction closing progress and client-visible documents
   */
  async getClientPortalTransaction(user: any): Promise<TransactionDto | null> {
    let contact: any = null

    if (user.contactId) {
      contact = await Contact.findOne({ _id: user.contactId, isDeleted: false })
    }

    if (!contact && user.email) {
      contact = await Contact.findOne({
        email: new RegExp(`^${user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        isDeleted: false,
      })
    }

    if (!contact && user.firstName && user.lastName) {
      contact = await Contact.findOne({
        firstName: new RegExp(`^${user.firstName.trim()}$`, 'i'),
        lastName: new RegExp(`^${user.lastName.trim()}$`, 'i'),
        isDeleted: false,
      })
    }

    const contactId = contact?._id || (user.contactId ? new mongoose.Types.ObjectId(user.contactId) : undefined)

    const queryOr: any[] = []
    if (contactId) {
      queryOr.push({ contactId })
    }
    if (user.email) {
      queryOr.push({ contactEmail: new RegExp(`^${user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    }
    if (contact?.email) {
      queryOr.push({ contactEmail: new RegExp(`^${contact.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    }

    if (queryOr.length === 0) {
      return null
    }

    const transaction = await Transaction.findOne({
      $or: queryOr,
      isDeleted: false,
    }).sort({ closingDate: -1, createdAt: -1 })

    if (!transaction) {
      return null
    }

    // Filter documents strictly to clientVisible
    const clientTransaction = transaction.toObject() as ITransaction
    clientTransaction.documents = (clientTransaction.documents || []).filter((d) => d.clientVisible)

    return formatTransactionDto(clientTransaction)
  }
}

export const transactionService = new TransactionService()
