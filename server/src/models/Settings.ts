import mongoose, { Document, Schema, Model } from 'mongoose'

export const SUPPORTED_CURRENCIES = ['PKR', 'USD', 'EUR', 'GBP', 'AED'] as const
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]

export const NOTIFICATION_EVENT_TYPES = [
  'new_lead',
  'stage_change',
  'data_health',
  'team_activity',
  'system',
] as const
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

export interface INotificationPref {
  type: NotificationEventType
  email: boolean
  push: boolean
  sms: boolean
}

export interface IBrokerageConfig {
  timezone: string
  currency: SupportedCurrency
  marketType: 'north_america' | 'uae_dubai' | 'uk_europe' | 'apac'
  transferTaxRate: number
  offPlanEnabled: boolean
}

export interface ISettings extends Document {
  brokerageId: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  scope: 'user' | 'brokerage'
  notificationPrefs: INotificationPref[]
  brokerageConfig?: IBrokerageConfig
  createdBy: mongoose.Types.ObjectId
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export const DEFAULT_NOTIFICATION_PREFS: INotificationPref[] = [
  { type: 'new_lead', email: true, push: true, sms: false },
  { type: 'stage_change', email: true, push: true, sms: false },
  { type: 'data_health', email: true, push: false, sms: false },
  { type: 'team_activity', email: false, push: true, sms: false },
  { type: 'system', email: true, push: false, sms: false },
]

export const DEFAULT_BROKERAGE_CONFIG: IBrokerageConfig = {
  timezone: 'America/New_York',
  currency: 'USD',
  marketType: 'north_america',
  transferTaxRate: 0,
  offPlanEnabled: false,
}

const notificationPrefSchema = new Schema<INotificationPref>(
  {
    type: { type: String, enum: NOTIFICATION_EVENT_TYPES, required: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
  { _id: false }
)

const brokerageConfigSchema = new Schema<IBrokerageConfig>(
  {
    timezone: { type: String, default: 'America/New_York', trim: true },
    currency: { type: String, enum: SUPPORTED_CURRENCIES, default: 'USD' },
    marketType: {
      type: String,
      enum: ['north_america', 'uae_dubai', 'uk_europe', 'apac'],
      default: 'north_america',
    },
    transferTaxRate: { type: Number, min: 0, max: 100, default: 0 },
    offPlanEnabled: { type: Boolean, default: false },
  },
  { _id: false }
)

const settingsSchema = new Schema<ISettings>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    scope: {
      type: String,
      enum: ['user', 'brokerage'],
      required: true,
      index: true,
    },
    notificationPrefs: {
      type: [notificationPrefSchema],
      default: DEFAULT_NOTIFICATION_PREFS,
    },
    brokerageConfig: {
      type: brokerageConfigSchema,
    },
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

settingsSchema.index({ brokerageId: 1, scope: 1, userId: 1 }, { unique: true, sparse: true })
settingsSchema.index({ brokerageId: 1, scope: 1 })

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema)
