import mongoose, { Document, Schema, Model } from 'mongoose'

export type DocumentCategory =
  | 'contract'
  | 'disclosure'
  | 'inspection_report'
  | 'appraisal'
  | 'title_commitment'
  | 'closing_disclosure'
  | 'lead_preapproval'
  | 'cma_report'
  | 'other'

export interface IDocumentRecord extends Document {
  brokerageId: mongoose.Types.ObjectId
  transactionId?: mongoose.Types.ObjectId
  contactId?: mongoose.Types.ObjectId
  dealId?: mongoose.Types.ObjectId
  title: string
  category: DocumentCategory
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: mongoose.Types.ObjectId
  uploadedByName: string
  clientVisible: boolean
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const documentRecordSchema = new Schema<IDocumentRecord>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      index: true,
    },
    dealId: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    category: {
      type: String,
      enum: [
        'contract',
        'disclosure',
        'inspection_report',
        'appraisal',
        'title_commitment',
        'closing_disclosure',
        'lead_preapproval',
        'cma_report',
        'other',
      ],
      default: 'other',
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      default: 'Agent',
    },
    clientVisible: {
      type: Boolean,
      default: true,
      index: true,
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

documentRecordSchema.index({ brokerageId: 1, isDeleted: 1, transactionId: 1 })
documentRecordSchema.index({ brokerageId: 1, isDeleted: 1, contactId: 1, clientVisible: 1 })

export const DocumentRecord: Model<IDocumentRecord> =
  mongoose.models.DocumentRecord ||
  mongoose.model<IDocumentRecord>('DocumentRecord', documentRecordSchema)
