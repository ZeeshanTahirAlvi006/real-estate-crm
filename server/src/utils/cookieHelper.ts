import { Response, CookieOptions } from 'express'
import { env } from '../config/env.js'
import { COOKIE_NAMES } from './constants.js'

// Base security cookie options
const getBaseCookieOptions = (): CookieOptions => {
  const isProd = env.NODE_ENV === 'production'
  const isSecure = isProd || env.COOKIE_SECURE
  // In cross-origin setups (Vercel + Render), domain should only be set if explicitly configured and not localhost
  const validDomain =
    env.COOKIE_DOMAIN &&
    env.COOKIE_DOMAIN !== 'localhost' &&
    !env.COOKIE_DOMAIN.startsWith('http') &&
    isProd
      ? env.COOKIE_DOMAIN
      : undefined

  return {
    httpOnly: true, // Prevents access from JavaScript (blocks XSS token theft)
    secure: isSecure, // HTTPS required for sameSite: 'none'
    sameSite: isSecure ? 'none' : 'lax', // Required for cross-origin cookie transmission
    domain: validDomain,
    path: '/',
    ...((isSecure ? { partitioned: true } : {}) as any), // Modern browser CHIPS partitioned cookie support
  }
}

// Set Authentication Cookies (Access & Refresh Tokens)
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  const baseOptions = getBaseCookieOptions()

  // 15 minutes access token cookie
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000,
  })

  // 30 days refresh token cookie
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    ...baseOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

// Clear Authentication Cookies on Logout
export const clearAuthCookies = (res: Response): void => {
  const baseOptions = getBaseCookieOptions()
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, baseOptions)
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, baseOptions)
}
