import { Request, Response, NextFunction } from 'express'
import { getDetailedSystemHealth } from './health.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'

// GET /api/health
export const getLiveness = (_req: Request, res: Response): void => {
  sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'System online', HTTP_STATUS.OK)
}

// GET /api/health/detailed
export const getDetailedHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const healthHeaderKey = req.headers['x-health-check-key']
    const isHeaderAuthorized = healthHeaderKey === process.env.COOKIE_SECRET

    const isUserAuthorized =
      req.user &&
      (req.user.role === USER_ROLES.SUPER_ADMIN || req.user.role === USER_ROLES.BROKERAGE_OWNER)

    if (!isHeaderAuthorized && !isUserAuthorized) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Access denied: Detailed health status requires admin privileges or valid health probe key',
      })
      return
    }

    const health = await getDetailedSystemHealth()
    const statusCode = health.status === 'unhealthy' ? HTTP_STATUS.INTERNAL_SERVER_ERROR : HTTP_STATUS.OK
    sendSuccess(res, health, `System health status: ${health.status}`, statusCode)
  } catch (error) {
    next(error)
  }
}
