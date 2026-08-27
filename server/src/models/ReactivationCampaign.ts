import mongoose, { Document, Schema, Model } from 'mongoose'

export type CampaignStatus = 'active' | 'paused' | 'draft' | 'completed'
export type CampaignChannel = 'sms' | 'whatsapp' | 'email'

export interface IReactivationCampaign extends Document {
  brokerageId: mongoose.Types.ObjectId
  name: string
  status: CampaignStatus
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  totalLeads: number
  contactedCount: number
  engagedCount: number
  convertedCount: number
  lastExecutedAt?: Date
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const reactivationCampaignSchema = new Schema<IReactivationCampaign>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'draft', 'completed'],
      default: 'active',
      index: true,
    },
    targetSegment: {
      type: String,
      required: [true, 'Target segment is required'],
      trim: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email'],
      default: 'sms',
    },
    messageTemplate: {
      type: String,
      required: [true, 'Message template is required'],
    },
    totalLeads: {
      type: Number,
      default: 0,
    },
    contactedCount: {
      type: Number,
      default: 0,
    },
    engagedCount: {
      type: Number,
      default: 0,
    },
    convertedCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
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

reactivationCampaignSchema.index({ brokerageId: 1, status: 1, createdAt: -1 })

export const ReactivationCampaign: Model<IReactivationCampaign> =
  mongoose.models.ReactivationCampaign ||
  mongoose.model<IReactivationCampaign>('ReactivationCampaign', reactivationCampaignSchema)
