import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IBrokerage extends Document {
  name: string
  subdomain?: string
  plan: 'growth' | 'pro' | 'enterprise'
  logoUrl?: string
  timezone: string
  isActive: boolean
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

export const Brokerage: Model<IBrokerage> =
  mongoose.models.Brokerage || mongoose.model<IBrokerage>('Brokerage', brokerageSchema)
