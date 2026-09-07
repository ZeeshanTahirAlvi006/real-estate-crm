import mongoose, { Document, Schema, Model } from 'mongoose'

export interface ISubjectPropertySnapshot {
  formattedAddress: string
  beds?: number
  baths?: number
  squareFeet?: number
  propertyType?: string
  purchaseDate?: Date
  purchasePrice?: number
  estimatedValue: number
  estimatedMortgageBalance?: number
  equity: number
  equityPercent: number
}

export interface IValuationRange {
  low: number
  target: number
  high: number
  confidenceScore: number // 0-100
}

export interface IComparableComp {
  address: string
  soldPrice: number
  beds?: number
  baths?: number
  squareFeet?: number
  pricePerSqft?: number
  soldDate?: Date
  distanceMiles?: number
  daysOnMarket?: number
}

export interface IAgentBranding {
  name: string
  phone: string
  email: string
  brokerageName: string
  avatarUrl?: string
  licenseNumber?: string
}

export interface ICmaReport extends Document {
  shareId: string // Clean unique slug for shareable public URLs (e.g. cma_9f8a7b6c5d)
  brokerageId: mongoose.Types.ObjectId
  propertyId?: mongoose.Types.ObjectId
  contactId?: mongoose.Types.ObjectId
  createdById: mongoose.Types.ObjectId
  subjectProperty: ISubjectPropertySnapshot
  valuationRange: IValuationRange
  comparables: IComparableComp[]
  activeBuyerDemandCount: number
  agentBranding: IAgentBranding
  customNarrative?: string
  notes?: string
  viewCount: number
  lastViewedAt?: Date
  expiresAt: Date
  status: 'active' | 'expired' | 'archived'
  createdAt: Date
  updatedAt: Date
}

const cmaReportSchema = new Schema<ICmaReport>(
  {
    shareId: {
      type: String,
      required: [true, 'Share ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator User ID is required'],
      index: true,
    },
    subjectProperty: {
      formattedAddress: { type: String, required: true },
      beds: { type: Number },
      baths: { type: Number },
      squareFeet: { type: Number },
      propertyType: { type: String, default: 'single_family' },
      purchaseDate: { type: Date },
      purchasePrice: { type: Number },
      estimatedValue: { type: Number, required: true },
      estimatedMortgageBalance: { type: Number, default: 0 },
      equity: { type: Number, required: true },
      equityPercent: { type: Number, required: true },
    },
    valuationRange: {
      low: { type: Number, required: true },
      target: { type: Number, required: true },
      high: { type: Number, required: true },
      confidenceScore: { type: Number, default: 92, min: 0, max: 100 },
    },
    comparables: [
      {
        address: { type: String, required: true },
        soldPrice: { type: Number, required: true },
        beds: { type: Number },
        baths: { type: Number },
        squareFeet: { type: Number },
        pricePerSqft: { type: Number },
        soldDate: { type: Date },
        distanceMiles: { type: Number },
        daysOnMarket: { type: Number },
      },
    ],
    activeBuyerDemandCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    agentBranding: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      brokerageName: { type: String, required: true },
      avatarUrl: { type: String },
      licenseNumber: { type: String },
    },
    customNarrative: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastViewedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

cmaReportSchema.index({ brokerageId: 1, createdAt: -1 })
cmaReportSchema.index({ propertyId: 1, createdAt: -1 })

export const CmaReport: Model<ICmaReport> =
  mongoose.models.CmaReport || mongoose.model<ICmaReport>('CmaReport', cmaReportSchema)
