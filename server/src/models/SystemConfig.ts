import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IQuotaConfig {
  dailyUserRequests?: number
  dailyBrokerageRequests?: number
  dailyUserAiTokens?: number
  dailyBrokerageAiTokens?: number
  dailyUserSms?: number
  dailyBrokerageSms?: number
}

export interface IRateLimitConfig {
  superAdmin?: number
  brokerageOwner?: number
  teamLead?: number
  agent?: number
  lead?: number
  unauthenticated?: number
}

export interface ICircuitBreakerConfig {
  failureThreshold?: number
  cooldownMs?: number
}

export interface ISystemConfig extends Document {
  brokerageId?: mongoose.Types.ObjectId // If null/undefined, this is global system config
  quotas: IQuotaConfig
  rateLimits: IRateLimitConfig
  circuitBreaker: ICircuitBreakerConfig
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      unique: true,
      sparse: true,
      index: true,
    },
    quotas: {
      dailyUserRequests: { type: Number },
      dailyBrokerageRequests: { type: Number },
      dailyUserAiTokens: { type: Number },
      dailyBrokerageAiTokens: { type: Number },
      dailyUserSms: { type: Number },
      dailyBrokerageSms: { type: Number },
    },
    rateLimits: {
      superAdmin: { type: Number },
      brokerageOwner: { type: Number },
      teamLead: { type: Number },
      agent: { type: Number },
      lead: { type: Number },
      unauthenticated: { type: Number },
    },
    circuitBreaker: {
      failureThreshold: { type: Number },
      cooldownMs: { type: Number },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

export const SystemConfig: Model<ISystemConfig> =
  mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema)
