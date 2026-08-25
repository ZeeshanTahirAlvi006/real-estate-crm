import { Request, Response, NextFunction } from 'express'
import mongoSanitize from 'express-mongo-sanitize'
import { deepSanitize } from '../utils/sanitizer.js'

// MongoDB Operator Sanitization Middleware
export const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
})

// Deep XSS and String Trimming Sanitizer
export const xssSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query)
  }
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params)
  }
  next()
}

// Combined Global Sanitization Middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  mongoSanitizer(req, res, () => {
    xssSanitizer(req, res, next)
  })
}
