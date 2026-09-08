import { User, IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import {
  InviteUserInput,
  InviteUserResponseDto,
  UpdateUserInput,
  ChangeUserRoleInput,
  ListUsersQuery,
} from './user.types.js'
import { UserResponseDto } from '../auth/auth.types.js'
import { formatUserResponse } from '../auth/auth.service.js'
import { hasRolePrivilege } from '../../middleware/authorize.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { AppError } from '../../middleware/errorHandler.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { escapeRegExp } from '../../utils/sanitizer.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import crypto from 'crypto'
import mongoose from 'mongoose'

// Generate secure random temporary password meeting all complexity rules
const generateTemporaryPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%^&*'

  let password = ''
  password += upper[crypto.randomInt(0, upper.length)]
  password += lower[crypto.randomInt(0, lower.length)]
  password += digits[crypto.randomInt(0, digits.length)]
  password += special[crypto.randomInt(0, special.length)]

  const allChars = upper + lower + digits + special
  for (let i = 4; i < 12; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)]
  }
  return password
}

// List users with multi-tenant filtering, search, and pagination
export const getUsersList = async (
  query: ListUsersQuery,
  _caller: IUser,
  tenantFilter: Record<string, any> = {}
): Promise<{ users: UserResponseDto[]; total: number }> => {
  const filter: Record<string, any> = { ...tenantFilter }

  if (query.role) {
    filter.role = query.role
  }

  if (query.search) {
    const escaped = escapeRegExp(query.search)
    filter.$or = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ]
  }

  const page = query.page || 1
  const limit = query.limit || 25
  const skip = (page - 1) * limit
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'createdAt'

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .populate('brokerageId', 'name'),
    User.countDocuments(filter),
  ])

  const formattedUsers = users.map((u) => {
    const brokerageName = (u.brokerageId as any)?.name
    return formatUserResponse(u, brokerageName)
  })

  return { users: formattedUsers, total }
}

// Get user detail by ID
export const getUserById = async (id: string, caller: IUser): Promise<UserResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  const user = await User.findById(id).populate('brokerageId', 'name')
  if (!user || !verifyBrokerageAccess(caller, user.brokerageId._id)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  const brokerageName = (user.brokerageId as any)?.name
  return formatUserResponse(user, brokerageName)
}

// Invite new team member with one-time temporary password
export const inviteUser = async (
  input: InviteUserInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<InviteUserResponseDto> => {
  if (!hasRolePrivilege(caller.role, input.role)) {
    throw new AppError('Cannot assign a role with equal or higher privileges than your own', HTTP_STATUS.FORBIDDEN)
  }

  let targetBrokerageId: mongoose.Types.ObjectId
  if (caller.role === USER_ROLES.SUPER_ADMIN && input.brokerageId) {
    targetBrokerageId = new mongoose.Types.ObjectId(input.brokerageId)
  } else {
    targetBrokerageId = caller.brokerageId
  }

  const existing = await User.findOne({ email: input.email.toLowerCase() })
  if (existing) {
    throw new AppError('A user with this email address already exists', HTTP_STATUS.CONFLICT)
  }

  const temporaryPassword = generateTemporaryPassword()
  const newUser = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    password: temporaryPassword,
    role: input.role,
    brokerageId: targetBrokerageId,
    phone: input.phone,
    mustChangePassword: true,
  })

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: targetBrokerageId,
    action: 'USER_INVITE',
    resource: 'users',
    resourceId: newUser._id.toString(),
    details: { invitedEmail: newUser.email, assignedRole: newUser.role },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const brokerage = await Brokerage.findById(targetBrokerageId)
  return {
    user: formatUserResponse(newUser, brokerage?.name),
    temporaryPassword,
  }
}

// Update user profile fields
export const updateUserProfile = async (
  id: string,
  input: UpdateUserInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<UserResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  const user = await User.findById(id)
  if (!user || !verifyBrokerageAccess(caller, user.brokerageId)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  // Only self or higher privileged admin can update profile
  const isSelf = caller._id.toString() === user._id.toString()
  const canManage = hasRolePrivilege(caller.role, user.role)
  if (!isSelf && !canManage) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }

  const previousState = {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
  }

  if (input.firstName !== undefined && typeof input.firstName === 'string') user.firstName = input.firstName
  if (input.lastName !== undefined && typeof input.lastName === 'string') user.lastName = input.lastName
  if (input.phone !== undefined && typeof input.phone === 'string') user.phone = input.phone
  if (input.timezone !== undefined && typeof input.timezone === 'string') user.timezone = input.timezone
  if (input.avatarUrl !== undefined && typeof input.avatarUrl === 'string') user.avatarUrl = input.avatarUrl

  await user.save()

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: user.brokerageId,
    action: 'USER_UPDATE',
    resource: 'users',
    resourceId: user._id.toString(),
    previousState,
    newState: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
    },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const brokerage = await Brokerage.findById(user.brokerageId)
  return formatUserResponse(user, brokerage?.name)
}

// Change user role
export const updateUserRole = async (
  id: string,
  input: ChangeUserRoleInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<UserResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  const user = await User.findById(id)
  if (!user || !verifyBrokerageAccess(caller, user.brokerageId)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!hasRolePrivilege(caller.role, user.role) || !hasRolePrivilege(caller.role, input.role)) {
    throw new AppError('Insufficient privileges to modify this user role', HTTP_STATUS.FORBIDDEN)
  }

  const previousRole = user.role
  user.role = input.role
  user.tokenVersion += 1 // Invalidate current session to force token renewal
  await user.save()

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: user.brokerageId,
    action: 'USER_ROLE_CHANGE',
    resource: 'users',
    resourceId: user._id.toString(),
    previousState: { role: previousRole },
    newState: { role: user.role },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const brokerage = await Brokerage.findById(user.brokerageId)
  return formatUserResponse(user, brokerage?.name)
}

// Soft-deactivate user account and revoke active sessions
export const deactivateUser = async (
  id: string,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  if (caller._id.toString() === id) {
    throw new AppError('You cannot deactivate your own account', HTTP_STATUS.BAD_REQUEST)
  }

  const user = await User.findById(id)
  if (!user || !verifyBrokerageAccess(caller, user.brokerageId)) {
    throw new AppError('User not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!hasRolePrivilege(caller.role, user.role)) {
    throw new AppError('Insufficient privileges to deactivate this user', HTTP_STATUS.FORBIDDEN)
  }

  user.isActive = false
  user.tokenVersion += 1 // Instantly invalidates all existing JWT sessions
  await user.save()

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: user.brokerageId,
    action: 'USER_DEACTIVATE',
    resource: 'users',
    resourceId: user._id.toString(),
    details: { targetEmail: user.email, targetRole: user.role },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })
}
