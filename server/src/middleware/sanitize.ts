import { Request, Response, NextFunction } from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import { deepSanitize } from '../utils/sanitizer.js'

// MongoDB Operator Sanitization Middleware
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
})

/**
 * Mutates an object's own properties in place rather than reassigning the
 * container. Needed because req.query is a getter-only property in
 * Express 5 — `req.query = x` throws a TypeError there.
 */
const sanitizeInPlace = (target: Record<string, unknown>): void => {
  const sanitized = deepSanitize(target) as Record<string, unknown>
  for (const key of Object.keys(target)) {
    if (!(key in sanitized)) delete target[key]
  }
  Object.assign(target, sanitized)
}

// Deep XSS and String Trimming Sanitizer
export const xssSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body) // body stays assignable in both Express 4 and 5
    }
    if (req.query && typeof req.query === 'object') {
      sanitizeInPlace(req.query as Record<string, unknown>)
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeInPlace(req.params as Record<string, unknown>)
    }
    next()
  } catch (err) {
    next(err) // let the app's error-handling middleware format the response
  }
}

// Combined Global Sanitization Middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  mongoSanitizer(req, res, (err?: unknown) => {
    if (err) return next(err)
    xssSanitizer(req, res, next)
  })
}