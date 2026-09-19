import { Request, Response, NextFunction } from 'express'
import { listAuditLogs, getAuditLogById as fetchAuditLogById } from './audit.service.js'
import { sendPaginated, sendSuccess, sendError } from '../../utils/apiResponse.js'
import { USER_ROLES, HTTP_STATUS } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

// GET /api/audit-logs
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    // Fail-closed tenant isolation guard (DI-CRIT-01)
    if (req.user?.role !== USER_ROLES.SUPER_ADMIN && !req.tenantFilter?.brokerageId) {
      sendError(res, 'Access denied: Valid tenant scope required', HTTP_STATUS.FORBIDDEN)
      return
    }

    const tenantFilter = req.tenantFilter || {}
    const { logs, total, source } = await listAuditLogs(req.query, tenantFilter, req.user)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25

    const durationMs = measureExecutionMs(startTime)
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-Cache', source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS')
      res.setHeader('X-Response-Time', `${durationMs.toFixed(3)}ms`)
    }

    sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/audit-logs/:id
export const getAuditLogById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    // Fail-closed tenant isolation guard (DI-CRIT-01)
    if (req.user?.role !== USER_ROLES.SUPER_ADMIN && !req.tenantFilter?.brokerageId) {
      sendError(res, 'Access denied: Valid tenant scope required', HTTP_STATUS.FORBIDDEN)
      return
    }

    const logId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string)
    const tenantFilter = req.tenantFilter || {}
    const log = await fetchAuditLogById(logId, tenantFilter, req.user)
    if (!log) {
      sendError(res, 'Audit log not found', HTTP_STATUS.NOT_FOUND)
      return
    }

    const durationMs = measureExecutionMs(startTime)
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-Cache', log.source === 'l1' ? 'L1-HIT' : log.source === 'l2' ? 'L2-HIT' : 'MISS')
      res.setHeader('X-Response-Time', `${durationMs.toFixed(3)}ms`)
    }

    sendSuccess(res, log, 'Audit log retrieved successfully')
  } catch (error) {
    next(error)
  }
}
