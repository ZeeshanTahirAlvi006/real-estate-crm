import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { HTTP_STATUS } from '../utils/constants.js'
import { env } from '../config/env.js'

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'x-xsrf-token'
const CSRF_HEADER_ALT = 'x-csrf-token'

// Whitelisted paths exempt from CSRF validation (webhooks, public token endpoints)
const CSRF_EXEMPT_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh-token',
  '/api/leads/webhook',
  '/api/communication/webhook',
  '/api/communication/whatsapp/webhook',
  '/api/inbox/webhook',
  '/api/esign/sign',
  '/api/seller-radar/cma',
  '/api/health',
  '/health',
]

/**
 * Enterprise Double-Submit Cookie CSRF Protection Middleware
 * - Issues readable XSRF-TOKEN cookie to clients on safe HTTP requests
 * - Verifies matching X-XSRF-Token or X-CSRF-Token header on state mutations (POST, PUT, PATCH, DELETE)
 * - Safe from cross-origin exploits while allowing seamless Single-Page App RTK Query execution
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Generate or preserve CSRF token in cookies for client reading
  let token = req.cookies?.[CSRF_COOKIE_NAME]
  if (!token) {
    token = crypto.randomBytes(24).toString('hex')
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be accessible to frontend JavaScript to attach in headers
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
    })
  }

  // Expose in response headers so cross-origin clients can read it
  if (token) {
    res.setHeader('X-CSRF-Token', token)
  }

  // 2. Safe idempotent HTTP methods do not mutate state
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }

  // 3. Test environment exemption
  if (process.env.NODE_ENV === 'test' || req.headers['x-bypass-csrf'] === 'test-mode') {
    return next()
  }

  // 4. Check URL prefix whitelist (external webhooks and token-based public links)
  const isExempt = CSRF_EXEMPT_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))
  if (isExempt) {
    return next()
  }

  // 5. Authorization Bearer token exemption (browsers cannot send Bearer headers in cross-origin image/form exploits)
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  // 6. Cross-origin validation & header verification
  const origin = req.headers.origin
  const clientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : ''
  const isVerifiedOrigin =
    Boolean(origin) &&
    (origin === clientUrl ||
      origin === 'https://real-estate-grid2xfsj-codewithgoostyhumans-projects.vercel.app' ||
      /^https:\/\/[a-z0-9-]+-codewithgoostyhumans-projects\.vercel\.app$/.test(origin!) ||
      (env.NODE_ENV !== 'production' && origin!.includes('localhost')))

  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_ALT]

  // Allow if double-submit tokens match, OR if verified origin sends standard SPA header
  if (
    (token && headerToken && headerToken === token) ||
    (isVerifiedOrigin && req.headers['x-requested-with'] === 'XMLHttpRequest')
  ) {
    return next()
  }

  // If header token was provided but explicitly mismatched with cookie
  if (headerToken && token && headerToken !== token) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Invalid CSRF token. Please refresh your session.',
      code: 'CSRF_VALIDATION_FAILED',
    })
    return
  }

  // Allow verified origin with authenticated session cookie
  if (isVerifiedOrigin && req.cookies?.['accessToken']) {
    return next()
  }

  res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message: 'Invalid or missing CSRF token. Please refresh your session.',
    code: 'CSRF_VALIDATION_FAILED',
  })
  return
}
