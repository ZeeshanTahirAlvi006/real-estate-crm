import mongoose, { Document, Schema, Model } from 'mongoose'

export type CallDisposition =
  | 'interested'
  | 'showing_requested'
  | 'nurture_long_term'
  | 'wrong_number'
  | 'not_interested'
  | 'dnc_requested'
  | 'voicemail_left'
  | 'call_back_later'
  | 'no_answer'

export interface ICallLog extends Document {
  brokerageId: mongoose.Types.ObjectId
  contactId: mongoose.Types.ObjectId
  contactName: string
  contactPhone: string
  agentId: mongoose.Types.ObjectId
  agentName: string
  durationSeconds: number
  direction: 'inbound' | 'outbound'
  disposition: CallDisposition
  recordingUrl?: string
  liveTranscript?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  aiSummary?: string
  notes?: string
  linesUsed: number
  lineIndex?: number
  createdAt: Date
  updatedAt: Date
}

const callLogSchema = new Schema<ICallLog>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: [true, 'Contact ID is required'],
      index: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent ID is required'],
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound',
    },
    disposition: {
      type: String,
      enum: [
        'interested',
        'showing_requested',
        'nurture_long_term',
        'wrong_number',
        'not_interested',
        'dnc_requested',
        'voicemail_left',
        'call_back_later',
        'no_answer',
      ],
      required: true,
      index: true,
    },
    recordingUrl: {
      type: String,
      trim: true,
    },
    liveTranscript: {
      type: String,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral',
    },
    aiSummary: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    linesUsed: {
      type: Number,
      default: 1,
    },
    lineIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

callLogSchema.index({ brokerageId: 1, createdAt: -1 })
callLogSchema.index({ agentId: 1, createdAt: -1 })
callLogSchema.index({ contactId: 1, createdAt: -1 })

export const CallLog: Model<ICallLog> =
  mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', callLogSchema)
