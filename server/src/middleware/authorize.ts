import { Request, Response, NextFunction } from 'express'
import { UserRole, GENERIC_AUTH_MESSAGES, HTTP_STATUS, USER_ROLES } from '../utils/constants.js'
import { sendError } from '../utils/apiResponse.js'

// Role hierarchy rank mapping (higher number = more privileges)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.SUPER_ADMIN]: 100,
  [USER_ROLES.BROKERAGE_OWNER]: 80,
  [USER_ROLES.TEAM_LEAD]: 60,
  [USER_ROLES.AGENT]: 40,
  [USER_ROLES.LEAD]: 20,
}

// Role-based authorization middleware
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    if (!req.user || !req.user.isActive) {
      return sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    }

    // Super Admin has universal access
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      return next()
    }

    // Check if user's role is included in allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
    }

    next()
  }
}

// Check if actor has sufficient privilege rank to manage target role
export const hasRolePrivilege = (actorRole: UserRole, targetRole: UserRole): boolean => {
  if (actorRole === USER_ROLES.SUPER_ADMIN) {
    return true
  }
  // Brokerage owner can manage any role below super_admin within their brokerage
  if (actorRole === USER_ROLES.BROKERAGE_OWNER && targetRole !== USER_ROLES.SUPER_ADMIN) {
    return true
  }
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole]
}
