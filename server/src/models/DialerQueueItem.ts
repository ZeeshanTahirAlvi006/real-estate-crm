import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IDialerQueueItem extends Document {
  brokerageId: mongoose.Types.ObjectId
  contactId: mongoose.Types.ObjectId
  agentId?: mongoose.Types.ObjectId
  priority: number // Higher = dialed earlier
  status: 'queued' | 'dialing' | 'completed' | 'skipped'
  lastAttemptAt?: Date
  attemptCount: number
  createdAt: Date
  updatedAt: Date
}

const dialerQueueItemSchema = new Schema<IDialerQueueItem>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    priority: {
      type: Number,
      default: 50,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'dialing', 'completed', 'skipped'],
      default: 'queued',
      index: true,
    },
    lastAttemptAt: {
      type: Date,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

dialerQueueItemSchema.index({ brokerageId: 1, status: 1, priority: -1, createdAt: 1 })

export const DialerQueueItem: Model<IDialerQueueItem> =
  mongoose.models.DialerQueueItem ||
  mongoose.model<IDialerQueueItem>('DialerQueueItem', dialerQueueItemSchema)
