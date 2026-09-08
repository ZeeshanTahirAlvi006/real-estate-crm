import mongoose, { Document, Schema, Model } from 'mongoose'

export const API_KEY_SCOPES = ['webhook', 'read', 'import', 'export'] as const
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export interface IApiKey extends Document {
  brokerageId: mongoose.Types.ObjectId
  name: string
  keyPrefix: string
  keyHash: string
  scopes: ApiKeyScope[]
  lastUsedAt?: Date
  expiresAt?: Date
  revokedAt?: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const apiKeySchema = new Schema<IApiKey>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
      maxlength: [80, 'API key name cannot exceed 80 characters'],
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    keyHash: {
      type: String,
      required: true,
      select: false,
      unique: true,
    },
    scopes: {
      type: [String],
      enum: API_KEY_SCOPES,
      default: ['webhook'],
    },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date },
    revokedAt: { type: Date, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
)

apiKeySchema.index({ brokerageId: 1, revokedAt: 1 })

export const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', apiKeySchema)
