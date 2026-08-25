import { Request, Response, NextFunction } from 'express'
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetUserPassword,
  formatUserResponse,
} from './auth.service.js'
import { setAuthCookies, clearAuthCookies } from '../../utils/cookieHelper.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { Brokerage } from '../../models/Brokerage.js'

// POST /api/auth/register
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await registerUser(req.body)
    setAuthCookies(res, result.accessToken, result.refreshToken)
    sendSuccess(res, result.user, 'Registration successful', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/login
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const result = await loginUser(req.body, clientIp)
    setAuthCookies(res, result.accessToken, result.refreshToken)
    sendSuccess(res, result.user, 'Authentication successful', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/logout
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      await logoutUser(req.user)
    }
    clearAuthCookies(res)
    sendSuccess(res, null, 'Logged out successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// GET /api/auth/me
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
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
    const message = await requestPasswordReset(req.body)
    sendSuccess(res, null, message, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/reset-password
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await resetUserPassword(req.body)
    sendSuccess(res, null, 'Password reset successful. You may now log in.', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
