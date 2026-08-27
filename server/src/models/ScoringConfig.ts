import mongoose, { Document, Schema, Model } from 'mongoose'
import { DEFAULT_BASE_SCORE } from '../utils/constants.js'

export interface ISourceWeight {
  sourceType: string
  points: number
}

export interface IKeywordWeight {
  keyword: string
  points: number
}

export interface IPriceTierWeight {
  minPrice: number
  maxPrice: number
  points: number
}

export interface IMessageLengthBonus {
  minLength: number
  points: number
}

export interface IScoringConfig extends Document {
  brokerageId: mongoose.Types.ObjectId
  sourceWeights: ISourceWeight[]
  keywordWeights: IKeywordWeight[]
  priceTierWeights: IPriceTierWeight[]
  financingBonus: number
  messageLengthBonus: IMessageLengthBonus
  baseScore: number
  createdAt: Date
  updatedAt: Date
}

const sourceWeightSchema = new Schema<ISourceWeight>(
  {
    sourceType: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: -50, max: 50 },
  },
  { _id: false }
)

const keywordWeightSchema = new Schema<IKeywordWeight>(
  {
    keyword: { type: String, required: true, trim: true, lowercase: true },
    points: { type: Number, required: true, min: -50, max: 50 },
  },
  { _id: false }
)

const priceTierWeightSchema = new Schema<IPriceTierWeight>(
  {
    minPrice: { type: Number, required: true, min: 0 },
    maxPrice: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: -50, max: 50 },
  },
  { _id: false }
)

const messageLengthBonusSchema = new Schema<IMessageLengthBonus>(
  {
    minLength: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: -50, max: 50 },
  },
  { _id: false }
)

const scoringConfigSchema = new Schema<IScoringConfig>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      unique: true,
      index: true,
    },
    sourceWeights: {
      type: [sourceWeightSchema],
      default: [
        { sourceType: 'zillow', points: 15 },
        { sourceType: 'realtor', points: 12 },
        { sourceType: 'meta_ads', points: 10 },
        { sourceType: 'google_ads', points: 10 },
        { sourceType: 'website', points: 8 },
        { sourceType: 'webhook', points: 5 },
        { sourceType: 'manual', points: 0 },
      ],
    },
    keywordWeights: {
      type: [keywordWeightSchema],
      default: [
        { keyword: 'pre-approved', points: 15 },
        { keyword: 'pre approved', points: 15 },
        { keyword: 'cash buyer', points: 20 },
        { keyword: 'urgent', points: 10 },
        { keyword: 'asap', points: 8 },
        { keyword: 'relocating', points: 10 },
        { keyword: 'investor', points: 12 },
        { keyword: 'first-time buyer', points: 5 },
        { keyword: 'mortgage', points: 5 },
      ],
    },
    priceTierWeights: {
      type: [priceTierWeightSchema],
      default: [
        { minPrice: 0, maxPrice: 200000, points: 0 },
        { minPrice: 200000, maxPrice: 500000, points: 5 },
        { minPrice: 500000, maxPrice: 1000000, points: 10 },
        { minPrice: 1000000, maxPrice: 999999999, points: 15 },
      ],
    },
    financingBonus: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },
    messageLengthBonus: {
      type: messageLengthBonusSchema,
      default: { minLength: 100, points: 5 },
    },
    baseScore: {
      type: Number,
      default: DEFAULT_BASE_SCORE,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
)

export const ScoringConfig: Model<IScoringConfig> =
  mongoose.models.ScoringConfig || mongoose.model<IScoringConfig>('ScoringConfig', scoringConfigSchema)
