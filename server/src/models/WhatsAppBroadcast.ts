import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IWhatsAppBroadcast extends Document {
  brokerageId: mongoose.Types.ObjectId
  title: string
  templateId?: mongoose.Types.ObjectId
  templateName: string
  targetAudience: 'all' | 'dormant' | 'high_score' | 'buyers' | 'sellers' | 'custom_tag'
  targetTag?: string
  recipientCount: number
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
  status: 'draft' | 'queued' | 'processing' | 'completed' | 'failed'
  customVariables?: Record<string, string>
  scheduledAt?: Date
  completedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const whatsAppBroadcastSchema = new Schema<IWhatsAppBroadcast>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppTemplate',
    },
    templateName: {
      type: String,
      required: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'dormant', 'high_score', 'buyers', 'sellers', 'custom_tag'],
      default: 'all',
    },
    targetTag: {
      type: String,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    sentCount: {
      type: Number,
      default: 0,
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },
    customVariables: {
      type: Map,
      of: String,
      default: {},
    },
    scheduledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

whatsAppBroadcastSchema.index({ brokerageId: 1, createdAt: -1 })

export const WhatsAppBroadcast: Model<IWhatsAppBroadcast> =
  mongoose.models.WhatsAppBroadcast ||
  mongoose.model<IWhatsAppBroadcast>('WhatsAppBroadcast', whatsAppBroadcastSchema)
