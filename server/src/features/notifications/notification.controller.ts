import { Request, Response, NextFunction } from 'express'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  softDeleteNotification,
} from './notification.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'

// GET /api/notifications
export const getNotificationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
    const status = req.query.status as 'unread' | 'all' | undefined

    const result = await listNotifications(req.user, { page, limit, status })
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
  try {
    if (!req.user) return
    const id = req.params.id as string
    const result = await softDeleteNotification(id, req.user)
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
  try {
    if (!req.user) return
    const id = req.params.id as string
    const notification = await markNotificationRead(id, req.user)
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
  try {
    if (!req.user) return
    const result = await markAllNotificationsRead(req.user)
    sendSuccess(res, result, 'All notifications marked as read')
  } catch (error) {
    next(error)
  }
}
