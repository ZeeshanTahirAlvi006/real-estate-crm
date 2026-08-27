import { Request, Response, NextFunction } from 'express'
import { listAuditLogs } from './audit.service.js'
import { sendPaginated } from '../../utils/apiResponse.js'

// GET /api/audit-logs
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { logs, total } = await listAuditLogs(req.query, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, logs, total, page, limit, 'Audit logs retrieved successfully')
  } catch (error) {
    next(error)
  }
}
