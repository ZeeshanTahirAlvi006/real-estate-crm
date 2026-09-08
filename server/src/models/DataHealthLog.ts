import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IDataHealthLog extends Document {
  brokerageId: mongoose.Types.ObjectId
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  duplicatesFound: number
  unverifiedPhones: number
  invalidEmails: number
  missingFields: number
  totalContactsScanned: number
  scannedAt: Date
  createdAt: Date
  updatedAt: Date
}

const dataHealthLogSchema = new Schema<IDataHealthLog>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F'],
      required: true,
    },
    duplicatesFound: {
      type: Number,
      default: 0,
    },
    unverifiedPhones: {
      type: Number,
      default: 0,
    },
    invalidEmails: {
      type: Number,
      default: 0,
    },
    missingFields: {
      type: Number,
      default: 0,
    },
    totalContactsScanned: {
      type: Number,
      default: 0,
    },
    scannedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

dataHealthLogSchema.index({ brokerageId: 1, scannedAt: -1 })

export const DataHealthLog: Model<IDataHealthLog> =
  mongoose.models.DataHealthLog ||
  mongoose.model<IDataHealthLog>('DataHealthLog', dataHealthLogSchema)
