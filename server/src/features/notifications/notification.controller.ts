import { Request, Response, NextFunction } from 'express'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
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
    const notifications = await listNotifications(req.user)
    sendSuccess(res, notifications, 'Notifications retrieved successfully')
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
