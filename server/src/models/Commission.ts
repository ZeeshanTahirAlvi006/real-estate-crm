import mongoose, { Schema, Document } from 'mongoose'

export interface ICommissionDeduction {
  type: string
  label: string
  amount: number
  percentage?: number
}

export interface ICommission extends Document {
  brokerageId: mongoose.Types.ObjectId
  transactionId?: mongoose.Types.ObjectId
  dealId?: mongoose.Types.ObjectId
  contactId?: mongoose.Types.ObjectId
  agentId: mongoose.Types.ObjectId
  agentName: string
  salePrice: number
  commissionRate: number
  grossCommission: number
  splitModel: 'fixed' | 'tiered' | 'capped'
  splitPercentAgent: number
  splitPercentBrokerage: number
  isCapped: boolean
  capThreshold: number
  agentYtdContribution: number
  deductions: ICommissionDeduction[]
  adjustedGCI: number
  agentGrossPayout: number
  agentNetPayout: number
  brokerageNetProfit: number
  status: 'draft' | 'pending_approval' | 'approved' | 'paid'
  settlementDate?: Date
  paidAt?: Date
  approvedBy?: mongoose.Types.ObjectId
  notes?: string
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const commissionDeductionSchema = new Schema<ICommissionDeduction>(
  {
    type: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0 },
    percentage: { type: Number },
  },
  { _id: false }
)

const commissionSchema = new Schema<ICommission>(
  {
    brokerageId: { type: Schema.Types.ObjectId, ref: 'Brokerage', required: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agentName: { type: String, required: true, trim: true },
    salePrice: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, default: 3.0 },
    grossCommission: { type: Number, required: true, min: 0 },
    splitModel: {
      type: String,
      enum: ['fixed', 'tiered', 'capped'],
      default: 'fixed',
    },
    splitPercentAgent: { type: Number, required: true, default: 80 },
    splitPercentBrokerage: { type: Number, required: true, default: 20 },
    isCapped: { type: Boolean, default: false },
    capThreshold: { type: Number, default: 18000 },
    agentYtdContribution: { type: Number, default: 0 },
    deductions: [commissionDeductionSchema],
    adjustedGCI: { type: Number, required: true, min: 0 },
    agentGrossPayout: { type: Number, required: true, min: 0 },
    agentNetPayout: { type: Number, required: true, min: 0 },
    brokerageNetProfit: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'paid'],
      default: 'draft',
      index: true,
    },
    settlementDate: { type: Date, default: Date.now },
    paidAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, maxlength: 1000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
)

// Compound multi-tenant indexes for lightning-fast queries and aggregate reporting
commissionSchema.index({ brokerageId: 1, agentId: 1, createdAt: -1 })
commissionSchema.index({ brokerageId: 1, status: 1, createdAt: -1 })
commissionSchema.index({ brokerageId: 1, settlementDate: -1 })

export const Commission = mongoose.model<ICommission>('Commission', commissionSchema)
