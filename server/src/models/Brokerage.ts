import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IWhatsAppConfig {
  wabaId?: string
  phoneNumberId?: string
  displayPhoneNumber?: string
  accessTokenEncrypted?: string
  qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
  tier?: 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'TIER_UNLIMITED'
  status: 'connected' | 'disconnected' | 'pending'
  verifiedName?: string
  lastTestedAt?: Date
}

export interface IBrokerage extends Document {
  name: string
  subdomain?: string
  plan: 'growth' | 'pro' | 'enterprise'
  logoUrl?: string
  timezone: string
  isActive: boolean
  whatsappConfig?: IWhatsAppConfig
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const brokerageSchema = new Schema<IBrokerage>(
  {
    name: {
      type: String,
      required: [true, 'Brokerage name is required'],
      trim: true,
      minlength: [2, 'Brokerage name must be at least 2 characters'],
      maxlength: [100, 'Brokerage name cannot exceed 100 characters'],
    },
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['growth', 'pro', 'enterprise'],
      default: 'growth',
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    whatsappConfig: {
      wabaId: { type: String, trim: true },
      phoneNumberId: { type: String, trim: true, sparse: true },
      displayPhoneNumber: { type: String, trim: true },
      accessTokenEncrypted: { type: String, select: false },
      qualityRating: {
        type: String,
        enum: ['GREEN', 'YELLOW', 'RED', 'UNKNOWN'],
        default: 'UNKNOWN',
      },
      tier: {
        type: String,
        enum: ['TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'],
        default: 'TIER_1K',
      },
      status: {
        type: String,
        enum: ['connected', 'disconnected', 'pending'],
        default: 'disconnected',
      },
      verifiedName: { type: String, trim: true },
      lastTestedAt: { type: Date },
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

// Index for rapid multi-tenant inbound webhook resolution
brokerageSchema.index({ 'whatsappConfig.phoneNumberId': 1 }, { sparse: true })

export const Brokerage: Model<IBrokerage> =
  mongoose.models.Brokerage || mongoose.model<IBrokerage>('Brokerage', brokerageSchema)
