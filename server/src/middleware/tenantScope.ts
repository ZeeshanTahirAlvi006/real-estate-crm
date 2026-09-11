import { Request, Response, NextFunction } from 'express'
import { IUser } from '../models/User.js'
import { USER_ROLES, GENERIC_AUTH_MESSAGES, HTTP_STATUS } from '../utils/constants.js'
import { sendError } from '../utils/apiResponse.js'
import mongoose from 'mongoose'

// Extend Express Request to include tenant scoping filter
declare global {
  namespace Express {
    interface Request {
      tenantFilter?: {
        brokerageId?: mongoose.Types.ObjectId | string | { $in: (mongoose.Types.ObjectId | string)[] }
      }
      effectiveBrokerageId?: string
    }
  }
}

// Multi-tenant query isolation middleware
export const tenantScope = (req: Request, res: Response, next: NextFunction): void | Response => {
  if (!req.user) {
    return sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  // Super Admin can view all brokerages or optionally filter by query param
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    const requestedBrokerageId = req.query.brokerageId as string | undefined
    if (requestedBrokerageId && mongoose.Types.ObjectId.isValid(requestedBrokerageId)) {
      req.tenantFilter = { brokerageId: new mongoose.Types.ObjectId(requestedBrokerageId) }
      req.effectiveBrokerageId = requestedBrokerageId
    } else {
      req.tenantFilter = {}
      req.effectiveBrokerageId = req.user.brokerageId?.toString()
    }
    return next()
  }

  // All other roles strictly scoped to their own brokerage ID
  req.tenantFilter = {
    brokerageId: req.user.brokerageId,
  }
  req.effectiveBrokerageId = req.user.brokerageId ? req.user.brokerageId.toString() : undefined

  next()
}

// Verify that user has access to a specific brokerage resource
export const verifyBrokerageAccess = (user: IUser, resourceBrokerageId: mongoose.Types.ObjectId | string): boolean => {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return true
  }
  if (!user?.brokerageId || !resourceBrokerageId) {
    return false
  }
  return user.brokerageId.toString() === resourceBrokerageId.toString()
}

// Strict multi-tenant communication query isolation middleware:
// Prohibits cross-brokerage communications and ensures ALL roles (including Super Admin)
// are strictly bound to their own brokerage ID with no query-parameter bypass.
export const strictCommunicationScope = (req: Request, res: Response, next: NextFunction): void | Response => {
  if (!req.user) {
    return sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  if (!req.user.brokerageId) {
    return sendError(res, 'User account has no associated brokerage.', HTTP_STATUS.FORBIDDEN)
  }

  // Strictly bind to user's assigned brokerage — no bypass for super_admin or query parameters
  req.tenantFilter = {
    brokerageId: req.user.brokerageId,
  }
  req.effectiveBrokerageId = req.user.brokerageId.toString()

  next()
}

// Strict communication resource verification (no super_admin bypass for private messages/conversations)
export const verifyCommunicationBrokerageAccess = (
  user: IUser,
  resourceBrokerageId: mongoose.Types.ObjectId | string
): boolean => {
  if (!user?.brokerageId || !resourceBrokerageId) {
    return false
  }
  return user.brokerageId.toString() === resourceBrokerageId.toString()
}
