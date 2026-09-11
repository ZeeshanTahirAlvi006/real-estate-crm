import { AuditLog, AuditLogStatus } from '../models/AuditLog.js'
import { logger } from './logger.js'
import { measureExecutionMs } from './cacheHelper.js'
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

// Bounded sensitive payload sanitizer with recursion depth limit & WeakSet circular guard (EL-001, ML-003)
export const sanitizeAuditPayload = (
  obj?: any,
  depth: number = 0,
  visited = new WeakSet<object>()
): Record<string, any> | undefined => {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.length > 512) {
      return (obj.slice(0, 512) + '...[TRUNCATED]') as any
    }
    return obj
  }

  if (visited.has(obj)) {
    return '[CIRCULAR]' as any
  }
  visited.add(obj)

  if (depth > 3) {
    return '[MAX_DEPTH_REACHED]' as any
  }

  if (Array.isArray(obj)) {
    return obj.slice(0, 20).map((item) => sanitizeAuditPayload(item, depth + 1, visited)) as any
  }

  const sanitized: Record<string, any> = {}
  const sensitiveKeys = [
    'password',
    'currentPassword',
    'newPassword',
    'token',
    'secret',
    'encryptionKey',
    'apiKey',
    'credentials',
    'credentialsEncrypted',
    'clientSecret',
    'refreshToken',
    'webhookUrl',
    'accessToken',
  ]

  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.includes(key)) {
      sanitized[key] = '[REDACTED]'
    } else {
      const val = obj[key]
      if (typeof val === 'string' && val.length > 512) {
        sanitized[key] = val.slice(0, 512) + '...[TRUNCATED]'
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeAuditPayload(val, depth + 1, visited)
      } else {
        sanitized[key] = val
      }
    }
  }

  return sanitized
}

// Bounded In-Memory Micro-Batch Ring Buffer (Rules ML-001, ML-002, PERF-M-003)
const MAX_QUEUE_SIZE = 5000
const BATCH_SIZE = 100
const FLUSH_INTERVAL_MS = 500

const auditQueue: Array<Record<string, any>> = []
let isFlushing = false
let flushTimer: NodeJS.Timeout | null = null

// Flushes a micro-batch of audit logs using AuditLog.insertMany (halves connection checkouts)
export const flushAuditQueue = async (): Promise<number> => {
  if (isFlushing || auditQueue.length === 0) {
    return 0
  }

  if (mongoose.connection.readyState !== 1) {
    return 0
  }

  const startTime = process.hrtime.bigint()
  isFlushing = true
  const batch = auditQueue.splice(0, BATCH_SIZE)

  try {
    await AuditLog.insertMany(batch, { ordered: false })
  } catch (error: any) {
    // Non-blocking write failure handling (EL-003): avoid synchronous terminal stalls
    logger.warn(`[AuditLog Batch Flush] Partial write error for ${batch.length} records: ${error.message}`)
  } finally {
    isFlushing = false
  }

  // If backlog exceeds batch size, schedule immediate next micro-drain
  if (auditQueue.length >= BATCH_SIZE) {
    setImmediate(() => {
      flushAuditQueue().catch(() => { })
    })
  }

  if (batch.length > 0) {
    logger.info(`[AuditLog] Flushed ${batch.length} records in ${measureExecutionMs(startTime).toFixed(3)}ms`)
  }

  return batch.length
}


// Initialize flush interval timer (unreferenced so it does not block process exit)
const ensureFlushTimer = (): void => {
  if (!flushTimer) {
    flushTimer = setInterval(() => {
      flushAuditQueue().catch(() => { })
    }, FLUSH_INTERVAL_MS)
    if (flushTimer.unref) {
      flushTimer.unref()
    }
  }
}

// Graceful process lifecycle teardown (Rule ML-001)
process.once('SIGTERM', () => {
  if (flushTimer) clearInterval(flushTimer)
  flushAuditQueue().catch(() => { })
})
process.once('SIGINT', () => {
  if (flushTimer) clearInterval(flushTimer)
  flushAuditQueue().catch(() => { })
})

// Enqueue audit log entry into bounded micro-batch queue (Rules ML-002, PERF-M-003)
export const enqueueAuditEvent = (input: LogAuditInput): void => {
  // Evict oldest record if capacity saturated to guarantee bounded memory (Rule ML-002)
  if (auditQueue.length >= MAX_QUEUE_SIZE) {
    auditQueue.shift()
    logger.warn('[AuditQueue] Queue capacity saturated (5000 items). Oldest audit event evicted.')
  }

  const userId =
    input.userId && mongoose.Types.ObjectId.isValid(input.userId.toString())
      ? new mongoose.Types.ObjectId(input.userId.toString())
      : undefined

  const brokerageId =
    input.brokerageId && mongoose.Types.ObjectId.isValid(input.brokerageId.toString())
      ? new mongoose.Types.ObjectId(input.brokerageId.toString())
      : undefined

  auditQueue.push({
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
    createdAt: new Date(),
  })

  ensureFlushTimer()

  // Trigger instant drain if micro-batch threshold reached
  if (auditQueue.length >= BATCH_SIZE) {
    setImmediate(() => {
      flushAuditQueue().catch(() => { })
    })
  }
}

// Backwards-compatible logAuditEvent alias
export const logAuditEvent = async (input: LogAuditInput): Promise<void> => {
  enqueueAuditEvent(input)
}


