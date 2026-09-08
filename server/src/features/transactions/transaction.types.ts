import {
  TransactionType,
  TransactionStatus,
  MilestoneCategory,
  MilestoneStatus,
  DocumentCategory,
} from '../../models/Transaction.js'

export interface MilestoneDto {
  id: string
  title: string
  category: MilestoneCategory
  status: MilestoneStatus
  dueDate?: string
  completedAt?: string
  completedBy?: string
  completedByName?: string
  order: number
  notes?: string
}

export interface DocumentDto {
  id: string
  title: string
  category: DocumentCategory
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy?: string
  uploadedByName: string
  uploadedAt: string
  clientVisible: boolean
}

export interface TransactionDto {
  id: string
  dealId?: string
  contactId: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  propertyAddress: string
  type: TransactionType
  status: TransactionStatus
  purchasePrice: number
  earnestMoney: number
  escrowCompany?: string
  escrowOfficer?: string
  escrowOfficerPhone?: string
  escrowOfficerEmail?: string
  closingDate: string
  contractDate: string
  assignedAgentId: string
  assignedAgentName: string
  progressPercent: number
  milestones: MilestoneDto[]
  documents: DocumentDto[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface CreateTransactionInput {
  dealId?: string
  contactId: string
  propertyAddress: string
  type?: TransactionType
  purchasePrice: number
  earnestMoney?: number
  escrowCompany?: string
  escrowOfficer?: string
  escrowOfficerPhone?: string
  escrowOfficerEmail?: string
  closingDate: string
  contractDate?: string
  assignedAgentId?: string
  notes?: string
}

export interface ConvertDealInput {
  closingDate: string
  purchasePrice?: number
  earnestMoney?: number
  escrowCompany?: string
  escrowOfficer?: string
  escrowOfficerPhone?: string
  escrowOfficerEmail?: string
  type?: TransactionType
  notes?: string
}

export interface UpdateMilestoneInput {
  status: MilestoneStatus
  notes?: string
  dueDate?: string
}

export interface ListTransactionsQuery {
  search?: string
  status?: string
  type?: string
  assignedAgentId?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
