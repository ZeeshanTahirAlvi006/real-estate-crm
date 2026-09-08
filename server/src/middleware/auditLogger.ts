import { Request, Response, NextFunction } from 'express'
import { logAuditEvent } from '../utils/auditLogger.js'
import { getClientIp } from './rateLimiter.js'

/**
 * Middleware that automatically logs modifying HTTP transactions (POST, PUT, PATCH, DELETE)
 * Captures tenant context, user identity, IP address, and payload with sensitive field redaction.
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

  const startTime = Date.now()
  const originalEnd = res.end.bind(res)

  // Hook into response completion
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    res.end = originalEnd
    res.end(chunk, encoding, callback)

    const statusCode = res.statusCode
    const isSuccess = statusCode >= 200 && statusCode < 400

    // Asynchronously record audit log without blocking
    setImmediate(async () => {
      try {
        const resourcePath = req.baseUrl || req.path
        const segments = resourcePath.split('/').filter(Boolean)
        const resource = segments[1] || segments[0] || 'general'

        await logAuditEvent({
          userId: req.user?._id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          brokerageId: req.user?.brokerageId,
          action: `http.${req.method.toLowerCase()}.${resource}`,
          resource,
          resourceId: (req.params?.id as string) || undefined,
          details: {
            method: req.method,
            path: req.originalUrl || req.path,
            statusCode,
            durationMs: Date.now() - startTime,
            query: req.query,
          },
          newState: req.method !== 'DELETE' ? req.body : undefined,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
          status: isSuccess ? 'success' : 'failure',
          failureReason: isSuccess ? undefined : `HTTP ${statusCode}`,
        })
      } catch {
        // Fail silently so audit never interrupts HTTP flow
      }
    })

    return res
  }

  next()
}
