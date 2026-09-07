import { Request, Response, NextFunction } from 'express'
import {
  listTenantApiKeys,
  createTenantApiKey,
  revokeTenantApiKey,
} from './apiKey.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/api-keys
export const getApiKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const keys = await listTenantApiKeys(req.user)
    sendSuccess(res, keys, 'API keys retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/api-keys
export const createApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await createTenantApiKey(req.body, req.user)
    sendSuccess(res, result, 'API key generated successfully. Save this secret key now as it will not be shown again.', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/api-keys/:id
export const removeApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const keyId = req.params.id as string
    await revokeTenantApiKey(keyId, req.user)
    sendSuccess(res, null, 'API key revoked successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
