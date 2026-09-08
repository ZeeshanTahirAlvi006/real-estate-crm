import mongoose, { Document, Schema, Model } from 'mongoose'

export type ActivityType =
  | 'call'
  | 'email'
  | 'sms'
  | 'note'
  | 'voice_note'
  | 'stage_change'
  | 'whatsapp'
  | 'meeting'
  | 'system'
  | 'lead_reinquiry'
  | 'lead_routed'
  | 'lead_escalated'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'transaction_created'
  | 'contact_merged'

export interface IActivity extends Document {
  contactId: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  type: ActivityType
  description: string
  metadata?: Record<string, string>
  createdBy?: mongoose.Types.ObjectId
  createdByName?: string
  createdAt: Date
  updatedAt: Date
}

const activitySchema = new Schema<IActivity>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'call',
        'email',
        'sms',
        'note',
        'voice_note',
        'stage_change',
        'whatsapp',
        'meeting',
        'system',
        'lead_reinquiry',
        'lead_routed',
        'lead_escalated',
        'deal_created',
        'deal_stage_changed',
        'transaction_created',
        'contact_merged',
      ],
      required: [true, 'Activity type is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Activity description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Index for chronological timeline retrieval per contact and per brokerage
activitySchema.index({ contactId: 1, createdAt: -1 })
activitySchema.index({ brokerageId: 1, createdAt: -1 })

export const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', activitySchema)
