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
    const { logs, total } = await listAuditLogs(req.query, tenantFilter)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved successfully')
  } catch (error) {
    next(error)
  } finally {
    console.log(`[TIMER] getAuditLogs took ${measureExecutionMs(startTime).toFixed(3)}ms`)
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
    const log = await fetchAuditLogById(logId, tenantFilter)
    if (!log) {
      sendError(res, 'Audit log not found', HTTP_STATUS.NOT_FOUND)
      return
    }
    sendSuccess(res, log, 'Audit log retrieved successfully')
  } catch (error) {
    next(error)
  } finally {
    console.log(`[TIMER] getAuditLogById took ${measureExecutionMs(startTime).toFixed(3)}ms`)
  }
}
