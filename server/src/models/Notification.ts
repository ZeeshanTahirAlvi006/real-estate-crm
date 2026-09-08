import mongoose, { Document, Schema } from 'mongoose'

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  isRead: boolean
  isDeleted: boolean
  deletedAt?: Date
  linkTo?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['new_lead', 'stage_change', 'data_health', 'team_activity', 'system', 'new_message'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
    },
    linkTo: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

notificationSchema.index({ userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
