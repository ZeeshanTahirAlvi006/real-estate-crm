import { AuditLog, AuditLogStatus } from '../models/AuditLog.js'
import { logger } from './logger.js'
import mongoose from 'mongoose'

export interface LogAuditInput {
  userId?: mongoose.Types.ObjectId | string
  userEmail?: string
  userRole?: string
  brokerageId?: mongoose.Types.ObjectId | string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  previousState?: Record<string, any>
  newState?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status?: AuditLogStatus
  failureReason?: string
}

// Sanitize sensitive fields before writing to audit log
const sanitizeAuditPayload = (obj?: Record<string, any>): Record<string, any> | undefined => {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized: Record<string, any> = { ...obj }
  const sensitiveKeys = ['password', 'currentPassword', 'newPassword', 'token', 'secret', 'encryptionKey']

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key)) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeAuditPayload(sanitized[key])
    }
  }

  return sanitized
}

// Asynchronously record audit log entry without interrupting primary flow
export const logAuditEvent = async (input: LogAuditInput): Promise<void> => {
  try {
    const userId = input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())
      ? new mongoose.Types.ObjectId(input.userId.toString())
      : undefined

    const brokerageId = input.brokerageId && mongoose.Types.ObjectId.isValid(input.brokerageId.toString())
      ? new mongoose.Types.ObjectId(input.brokerageId.toString())
      : undefined

    await AuditLog.create({
      userId,
      userEmail: input.userEmail,
      userRole: input.userRole,
      brokerageId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      details: sanitizeAuditPayload(input.details),
      previousState: sanitizeAuditPayload(input.previousState),
      newState: sanitizeAuditPayload(input.newState),
      ipAddress: input.ipAddress || '127.0.0.1',
      userAgent: input.userAgent || 'system',
      status: input.status || 'success',
      failureReason: input.failureReason,
    })
  } catch (error) {
    logger.error(`Failed to record audit log for action: ${input.action}`, error)
  }
}
