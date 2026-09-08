import { Request, Response, NextFunction } from 'express'
import { listFeatureFlags, updateFeatureFlag } from './featureFlag.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/feature-flags
export const getFeatureFlags = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const flags = await listFeatureFlags()
    sendSuccess(res, flags, 'Feature flags retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/feature-flags/:key
export const toggleFeature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const key = req.params.key as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const updated = await updateFeatureFlag(key, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, updated, `Feature [${key}] updated successfully`, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
