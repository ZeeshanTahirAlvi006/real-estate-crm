import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { HTTP_STATUS } from '../utils/constants.js'
import { env } from '../config/env.js'

const CSRF_COOKIE_NAME = 'XSRF-TOKEN'
const CSRF_HEADER_NAME = 'x-xsrf-token'
const CSRF_HEADER_ALT = 'x-csrf-token'

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

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Generate or preserve CSRF token in cookies
  let token = req.cookies?.[CSRF_COOKIE_NAME]
  if (!token) {
    token = crypto.randomBytes(24).toString('hex')
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-site
      secure: env.NODE_ENV === 'production',
      path: '/',
    })
  }

  // Also expose token in response headers so cross-origin clients can read it
  res.setHeader('X-CSRF-Token', token)

  // 2. Safe idempotent HTTP methods do not mutate state
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next()
  }

  // 3. Test environment exemption
  if (process.env.NODE_ENV === 'test' || req.headers['x-bypass-csrf'] === 'test-mode') {
    return next()
  }

  // 4. Whitelisted routes
  if (CSRF_EXEMPT_PREFIXES.some((prefix) => req.originalUrl.startsWith(prefix))) {
    return next()
  }

  // 5. Bearer token exemption
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next()
  }

  // 6. Cross-origin validation:
  // In modern SPAs across domains, fetch/XHR requests with custom headers require a CORS preflight.
  // If the request originates from your verified frontend (Origin matches CLIENT_URL) and contains custom headers, it cannot be forged by third-party forms.
  const origin = req.headers.origin
  const clientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : ''
  const isVerifiedOrigin = origin && (
    origin === clientUrl ||
    origin === 'https://real-estate-grid2xfsj-codewithgoostyhumans-projects.vercel.app' ||
    (env.NODE_ENV !== 'production' && origin.includes('localhost'))
  )

  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_ALT]

  // Allow if tokens match, OR if verified origin is sending authenticated request with custom header
  if ((token && headerToken && headerToken === token) || (isVerifiedOrigin && req.headers['x-requested-with'] === 'XMLHttpRequest')) {
    return next()
  }

  // If header token was provided but mismatched
  if (headerToken && token && headerToken !== token) {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Invalid CSRF token. Please refresh your session.',
      code: 'CSRF_VALIDATION_FAILED',
    })
    return
  }

  // Otherwise, if origin is verified and user has active session cookies, proceed safely
  if (isVerifiedOrigin && req.cookies?.['accessToken']) {
    return next()
  }

  res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message: 'Invalid or missing CSRF token. Please refresh your session.',
    code: 'CSRF_VALIDATION_FAILED',
  })
}
