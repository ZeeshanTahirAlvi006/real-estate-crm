import { Response, CookieOptions } from 'express'
import { env } from '../config/env.js'
import { COOKIE_NAMES } from './constants.js'

// Base security cookie options
const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true, // Prevents access from JavaScript (blocks XSS token theft)
  secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE, // HTTPS only in prod
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', // CSRF mitigation
  domain: env.COOKIE_DOMAIN && env.NODE_ENV === 'production' ? env.COOKIE_DOMAIN : undefined,
  path: '/',
})

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
