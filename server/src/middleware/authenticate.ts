import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, verifyRefreshToken, signAccessToken, TokenPayload } from '../utils/tokenHelper.js'
import { setAuthCookies } from '../utils/cookieHelper.js'
import { User, IUser } from '../models/User.js'
import { COOKIE_NAMES, GENERIC_AUTH_MESSAGES, HTTP_STATUS } from '../utils/constants.js'
import { sendError } from '../utils/apiResponse.js'

// Extend Express Request to include authenticated user object
declare global {
  namespace Express {
    interface Request {
      user?: IUser
      tokenPayload?: TokenPayload
    }
  }
}

// Multi-layer JWT Cookie Authentication Middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const accessToken = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]
  const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN]

  // Scenario 1: Valid Access Token Present
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken)
      const user = await User.findById(decoded.userId)

      if (user && user.isActive) {
        req.user = user
        req.tokenPayload = decoded
        return next()
      }
    } catch {
      // Access token invalid or expired, attempt refresh token fallback below
    }
  }

  // Scenario 2: Access Token Expired/Missing, Refresh Token Fallback
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken)
      const user = await User.findById(decoded.userId)

      if (user && user.isActive && user.tokenVersion === (decoded.tokenVersion || 0)) {
        const newPayload: TokenPayload = {
          userId: user._id.toString(),
          email: user.email,
          role: user.role,
          brokerageId: user.brokerageId.toString(),
          tokenVersion: user.tokenVersion,
        }

        const newAccessToken = signAccessToken(newPayload)
        setAuthCookies(res, newAccessToken, refreshToken)

        req.user = user
        req.tokenPayload = newPayload
        return next()
      }
    } catch {
      // Refresh token is also invalid or expired
    }
  }

  // Scenario 3: Authentication Failed
  return sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
}
