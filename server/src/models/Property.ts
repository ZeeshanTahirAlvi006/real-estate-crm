import mongoose, { Document, Schema, Model } from 'mongoose'

export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhouse'
  | 'multi_family'
  | 'commercial'
  | 'land'

export interface IPropertyAddress {
  street: string
  city: string
  state: string
  zipCode: string
  formattedAddress: string
}

export interface IProperty extends Document {
  brokerageId: mongoose.Types.ObjectId
  ownerContactId: mongoose.Types.ObjectId
  assignedAgentId?: mongoose.Types.ObjectId
  address: IPropertyAddress
  propertyType: PropertyType
  beds?: number
  baths?: number
  squareFeet?: number
  lotSizeSqft?: number
  yearBuilt?: number
  purchaseDate: Date
  purchasePrice: number
  originalLoanAmount?: number
  currentMortgageRate?: number // e.g. 3.25 for 3.25%
  estimatedMortgageBalance: number
  estimatedValue: number
  equity: number
  equityPercent: number
  probabilityOfSelling: number // 0-100 sell propensity score
  sellSignals: string[]
  lastAnalyzedAt?: Date
  lastAnniversaryTriggeredYear?: number
  notes?: string
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const propertyAddressSchema = new Schema<IPropertyAddress>(
  {
    street: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    zipCode: { type: String, trim: true, default: '' },
    formattedAddress: {
      type: String,
      required: [true, 'Formatted address is required'],
      trim: true,
    },
  },
  { _id: false }
)

const propertySchema = new Schema<IProperty>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    ownerContactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Owner Contact ID is required'],
      index: true,
    },
    assignedAgentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    address: {
      type: propertyAddressSchema,
      required: [true, 'Address is required'],
    },
    propertyType: {
      type: String,
      enum: ['single_family', 'condo', 'townhouse', 'multi_family', 'commercial', 'land'],
      default: 'single_family',
      index: true,
    },
    beds: {
      type: Number,
      min: 0,
    },
    baths: {
      type: Number,
      min: 0,
    },
    squareFeet: {
      type: Number,
      min: 0,
    },
    lotSizeSqft: {
      type: Number,
      min: 0,
    },
    yearBuilt: {
      type: Number,
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      index: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: 0,
    },
    originalLoanAmount: {
      type: Number,
      min: 0,
    },
    currentMortgageRate: {
      type: Number,
      min: 0,
      max: 30,
      default: 3.5,
    },
    estimatedMortgageBalance: {
      type: Number,
      required: [true, 'Estimated mortgage balance is required'],
      min: 0,
      default: 0,
    },
    estimatedValue: {
      type: Number,
      required: [true, 'Estimated market value is required'],
      min: 0,
      index: true,
    },
    equity: {
      type: Number,
      required: [true, 'Equity is required'],
      index: true,
    },
    equityPercent: {
      type: Number,
      required: [true, 'Equity percent is required'],
      min: 0,
      max: 100,
      index: true,
    },
    probabilityOfSelling: {
      type: Number,
      required: [true, 'Probability of selling is required'],
      min: 0,
      max: 100,
      default: 50,
      index: true,
    },
    sellSignals: {
      type: [String],
      default: [],
    },
    lastAnalyzedAt: {
      type: Date,
    },
    lastAnniversaryTriggeredYear: {
      type: Number,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
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

// Compound performance indexes for ultra-fast multi-tenant seller radar lookups & rankings
propertySchema.index({ brokerageId: 1, isDeleted: 1, probabilityOfSelling: -1 })
propertySchema.index({ brokerageId: 1, isDeleted: 1, equity: -1 })
propertySchema.index({ brokerageId: 1, isDeleted: 1, ownerContactId: 1 })
propertySchema.index({ 'address.formattedAddress': 'text' })

export const Property: Model<IProperty> =
  mongoose.models.Property || mongoose.model<IProperty>('Property', propertySchema)
