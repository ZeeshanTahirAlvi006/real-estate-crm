import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  contactId: mongoose.Types.ObjectId
  sender: 'lead' | 'agent' | 'ai_isa' | 'system'
  senderName: string
  senderId?: mongoose.Types.ObjectId
  channel: 'sms' | 'whatsapp' | 'email'
  body: string
  direction: 'inbound' | 'outbound'
  deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed'
  mediaUrl?: string
  mediaType?: string
  fairHousingFlags?: string[]
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
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
    sender: {
      type: String,
      enum: ['lead', 'agent', 'ai_isa', 'system'],
      default: 'agent',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound',
      required: true,
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent',
    },
    mediaUrl: {
      type: String,
    },
    mediaType: {
      type: String,
    },
    fairHousingFlags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

messageSchema.index({ conversationId: 1, createdAt: 1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)
