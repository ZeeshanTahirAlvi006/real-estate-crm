import mongoose, { Schema, Document } from 'mongoose'

export type ObjectionCategory =
  | 'interest_rates'
  | 'market_crash'
  | 'commission_fees'
  | 'lowball_offers'
  | 'timing_delay'
  | 'other'

export interface IObjectionAngle {
  script: string
  notes?: string
  metricsUsed?: string[]
  followUpQuestion?: string
  marketContext?: string
}

export interface IObjectionPlaybook extends Document {
  brokerageId?: mongoose.Types.ObjectId
  category: ObjectionCategory
  title: string
  triggerKeywords: string[]
  angles: {
    analytical: IObjectionAngle
    empathetic: IObjectionAngle
    urgency: IObjectionAngle
  }
  isCustom: boolean
  isDeleted: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const objectionAngleSchema = new Schema<IObjectionAngle>(
  {
    script: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    metricsUsed: [{ type: String, trim: true }],
    followUpQuestion: { type: String, trim: true },
    marketContext: { type: String, trim: true },
  },
  { _id: false }
)

const objectionPlaybookSchema = new Schema<IObjectionPlaybook>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      index: true,
      default: null,
    },
    category: {
      type: String,
      enum: ['interest_rates', 'market_crash', 'commission_fees', 'lowball_offers', 'timing_delay', 'other'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    triggerKeywords: {
      type: [String],
      default: [],
      index: true,
    },
    angles: {
      analytical: { type: objectionAngleSchema, required: true },
      empathetic: { type: objectionAngleSchema, required: true },
      urgency: { type: objectionAngleSchema, required: true },
    },
    isCustom: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

objectionPlaybookSchema.index({ brokerageId: 1, category: 1, isDeleted: 1 })

export const ObjectionPlaybook = mongoose.model<IObjectionPlaybook>(
  'ObjectionPlaybook',
  objectionPlaybookSchema
)
