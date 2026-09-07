import mongoose, { Schema, Document } from 'mongoose'

export interface IESignSigner {
  id: string
  name: string
  email: string
  role: 'buyer' | 'seller' | 'agent' | 'broker' | 'witness'
  signToken: string
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'
  viewedAt?: Date
  signedAt?: Date
  signatureData?: string
  ipAddress?: string
  userAgent?: string
  declineReason?: string
}

export interface IESignField {
  id: string
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox'
  signerEmail: string
  page: number
  x: number
  y: number
  width: number
  height: number
  required: boolean
  label: string
  value?: string
}

export interface IESignAuditItem {
  id: string
  action: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'voided'
  timestamp: Date
  performerEmail: string
  performerName: string
  ipAddress?: string
  userAgent?: string
  details?: string
}

export interface IESignEnvelope extends Document {
  brokerageId: mongoose.Types.ObjectId
  transactionId?: mongoose.Types.ObjectId
  dealId?: mongoose.Types.ObjectId
  title: string
  documentUrl: string
  fileName: string
  fileSize: number
  pageCount: number
  signers: IESignSigner[]
  fields: IESignField[]
  status: 'draft' | 'sent' | 'viewed' | 'partially_signed' | 'completed' | 'declined' | 'voided'
  auditTrail: IESignAuditItem[]
  certificateHash?: string
  completedAt?: Date
  expiresAt?: Date
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const signerSchema = new Schema<IESignSigner>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'agent', 'broker', 'witness'],
      default: 'buyer',
    },
    signToken: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'viewed', 'signed', 'declined'],
      default: 'pending',
    },
    viewedAt: { type: Date },
    signedAt: { type: Date },
    signatureData: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    declineReason: { type: String },
  },
  { _id: false }
)

const fieldSchema = new Schema<IESignField>(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['signature', 'initials', 'date', 'text', 'checkbox'],
      default: 'signature',
    },
    signerEmail: { type: String, required: true, lowercase: true },
    page: { type: Number, default: 1, min: 1 },
    x: { type: Number, required: true, min: 0, max: 100 },
    y: { type: Number, required: true, min: 0, max: 100 },
    width: { type: Number, default: 20 },
    height: { type: Number, default: 6 },
    required: { type: Boolean, default: true },
    label: { type: String, default: 'Signature' },
    value: { type: String },
  },
  { _id: false }
)

const auditItemSchema = new Schema<IESignAuditItem>(
  {
    id: { type: String, required: true },
    action: {
      type: String,
      enum: ['created', 'sent', 'viewed', 'signed', 'declined', 'completed', 'voided'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    performerEmail: { type: String, required: true },
    performerName: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: String },
  },
  { _id: false }
)

const envelopeSchema = new Schema<IESignEnvelope>(
  {
    brokerageId: { type: Schema.Types.ObjectId, ref: 'Brokerage', required: true, index: true },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    documentUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    pageCount: { type: Number, default: 1, min: 1 },
    signers: [signerSchema],
    fields: [fieldSchema],
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'partially_signed', 'completed', 'declined', 'voided'],
      default: 'draft',
      index: true,
    },
    auditTrail: [auditItemSchema],
    certificateHash: { type: String },
    completedAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
)

envelopeSchema.index({ brokerageId: 1, createdAt: -1 })
envelopeSchema.index({ 'signers.signToken': 1 })

export const ESignEnvelope = mongoose.model<IESignEnvelope>('ESignEnvelope', envelopeSchema)
