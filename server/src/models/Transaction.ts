import mongoose, { Document, Schema, Model } from 'mongoose'

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

export interface ITransactionMilestone {
  id: string
  title: string
  category: MilestoneCategory
  status: MilestoneStatus
  dueDate?: Date
  completedAt?: Date
  completedBy?: mongoose.Types.ObjectId
  completedByName?: string
  order: number
  notes?: string
}

export interface ITransactionDocument {
  id: string
  title: string
  category: DocumentCategory
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  uploadedBy: mongoose.Types.ObjectId
  uploadedByName: string
  uploadedAt: Date
  clientVisible: boolean
}

export interface ITransaction extends Document {
  brokerageId: mongoose.Types.ObjectId
  dealId?: mongoose.Types.ObjectId
  contactId: mongoose.Types.ObjectId
  contactName: string
  contactEmail?: string
  contactPhone?: string
  propertyAddress: string
  type: TransactionType
  status: TransactionStatus
  purchasePrice: number
  earnestMoney?: number
  escrowCompany?: string
  escrowOfficer?: string
  escrowOfficerPhone?: string
  escrowOfficerEmail?: string
  closingDate: Date
  contractDate: Date
  assignedAgentId: mongoose.Types.ObjectId
  assignedAgentName: string
  progressPercent: number
  milestones: ITransactionMilestone[]
  documents: ITransactionDocument[]
  notes?: string
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const milestoneSchema = new Schema<ITransactionMilestone>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['contract', 'inspection', 'appraisal', 'financing', 'title', 'closing'],
      default: 'contract',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedByName: { type: String },
    order: { type: Number, required: true, default: 0 },
    notes: { type: String, trim: true },
  },
  { _id: false }
)

const documentSchema = new Schema<ITransactionDocument>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'contract',
        'disclosure',
        'inspection_report',
        'appraisal',
        'title_commitment',
        'closing_disclosure',
        'other',
      ],
      default: 'other',
    },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedByName: { type: String, default: 'Agent' },
    uploadedAt: { type: Date, default: Date.now },
    clientVisible: { type: Boolean, default: true },
  },
  { _id: false }
)

const transactionSchema = new Schema<ITransaction>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true,
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    propertyAddress: {
      type: String,
      required: [true, 'Property address is required'],
      trim: true,
      maxlength: [300, 'Property address cannot exceed 300 characters'],
    },
    type: {
      type: String,
      enum: ['buyer', 'seller', 'dual'],
      default: 'buyer',
    },
    status: {
      type: String,
      enum: ['under_contract', 'pending', 'closed', 'cancelled'],
      default: 'under_contract',
      index: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    earnestMoney: {
      type: Number,
      min: [0, 'Earnest money cannot be negative'],
      default: 0,
    },
    escrowCompany: {
      type: String,
      trim: true,
    },
    escrowOfficer: {
      type: String,
      trim: true,
    },
    escrowOfficerPhone: {
      type: String,
      trim: true,
    },
    escrowOfficerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    closingDate: {
      type: Date,
      required: [true, 'Target closing date is required'],
      index: true,
    },
    contractDate: {
      type: Date,
      default: Date.now,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned agent ID is required'],
      index: true,
    },
    assignedAgentName: {
      type: String,
      required: true,
      trim: true,
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    milestones: [milestoneSchema],
    documents: [documentSchema],
    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Multi-tenant indexes for lightning fast queries
transactionSchema.index({ brokerageId: 1, isDeleted: 1, status: 1 })
transactionSchema.index({ brokerageId: 1, contactId: 1 })
transactionSchema.index({ brokerageId: 1, assignedAgentId: 1 })
transactionSchema.index({ brokerageId: 1, closingDate: 1 })

export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema)
