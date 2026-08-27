import mongoose, { Document, Schema, Model } from 'mongoose'

// ── Pipeline Stage subdocument ──────────────────────────
export interface IPipelineStage {
  _id: mongoose.Types.ObjectId
  name: string
  color: string
  order: number
  probability: number // 0–100 win probability for forecasting
}

const pipelineStageSchema = new Schema<IPipelineStage>(
  {
    name: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true,
      maxlength: [60, 'Stage name cannot exceed 60 characters'],
    },
    color: {
      type: String,
      required: [true, 'Stage color is required'],
      trim: true,
      match: [/^#([0-9A-Fa-f]{6})$/, 'Color must be a valid 6-digit hex code'],
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
    probability: {
      type: Number,
      required: true,
      min: [0, 'Probability cannot be negative'],
      max: [100, 'Probability cannot exceed 100'],
      default: 0,
    },
  },
  { _id: true }
)

// ── Pipeline document ───────────────────────────────────
export interface IPipeline extends Document {
  name: string
  brokerageId: mongoose.Types.ObjectId
  isDefault: boolean
  stages: IPipelineStage[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const pipelineSchema = new Schema<IPipeline>(
  {
    name: {
      type: String,
      required: [true, 'Pipeline name is required'],
      trim: true,
      maxlength: [100, 'Pipeline name cannot exceed 100 characters'],
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    stages: {
      type: [pipelineStageSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Unique pipeline name per brokerage
pipelineSchema.index({ brokerageId: 1, name: 1 }, { unique: true })
pipelineSchema.index({ brokerageId: 1, isDefault: 1 })

// ── Default stage definitions (seeded on pipeline creation) ──
export const DEFAULT_PIPELINE_STAGES: Omit<IPipelineStage, '_id'>[] = [
  { name: 'New Lead', color: '#6366f1', order: 0, probability: 10 },
  { name: 'Contacted', color: '#8b5cf6', order: 1, probability: 20 },
  { name: 'Qualified', color: '#06b6d4', order: 2, probability: 40 },
  { name: 'Showing', color: '#f59e0b', order: 3, probability: 60 },
  { name: 'Under Contract', color: '#10b981', order: 4, probability: 80 },
  { name: 'Closed Won', color: '#22c55e', order: 5, probability: 100 },
  { name: 'Closed Lost', color: '#ef4444', order: 6, probability: 0 },
]

export const Pipeline: Model<IPipeline> =
  mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', pipelineSchema)
