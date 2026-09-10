import mongoose, { Document, Schema, Model } from 'mongoose'

export type ContactStatus = 'active' | 'inactive' | 'do_not_contact' | 'archived'

export interface ISocialLinks {
  linkedin?: string
  facebook?: string
  instagram?: string
}

export interface ITcpaConsent {
  sms: boolean
  call: boolean
  whatsapp: boolean
  email: boolean
  doubleOptInVerified: boolean
  verificationCode?: string
  verificationCodeExpiresAt?: Date
  consentSource?: 'web_form' | 'lead_portal' | 'verbal' | 'inbound_sms' | 'written'
  consentIp?: string
  consentDate?: Date
  optOutReason?: string
}

export interface IContact extends Document {
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource: string
  leadScore: number
  tags: string[]
  status: ContactStatus
  assignedAgentId?: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  notes?: string
  propertyInterests: string[]
  socialLinks?: ISocialLinks
  lastContactedAt?: Date
  nextFollowUpDate?: Date
  assignedAt?: Date
  isAcknowledged: boolean
  leadSourceId?: mongoose.Types.ObjectId
  originalPayload?: Record<string, unknown>
  inquiryCount: number
  dncStatus?: 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'
  optedOutAt?: Date
  tcpaConsent?: ITcpaConsent
  portalUserId?: mongoose.Types.ObjectId
  portalEnabled?: boolean
  portalAccessEmail?: string
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const contactSchema = new Schema<IContact>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v: string) => !v || /^\S+@\S+\.\S+$/.test(v),
        message: 'Please enter a valid email address',
      },
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    secondaryPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    leadSource: {
      type: String,
      default: 'Manual Entry',
      trim: true,
      index: true,
    },
    leadScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'do_not_contact', 'archived'],
      default: 'active',
      index: true,
    },
    dncStatus: {
      type: String,
      enum: ['clean', 'dnc_federal', 'dnc_state', 'opted_out', 'unverified'],
      default: 'clean',
      index: true,
    },
    optedOutAt: {
      type: Date,
      default: null,
    },
    tcpaConsent: {
      sms: { type: Boolean, default: true },
      call: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      doubleOptInVerified: { type: Boolean, default: false },
      verificationCode: { type: String, select: false },
      verificationCodeExpiresAt: { type: Date },
      consentSource: {
        type: String,
        enum: ['web_form', 'lead_portal', 'verbal', 'inbound_sms', 'written'],
        default: 'web_form',
      },
      consentIp: { type: String, trim: true },
      consentDate: { type: Date, default: Date.now },
      optOutReason: { type: String, trim: true },
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    propertyInterests: {
      type: [String],
      default: [],
    },
    socialLinks: {
      linkedin: { type: String, trim: true },
      facebook: { type: String, trim: true },
      instagram: { type: String, trim: true },
    },
    lastContactedAt: {
      type: Date,
    },
    nextFollowUpDate: {
      type: Date,
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
      index: true,
    },
    leadSourceId: {
      type: Schema.Types.ObjectId,
      ref: 'LeadSource',
    },
    originalPayload: {
      type: Schema.Types.Mixed,
    },
    inquiryCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    portalUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    portalEnabled: {
      type: Boolean,
      default: false,
    },
    portalAccessEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

// Compound performance indexes for multi-tenant querying and deduplication
contactSchema.index({ brokerageId: 1, email: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, phone: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, firstName: 1, lastName: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, assignedAgentId: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, status: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, nextFollowUpDate: 1 })
contactSchema.index({ brokerageId: 1, isDeleted: 1 })
contactSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })
contactSchema.index({ brokerageId: 1, isDeleted: 1, leadScore: 1 })
contactSchema.index({ brokerageId: 1, isDeleted: 1, leadSource: 1 })
contactSchema.index({ brokerageId: 1, assignedAgentId: 1, isDeleted: 1, createdAt: -1 })
contactSchema.index({ isDeleted: 1, createdAt: -1 })
contactSchema.index({ isDeleted: 1, status: 1, createdAt: -1 })

export const Contact: Model<IContact> =
  mongoose.models.Contact || mongoose.model<IContact>('Contact', contactSchema)
