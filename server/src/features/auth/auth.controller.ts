import { Request, Response, NextFunction } from 'express'
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetUserPassword,
  changeUserPassword,
  formatUserResponse,
} from './auth.service.js'
import { setAuthCookies, clearAuthCookies } from '../../utils/cookieHelper.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { Brokerage } from '../../models/Brokerage.js'
import { logger } from '../../utils/logger.js'

// Helper to extract IP and user-agent
const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await registerUser(req.body, clientIp, userAgent)
    setAuthCookies(res, result.accessToken, result.refreshToken)
    sendSuccess(res, result.user, 'Registration successful', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await loginUser(req.body, clientIp, userAgent)
    setAuthCookies(res, result.accessToken, result.refreshToken)
    sendSuccess(res, result.user, 'Authentication successful', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/logout
export const logout = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const { clientIp, userAgent } = getClientMeta(req)
    if (req.user) {
      await logoutUser(req.user, clientIp, userAgent)
    }
  } catch (error) {
    logger.error('Error during logout session invalidation:', error)
  } finally {
    clearAuthCookies(res)
    sendSuccess(res, null, 'Logged out successfully', HTTP_STATUS.OK)
  }
}

// GET /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthenticated session', HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const brokerage = await Brokerage.findById(req.user.brokerageId)
    const formatted = formatUserResponse(req.user, brokerage?.name)
    sendSuccess(res, formatted, 'Current user profile retrieved', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/forgot-password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientIp, userAgent } = getClientMeta(req)
    const message = await requestPasswordReset(req.body, clientIp, userAgent)
    sendSuccess(res, null, message, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientIp, userAgent } = getClientMeta(req)
    await resetUserPassword(req.body, clientIp, userAgent)
    sendSuccess(res, null, 'Password reset successful. You may now log in.', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/change-password
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    await changeUserPassword(req.user, req.body, clientIp, userAgent)
    sendSuccess(res, null, 'Password changed successfully.', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

