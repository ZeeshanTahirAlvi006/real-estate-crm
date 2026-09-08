import mongoose, { Document, Schema, Model } from 'mongoose'

export interface IUploadedFile extends Document {
  brokerageId: mongoose.Types.ObjectId
  uploadedBy: mongoose.Types.ObjectId
  originalName: string
  storageKey: string
  url: string
  mimeType: string
  size: number
  provider: 'local' | 's3'
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const uploadedFileSchema = new Schema<IUploadedFile>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    storageKey: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    provider: {
      type: String,
      enum: ['local', 's3'],
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

uploadedFileSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })

export const UploadedFile: Model<IUploadedFile> =
  mongoose.models.UploadedFile || mongoose.model<IUploadedFile>('UploadedFile', uploadedFileSchema)
