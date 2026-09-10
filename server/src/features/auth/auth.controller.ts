import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetUserPassword,
  changeUserPassword,
  refreshUserTokens,
  formatUserResponse,
} from './auth.service.js'
import { setAuthCookies, clearAuthCookies } from '../../utils/cookieHelper.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { COOKIE_NAMES, HTTP_STATUS } from '../../utils/constants.js'
import { Brokerage } from '../../models/Brokerage.js'
import { logger } from '../../utils/logger.js'
import { cacheGet, cacheSet } from '../../config/redis.js'
import { recordDbMetric } from '../../utils/cacheHelper.js'

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
    res.setHeader('X-Access-Token', result.accessToken)
    res.setHeader('X-Refresh-Token', result.refreshToken)

    // Dual-Token response: cookie + JSON payload for cross-origin resilience
    const payload = {
      user: result.user,
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      ...result.user,
    }
    sendSuccess(res, payload, 'Registration successful', HTTP_STATUS.CREATED)
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
    res.setHeader('X-Access-Token', result.accessToken)
    res.setHeader('X-Refresh-Token', result.refreshToken)

    // Dual-Token response: cookie + JSON payload for cross-origin resilience
    const payload = {
      user: result.user,
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      ...result.user,
    }
    sendSuccess(res, payload, 'Authentication successful', HTTP_STATUS.OK)
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
    logger.warn('Error during logout session invalidation:', error)
  } finally {
    clearAuthCookies(res)
    sendSuccess(res, null, 'Logged out successfully', HTTP_STATUS.OK)
  }
}

// GET /api/auth/me (Zero-DB Hot Path < 0.2ms)
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthenticated session', HTTP_STATUS.UNAUTHORIZED)
      return
    }

    // 1. Check if brokerageName is already attached from L1/L2 cache
    let brokerageName: string | undefined = (req.user as any).brokerageName
    const rawBrokerageId = req.user.brokerageId ? req.user.brokerageId.toString() : ''

    if (!brokerageName && rawBrokerageId) {
      // 2. Check L2 Redis cache
      try {
        const cachedName = await cacheGet(`auth:brokerage:${rawBrokerageId}`)
        if (cachedName) {
          brokerageName = cachedName
        }
      } catch {
        // Non-fatal fallback
      }

      // 3. Fallback: lean query with DI-001 ObjectId validation
      if (!brokerageName && mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(rawBrokerageId)) {
        const startTime = process.hrtime.bigint()
        const brokerage = await Brokerage.findById(new mongoose.Types.ObjectId(rawBrokerageId))
          .select('name')
          .lean()
        recordDbMetric('getMe:Brokerage.findById', startTime, 10)
        if (brokerage?.name) {
          brokerageName = brokerage.name
          cacheSet(`auth:brokerage:${rawBrokerageId}`, brokerage.name, 3600).catch(() => {})
        }
      }
    }

    const formatted = formatUserResponse(req.user, brokerageName)
    sendSuccess(res, formatted, 'Current user profile retrieved', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/auth/refresh-token
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token =
      req.body?.refreshToken ||
      (req.headers['x-refresh-token'] as string) ||
      req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]

    if (!token) {
      sendError(res, 'Refresh token required', HTTP_STATUS.UNAUTHORIZED)
      return
    }

    const { clientIp, userAgent } = getClientMeta(req)
    const result = await refreshUserTokens(token, clientIp, userAgent)
    setAuthCookies(res, result.accessToken, result.refreshToken)
    res.setHeader('X-Access-Token', result.accessToken)
    res.setHeader('X-Refresh-Token', result.refreshToken)

    const payload = {
      user: result.user,
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      ...result.user,
    }
    sendSuccess(res, payload, 'Token refreshed successfully', HTTP_STATUS.OK)
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


