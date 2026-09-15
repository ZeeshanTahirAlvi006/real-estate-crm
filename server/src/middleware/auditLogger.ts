import { Request, Response, NextFunction } from 'express'
import { logAuditEvent } from '../utils/auditLogger.js'
import { getClientIp } from './rateLimiter.js'

/**
 * Middleware that automatically logs modifying HTTP transactions (POST, PUT, PATCH, DELETE)
 * Captures tenant context, user identity, IP address, and payload with sensitive field redaction.
 * Uses event-driven res.once('finish') (Rule ML-001) and extracts route parameters resiliently (DI-CRIT-02).
 */
export const httpAuditLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Only audit mutations
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!mutatingMethods.includes(req.method)) {
    return next()
  }

  // Skip auth login / refresh endpoints that record custom security audit events
  if (req.path.includes('/auth/login') || req.path.includes('/auth/refresh')) {
    return next()
  }

  const requestTime = Date.now()

  // Hook into response completion cleanly without monkey-patching res.end 
  res.once('finish', () => {
    try {
      const statusCode = res.statusCode
      const isSuccess = statusCode >= 200 && statusCode < 400

      const resourcePath = req.baseUrl || req.path
      const segments = resourcePath.split('/').filter(Boolean)
      const resource = segments[1] || segments[0] || 'general'

      // Resilient resourceId extraction: handles route params, URL ObjectIds, UUIDs, and numeric IDs 
      const urlIdMatch = (req.originalUrl || req.path).match(/\/([a-f0-9]{24}|[0-9a-fA-F-]{36}|\d+)(?:[/?#]|$)/i)
      const resourceId = (req.params?.id as string) || urlIdMatch?.[1] || undefined

      // Enqueue audit log asynchronously to bounded micro-batch buffer without blocking connection pool
      logAuditEvent({
        userId: req.user?._id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        brokerageId: req.user?.brokerageId,
        action: `http.${req.method.toLowerCase()}.${resource}`,
        resource,
        resourceId,
        details: {
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode,
          durationMs: Date.now() - requestTime,
          query: req.query,
        },
        newState: req.method !== 'DELETE' ? req.body : undefined,
        ipAddress: getClientIp(req),
        userAgent: (req.headers['user-agent'] as string) || 'Unknown',
        status: isSuccess ? 'success' : 'failure',
        failureReason: isSuccess ? undefined : `HTTP ${statusCode}`,
      })
    } catch {
      // Fail silently so audit never interrupts HTTP flow
    }
  })

  next()
}
