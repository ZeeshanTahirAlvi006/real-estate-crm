import mongoose, { Document, Schema } from 'mongoose'

export interface IConversation extends Document {
  brokerageId: mongoose.Types.ObjectId
  contactId: mongoose.Types.ObjectId
  contactName: string
  contactPhone: string
  contactEmail?: string
  contactAvatar?: string
  assignedAgentId?: mongoose.Types.ObjectId
  assignedAgentName?: string
  lastMessageText: string
  lastMessageAt: Date
  lastChannel: 'sms' | 'whatsapp' | 'email'
  unreadCount: number
  aiIsaEnabled: boolean
  status: 'active' | 'archived' | 'snoozed'
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new Schema<IConversation>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactAvatar: {
      type: String,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    assignedAgentName: {
      type: String,
      trim: true,
    },
    lastMessageText: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastChannel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email'],
      default: 'sms',
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    aiIsaEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'snoozed'],
      default: 'active',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for querying brokerage conversations sorted by lastMessageAt
conversationSchema.index({ brokerageId: 1, lastMessageAt: -1 })
conversationSchema.index({ brokerageId: 1, contactId: 1 })

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema)
