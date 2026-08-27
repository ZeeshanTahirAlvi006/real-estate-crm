import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IVoicemailDrop extends Document {
  brokerageId: mongoose.Types.ObjectId
  name: string
  title: string
  audioUrl: string
  durationSeconds: number
  category: 'general' | 'seller_equity' | 'price_drop' | 'followup'
  isDefault: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const voicemailDropSchema = new Schema<IVoicemailDrop>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    durationSeconds: {
      type: Number,
      default: 25,
      min: 1,
    },
    category: {
      type: String,
      enum: ['general', 'seller_equity', 'price_drop', 'followup'],
      default: 'followup',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

voicemailDropSchema.index({ brokerageId: 1, isDefault: 1 })

export const VoicemailDrop: Model<IVoicemailDrop> =
  mongoose.models.VoicemailDrop ||
  mongoose.model<IVoicemailDrop>('VoicemailDrop', voicemailDropSchema)
