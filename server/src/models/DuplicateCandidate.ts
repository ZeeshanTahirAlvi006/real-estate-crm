import mongoose, { Document, Schema, Model } from 'mongoose'

export type DuplicateStatus = 'pending' | 'merged' | 'dismissed'

export interface IDuplicateCandidate extends Document {
  brokerageId: mongoose.Types.ObjectId
  primaryContactId: mongoose.Types.ObjectId
  secondaryContactId: mongoose.Types.ObjectId
  matchScore: number // 0–100 confidence
  matchFields: string[] // ['email', 'phone', 'name', 'address']
  status: DuplicateStatus
  mergedAt?: Date
  dismissedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const duplicateCandidateSchema = new Schema<IDuplicateCandidate>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    primaryContactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Primary Contact ID is required'],
      index: true,
    },
    secondaryContactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Secondary Contact ID is required'],
      index: true,
    },
    matchScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    matchFields: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'merged', 'dismissed'],
      default: 'pending',
      index: true,
    },
    mergedAt: {
      type: Date,
    },
    dismissedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Unique pair per brokerage to prevent duplicate candidate rows
duplicateCandidateSchema.index(
  { brokerageId: 1, primaryContactId: 1, secondaryContactId: 1 },
  { unique: true }
)
duplicateCandidateSchema.index({ brokerageId: 1, status: 1, createdAt: -1 })

export const DuplicateCandidate: Model<IDuplicateCandidate> =
  mongoose.models.DuplicateCandidate ||
  mongoose.model<IDuplicateCandidate>('DuplicateCandidate', duplicateCandidateSchema)
