import mongoose, { Document, Schema, Model } from 'mongoose'

export type DealPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface IDeal extends Document {
  pipelineId: mongoose.Types.ObjectId
  stageId: mongoose.Types.ObjectId // references Pipeline.stages._id
  contactId: mongoose.Types.ObjectId
  contactName: string // denormalized for card display
  propertyAddress: string
  dealValue: number
  assignedAgentId: mongoose.Types.ObjectId
  assignedAgentName: string // denormalized
  priority: DealPriority
  stageEnteredAt: Date // when deal entered current stage
  isConvertedToEscrow?: boolean
  transactionId?: mongoose.Types.ObjectId
  notes: string
  brokerageId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const dealSchema = new Schema<IDeal>(
  {
    pipelineId: {
      type: Schema.Types.ObjectId,
      ref: 'Pipeline',
      required: [true, 'Pipeline ID is required'],
      index: true,
    },
    stageId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Stage ID is required'],
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
      required: true,
      trim: true,
    },
    propertyAddress: {
      type: String,
      required: [true, 'Property address is required'],
      trim: true,
      maxlength: [300, 'Property address cannot exceed 300 characters'],
    },
    dealValue: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: [0, 'Deal value cannot be negative'],
      default: 0,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned agent is required'],
      index: true,
    },
    assignedAgentName: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    stageEnteredAt: {
      type: Date,
      default: Date.now,
    },
    isConvertedToEscrow: {
      type: Boolean,
      default: false,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [5000, 'Notes cannot exceed 5000 characters'],
      default: '',
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Virtual: compute daysInStage on read
dealSchema.virtual('daysInStage').get(function (this: IDeal) {
  if (!this.stageEnteredAt) return 0
  return Math.floor((Date.now() - this.stageEnteredAt.getTime()) / 86400000)
})

// Compound indexes for common query patterns
dealSchema.index({ brokerageId: 1, pipelineId: 1, isDeleted: 1 })
dealSchema.index({ assignedAgentId: 1, isDeleted: 1 })
dealSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })

export const Deal: Model<IDeal> =
  mongoose.models.Deal || mongoose.model<IDeal>('Deal', dealSchema)
