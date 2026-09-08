import mongoose, { Document, Schema, Model } from 'mongoose'
import { cacheSet } from '../config/redis.js'
import { logger } from '../utils/logger.js'

export interface IFeatureFlag extends Document {
  key: string
  name: string
  isEnabled: boolean
  description?: string
  disabledReason?: string
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// 9 Core System Features
export const DEFAULT_FEATURE_FLAGS = [
  { key: 'deals_pipeline', name: 'Deals & Visual Pipeline', isEnabled: true, description: 'Multi-pipeline Kanban deal board, probability forecasting, and commission calculations' },
  { key: 'ai_chatbot', name: 'AI Chatbot & Copilot', isEnabled: true, description: 'Lead qualifier bot and internal agent assistant' },
  { key: 'dialer', name: 'Integrated Dialer & Telephony', isEnabled: true, description: 'WebRTC single/multi-line power dialer and call logging' },
  { key: 'ai_isa', name: 'Autonomous AI ISA Engine', isEnabled: true, description: 'Autonomous multi-channel lead outreach and reactivation' },
  { key: 'lead_ingestion', name: 'Lead Ingestion & Webhooks', isEnabled: true, description: 'Third-party portal webhooks and automated lead routing' },
  { key: 'data_health', name: 'Data Health & Deduplication', isEnabled: true, description: 'Fuzzy duplicate detection, MX check, and database health scoring' },
  { key: 'esign', name: 'eSignature & PDF Documents', isEnabled: true, description: 'Electronic signature workflows and PDF generation' },
  { key: 'seller_radar', name: 'Seller Radar & Micro-CMA', isEnabled: true, description: 'Predictive seller equity scanner and comparative market analysis' },
  { key: 'export', name: 'Data Export (CSV & PDF)', isEnabled: true, description: 'Export contacts, deals, and reports to CSV and PDF formats' },
  { key: 'transcription', name: 'Whisper Voice Transcriber', isEnabled: true, description: 'Agent voice note audio transcription, entity extraction, and auto CRM updates' },
] as const

const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    disabledReason: {
      type: String,
      trim: true,
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

export const FeatureFlag: Model<IFeatureFlag> =
  mongoose.models.FeatureFlag || mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema)

// Initialize and seed default feature flags into DB and Redis cache
export const initializeDefaultFeatureFlags = async (): Promise<void> => {
  try {
    for (const flag of DEFAULT_FEATURE_FLAGS) {
      let existing = await FeatureFlag.findOne({ key: flag.key })
      if (!existing) {
        existing = await FeatureFlag.create(flag)
        logger.info(`Initialized feature flag: [${flag.key}] = ENABLED`)
      }
      // Warm up Redis cache with 1 day TTL
      await cacheSet(`feature_flag:${flag.key}`, existing.isEnabled ? '1' : '0', 86400)
    }
  } catch (error) {
    logger.warn('Failed to seed default feature flags:', error)
  }
}
