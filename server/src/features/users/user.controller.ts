import { Request, Response, NextFunction } from 'express'
import {
  getUsersList,
  getUserById,
  inviteUser,
  updateUserProfile,
  updateUserRole,
  deactivateUser,
} from './user.service.js'
import { sendSuccess, sendPaginated } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/users
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { users, total } = await getUsersList(req.query, req.user, req.tenantFilter)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, users, total, page, limit, 'Users retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/users/:id
export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const user = await getUserById(id, req.user)
    sendSuccess(res, user, 'User details retrieved successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/users/invite
export const invite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const result = await inviteUser(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, result, 'User invited successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/users/:id
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const updated = await updateUserProfile(id, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, updated, 'User profile updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/users/:id/role
export const changeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    const updated = await updateUserRole(id, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, updated, 'User role updated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// DELETE /api/users/:id
export const removeUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const userAgent = req.headers['user-agent'] || 'browser'
    await deactivateUser(id, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'User deactivated successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
