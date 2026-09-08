import { Request, Response, NextFunction } from 'express'
import {
  getUserSettings,
  updateUserNotificationPrefs,
  getBrokerageSettings,
  updateBrokerageConfig,
} from './settings.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/settings/me
export const getMySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const settings = await getUserSettings(req.user)
    sendSuccess(res, settings, 'User settings retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/settings/me/notifications
export const updateNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { notificationPrefs } = req.body
    const updated = await updateUserNotificationPrefs(notificationPrefs, req.user)
    sendSuccess(res, updated, 'Notification preferences updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// GET /api/settings/brokerage
export const getBrokerageConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const settings = await getBrokerageSettings(req.user)
    sendSuccess(res, settings, 'Brokerage settings retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/settings/brokerage
export const updateBrokerageConfigSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const updated = await updateBrokerageConfig(req.body, req.user)
    sendSuccess(res, updated, 'Brokerage configuration updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
