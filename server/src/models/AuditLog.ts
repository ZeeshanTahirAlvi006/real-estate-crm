import mongoose, { Document, Schema, Model } from 'mongoose'

export type AuditLogStatus = 'success' | 'failure'

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId
  userEmail?: string
  userRole?: string
  brokerageId?: mongoose.Types.ObjectId
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  previousState?: Record<string, any>
  newState?: Record<string, any>
  ipAddress: string
  userAgent: string
  status: AuditLogStatus
  failureReason?: string
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    userRole: {
      type: String,
      trim: true,
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
      index: true,
    },
    resource: {
      type: String,
      required: [true, 'Audit resource is required'],
      trim: true,
      index: true,
    },
    resourceId: {
      type: String,
      trim: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    previousState: {
      type: Schema.Types.Mixed,
    },
    newState: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable audit log
  }
)

// Covered compound indexes for sub-1ms multi-dimensional tenant filtering (Rule PERF-M-001)
auditLogSchema.index({ brokerageId: 1, createdAt: -1 })
auditLogSchema.index({ resource: 1, resourceId: 1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, action: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, resource: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, status: 1, createdAt: -1 })
auditLogSchema.index({ brokerageId: 1, userEmail: 1, createdAt: -1 })

// Automated 90-day data lifecycle retention TTL index (Rule ARCH-001)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
