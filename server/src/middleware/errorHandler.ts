import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../utils/logger.js'
import { sendError } from '../utils/apiResponse.js'
import { HTTP_STATUS } from '../utils/constants.js'
import { env } from '../config/env.js'

// Custom Application Error Class
export class AppError extends Error {
  public statusCode: number
  public errors?: unknown

  constructor(message: string, statusCode: number = HTTP_STATUS.BAD_REQUEST, errors?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// Global Express Error Handler Middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): Response => {
  logger.error(`[${req.method}] ${req.originalUrl} - Error: ${err.message}`, {
    stack: err.stack,
  })

  // Handle Custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors)
  }

  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    return sendError(res, 'Validation error', HTTP_STATUS.UNPROCESSABLE_ENTITY, formattedErrors)
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 'Invalid resource identifier format', HTTP_STATUS.BAD_REQUEST)
  }

  // Handle Mongoose Duplicate Key Error (11000)
  if ((err as any).code === 11000) {
    return sendError(res, 'Duplicate record field detected', HTTP_STATUS.CONFLICT)
  }

  // Handle JWT Malformed / Expired Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'Invalid or expired authentication token', HTTP_STATUS.UNAUTHORIZED)
  }

  // Fallback for unhandled unexpected errors
  const fallbackMessage =
    env.NODE_ENV === 'production' ? 'Internal server error occurred' : err.message

  return sendError(res, fallbackMessage, HTTP_STATUS.INTERNAL_SERVER_ERROR)
}
