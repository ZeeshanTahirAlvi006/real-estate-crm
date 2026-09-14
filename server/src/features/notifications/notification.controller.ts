import { Request, Response, NextFunction } from 'express'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  softDeleteNotification,
} from './notification.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

// GET /api/notifications
export const getNotificationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const status = req.query.status as 'unread' | 'all' | undefined

    const result = await listNotifications(req.user, { page, limit, status })

    const latencyMs = measureExecutionMs(startTime)
    const cacheHeader =
      result.source === 'l1' ? 'L1-HIT' : result.source === 'l2' ? 'L2-HIT' : 'MISS'

    res.setHeader('X-Cache', cacheHeader)
    res.setHeader('X-Response-Time', `${latencyMs.toFixed(3)}ms`)

    sendSuccess(res, result, 'Notifications retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/notifications/:id
export const deleteNotificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const id = req.params.id as string
    const result = await softDeleteNotification(id, req.user)

    const latencyMs = measureExecutionMs(startTime)
    res.setHeader('X-Response-Time', `${latencyMs.toFixed(3)}ms`)

    sendSuccess(res, result, 'Notification deleted successfully')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/notifications/:id/read
export const markReadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const id = req.params.id as string
    const notification = await markNotificationRead(id, req.user)

    const latencyMs = measureExecutionMs(startTime)
    res.setHeader('X-Response-Time', `${latencyMs.toFixed(3)}ms`)

    sendSuccess(res, notification, 'Notification marked as read')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/notifications/read-all
export const markAllReadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const result = await markAllNotificationsRead(req.user)

    const latencyMs = measureExecutionMs(startTime)
    res.setHeader('X-Response-Time', `${latencyMs.toFixed(3)}ms`)

    sendSuccess(res, result, 'All notifications marked as read')
  } catch (error) {
    next(error)
  }
}
