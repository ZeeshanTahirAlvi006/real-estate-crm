import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IWhatsAppButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'
  text: string
  url?: string
  phoneNumber?: string
}

export interface IWhatsAppTemplate extends Document {
  brokerageId: mongoose.Types.ObjectId
  name: string
  title: string
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
  language: string
  headerType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE'
  headerText?: string
  bodyText: string
  footerText?: string
  buttons?: IWhatsAppButton[]
  variables: string[]
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  isDefault: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const whatsAppTemplateSchema = new Schema<IWhatsAppTemplate>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'],
      default: 'UTILITY',
    },
    language: {
      type: String,
      default: 'en_US',
    },
    headerType: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'NONE'],
      default: 'NONE',
    },
    headerText: {
      type: String,
    },
    bodyText: {
      type: String,
      required: true,
    },
    footerText: {
      type: String,
    },
    buttons: [
      {
        type: {
          type: String,
          enum: ['QUICK_REPLY', 'URL', 'PHONE_NUMBER'],
          required: true,
        },
        text: { type: String, required: true },
        url: { type: String },
        phoneNumber: { type: String },
      },
    ],
    variables: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['APPROVED', 'PENDING', 'REJECTED'],
      default: 'APPROVED',
    },
    isDefault: {
      type: Boolean,
      default: false,
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

whatsAppTemplateSchema.index({ brokerageId: 1, name: 1 })

export const WhatsAppTemplate: Model<IWhatsAppTemplate> =
  mongoose.models.WhatsAppTemplate ||
  mongoose.model<IWhatsAppTemplate>('WhatsAppTemplate', whatsAppTemplateSchema)
