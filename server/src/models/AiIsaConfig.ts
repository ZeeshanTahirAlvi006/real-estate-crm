import mongoose, { Document, Schema, Model } from 'mongoose'

export type IsaTone = 'professional' | 'friendly' | 'concise' | 'consultative'

export interface IAiIsaConfig extends Document {
  brokerageId: mongoose.Types.ObjectId
  isEnabled: boolean
  persona: {
    name: string
    tone: IsaTone
    agentName: string
    brokerageName: string
    customInstructions?: string
  }
  officeHoursOnly: boolean
  autoReplyChannels: Array<'sms' | 'whatsapp' | 'email'>
  autoPilotEnabled: boolean
  humanHandoffDelaySeconds: number
  qualificationThresholdScore: number
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const aiIsaConfigSchema = new Schema<IAiIsaConfig>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      unique: true,
      index: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    persona: {
      name: { type: String, default: 'PropPulse AI Assistant', trim: true },
      tone: {
        type: String,
        enum: ['professional', 'friendly', 'concise', 'consultative'],
        default: 'professional',
      },
      agentName: { type: String, default: 'AI ISA', trim: true },
      brokerageName: { type: String, default: '', trim: true },
      customInstructions: { type: String, trim: true, maxlength: 2000 },
    },
    officeHoursOnly: {
      type: Boolean,
      default: false,
    },
    autoReplyChannels: {
      type: [{ type: String, enum: ['sms', 'whatsapp', 'email'] }],
      default: ['sms', 'whatsapp', 'email'],
    },
    autoPilotEnabled: {
      type: Boolean,
      default: true,
    },
    humanHandoffDelaySeconds: {
      type: Number,
      default: 30,
      min: 0,
      max: 300,
    },
    qualificationThresholdScore: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
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

export const AiIsaConfig: Model<IAiIsaConfig> =
  mongoose.models.AiIsaConfig || mongoose.model<IAiIsaConfig>('AiIsaConfig', aiIsaConfigSchema)
