import mongoose, { Document, Schema, Model } from 'mongoose'
import { LEAD_SOURCE_TYPES, LeadSourceType } from '../utils/constants.js'

export interface IFieldMapping {
  [sourceField: string]: string
}

export interface ILeadSourceConfig {
  fieldMapping?: IFieldMapping
}

export interface ILeadSource extends Document {
  name: string
  type: LeadSourceType
  webhookSecret: string
  captureKey: string
  isActive: boolean
  leadCount: number
  config: ILeadSourceConfig
  brokerageId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leadSourceSchema = new Schema<ILeadSource>(
  {
    name: {
      type: String,
      required: [true, 'Lead source name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: Object.values(LEAD_SOURCE_TYPES),
      required: [true, 'Lead source type is required'],
      index: true,
    },
    webhookSecret: {
      type: String,
      required: true,
      select: false, // Never return encrypted secret by default
    },
    captureKey: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    leadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    config: {
      fieldMapping: {
        type: Map,
        of: String,
        default: {},
      },
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
  },
  {
    timestamps: true,
  }
)

// Compound indexes for tenant-scoped queries and unique capture key lookup
leadSourceSchema.index({ brokerageId: 1, isActive: 1 })
leadSourceSchema.index({ captureKey: 1 }, { unique: true, sparse: true })
leadSourceSchema.index({ brokerageId: 1, name: 1 }, { unique: true })

export const LeadSource: Model<ILeadSource> =
  mongoose.models.LeadSource || mongoose.model<ILeadSource>('LeadSource', leadSourceSchema)
