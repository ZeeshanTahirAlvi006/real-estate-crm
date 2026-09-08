import { Request, Response, NextFunction } from 'express'
import {
  listTenantIntegrations,
  getIntegrationByProvider,
  saveOrUpdateIntegration,
  testIntegrationConnection,
  disconnectIntegration,
} from './integration.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { IntegrationProvider } from '../../models/Integration.js'

// GET /api/integrations
export const getIntegrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const integrations = await listTenantIntegrations(req.user)
    sendSuccess(res, integrations, 'Integrations retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// GET /api/integrations/:provider
export const getIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const provider = req.params.provider as IntegrationProvider
    const integration = await getIntegrationByProvider(provider, req.user)
    sendSuccess(res, integration, 'Integration retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/integrations
export const saveIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const integration = await saveOrUpdateIntegration(req.body, req.user)
    sendSuccess(res, integration, 'Integration configured successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/integrations/:provider/test
export const testIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const provider = req.params.provider as IntegrationProvider
    const result = await testIntegrationConnection(provider, req.user)
    sendSuccess(res, result, result.message, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/integrations/:provider
export const removeIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const provider = req.params.provider as IntegrationProvider
    await disconnectIntegration(provider, req.user)
    sendSuccess(res, null, 'Integration disconnected successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
