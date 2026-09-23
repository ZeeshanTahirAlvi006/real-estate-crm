// models/WhatsAppIntegration.ts (Mongoose)
import mongoose, { Schema, Document, Model } from 'mongoose'
import { WAState, ALL_WA_STATES, WAEvent } from '../integrations/whatsapp/fsm.js'

export interface IWhatsAppIntegrationHistoryItem {
  state: WAState
  event: WAEvent | string
  at: Date
  meta?: Record<string, unknown>
}

export interface IWhatsAppIntegration extends Document {
  tenantId: mongoose.Types.ObjectId
  status: WAState
  wabaId?: string
  phoneNumberId?: string
  businessTokenEncrypted?: string
  launchedAt?: Date
  history: IWhatsAppIntegrationHistoryItem[]
  createdAt: Date
  updatedAt: Date
}

const WhatsAppIntegrationSchema = new Schema<IWhatsAppIntegration>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ALL_WA_STATES,
      required: true,
      default: 'NOT_CONNECTED',
      index: true,
    },
    wabaId: {
      type: String,
      trim: true,
    },
    phoneNumberId: {
      type: String,
      trim: true,
    },
    businessTokenEncrypted: {
      type: String,
      select: false,
    },
    launchedAt: {
      type: Date,
    },
    history: [
      {
        state: {
          type: String,
          enum: ALL_WA_STATES,
          required: true,
        },
        event: {
          type: String,
          required: true,
        },
        at: {
          type: Date,
          default: Date.now,
        },
        meta: {
          type: Schema.Types.Mixed,
        },
      },
    ],
  },
  {
    collection: 'whatsapp_integrations',
    timestamps: true,
  }
)

// Index for fast multi-tenant inbound webhook resolution by phone_number_id & waba_id
WhatsAppIntegrationSchema.index({ phoneNumberId: 1 }, { sparse: true })
WhatsAppIntegrationSchema.index({ wabaId: 1 }, { sparse: true })
WhatsAppIntegrationSchema.index({ tenantId: 1, status: 1 })

export const WhatsAppIntegration: Model<IWhatsAppIntegration> =
  mongoose.models.WhatsAppIntegration ||
  mongoose.model<IWhatsAppIntegration>('WhatsAppIntegration', WhatsAppIntegrationSchema)
