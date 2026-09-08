import mongoose, { Document, Schema, Model } from 'mongoose'

export const INTEGRATION_PROVIDERS = ['zapier', 'quickbooks'] as const
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

export const INTEGRATION_STATUSES = ['connected', 'disconnected', 'error'] as const
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number]

export interface IIntegration extends Document {
  brokerageId: mongoose.Types.ObjectId
  provider: IntegrationProvider
  name: string
  status: IntegrationStatus
  credentialsEncrypted?: string
  config: Record<string, string>
  lastTestedAt?: Date
  lastError?: string
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const integrationSchema = new Schema<IIntegration>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: INTEGRATION_PROVIDERS,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Integration name cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: INTEGRATION_STATUSES,
      default: 'disconnected',
      index: true,
    },
    credentialsEncrypted: {
      type: String,
      select: false,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastTestedAt: { type: Date },
    lastError: { type: String, trim: true, maxlength: 500 },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
)

integrationSchema.index({ brokerageId: 1, provider: 1 }, { unique: true })

export const Integration: Model<IIntegration> =
  mongoose.models.Integration || mongoose.model<IIntegration>('Integration', integrationSchema)
