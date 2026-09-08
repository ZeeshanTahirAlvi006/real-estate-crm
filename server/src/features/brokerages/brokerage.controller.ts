import { Request, Response, NextFunction } from 'express'
import {
  listAllBrokerages,
  getBrokerageDetail,
  createNewBrokerage,
  updateBrokerageDetails,
  deactivateBrokerage,
} from './brokerage.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/brokerages
export const list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brokerages = await listAllBrokerages()
    sendSuccess(res, brokerages, 'Brokerages retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// GET /api/brokerages/:id
export const getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const brokerage = await getBrokerageDetail(id, req.user)
    sendSuccess(res, brokerage, 'Brokerage retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/brokerages
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const created = await createNewBrokerage(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, created, 'Brokerage created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/brokerages/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const updated = await updateBrokerageDetails(id, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, updated, 'Brokerage updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/brokerages/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    await deactivateBrokerage(id, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Brokerage deactivated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
