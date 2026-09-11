import { Request, Response, NextFunction } from 'express'
import {
  listAllBrokerages,
  getBrokerageDetail,
  createNewBrokerage,
  updateBrokerageDetails,
  deactivateBrokerage,
} from './brokerage.service.js'
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

// GET /api/brokerages (Super Admin only, bounded pagination with sub-1ms caching)
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t0 = process.hrtime.bigint()
    const { brokerages, total, page, limit, source } = await listAllBrokerages(req.query as any)
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${measureExecutionMs(t0).toFixed(3)}ms`)
    sendPaginated(res, brokerages, total, page, limit, 'Brokerages retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/brokerages/:id (Super Admin or Brokerage Owner)
export const getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const t0 = process.hrtime.bigint()
    const id = req.params.id as string
    const { brokerage, source } = await getBrokerageDetail(id, req.user)
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${measureExecutionMs(t0).toFixed(3)}ms`)
    sendSuccess(res, brokerage, 'Brokerage retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/brokerages (Super Admin only)
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const t0 = process.hrtime.bigint()
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const created = await createNewBrokerage(req.body, req.user, clientIp, userAgent)
    res.setHeader('X-Response-Time', `${measureExecutionMs(t0).toFixed(3)}ms`)
    sendSuccess(res, created, 'Brokerage created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/brokerages/:id (Super Admin or Brokerage Owner)
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const t0 = process.hrtime.bigint()
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const updated = await updateBrokerageDetails(id, req.body, req.user, clientIp, userAgent)
    res.setHeader('X-Response-Time', `${measureExecutionMs(t0).toFixed(3)}ms`)
    sendSuccess(res, updated, 'Brokerage updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/brokerages/:id (Super Admin only)
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const t0 = process.hrtime.bigint()
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    await deactivateBrokerage(id, req.user, clientIp, userAgent)
    res.setHeader('X-Response-Time', `${measureExecutionMs(t0).toFixed(3)}ms`)
    sendSuccess(res, null, 'Brokerage deactivated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
