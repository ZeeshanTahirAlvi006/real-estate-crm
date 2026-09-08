export type TransactionType = 'buyer' | 'seller' | 'dual'
export type TransactionStatus = 'under_contract' | 'pending' | 'closed' | 'cancelled'
export type MilestoneCategory = 'contract' | 'inspection' | 'appraisal' | 'financing' | 'title' | 'closing'
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type DocumentCategory =
  | 'contract'
  | 'disclosure'
  | 'inspection_report'
  | 'appraisal'
  | 'title_commitment'
  | 'closing_disclosure'
  | 'other'

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

export interface Transaction {
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

export interface ConvertDealPayload {
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

export interface CreateTransactionPayload {
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

export interface UpdateMilestonePayload {
  status: MilestoneStatus
  notes?: string
  dueDate?: string
}

export interface UploadDocumentPayload {
  title: string
  category: DocumentCategory
  fileUrl: string
  fileName: string
  fileSize?: number
  mimeType?: string
  clientVisible?: boolean
}
