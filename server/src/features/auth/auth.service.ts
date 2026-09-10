import { User, IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  AuthResultDto,
  UserResponseDto,
} from './auth.types.js'
import { signAccessToken, signRefreshToken, TokenPayload } from '../../utils/tokenHelper.js'
import { AppError } from '../../middleware/errorHandler.js'
import { GENERIC_AUTH_MESSAGES, HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { cacheGet, cacheSet, cacheDelete } from '../../config/redis.js'
import { hashSha256, generateSecureToken } from '../../utils/cryptoHelper.js'
import { logger } from '../../utils/logger.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { invalidateUserAuthCache } from '../../middleware/authenticate.js'

// Format user document into safe client response DTO
export const formatUserResponse = (user: IUser, brokerageName?: string): UserResponseDto => {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    brokerageId: user.brokerageId.toString(),
    brokerageName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword ?? false,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt?.toISOString(),
  }
}

// Generate token pair and payload from user
const generateUserTokens = (user: IUser): { accessToken: string; refreshToken: string } => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    brokerageId: user.brokerageId.toString(),
    tokenVersion: user.tokenVersion,
  }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

// Track and enforce login rate limit per email & IP
const checkLoginAttempts = async (key: string): Promise<void> => {
  const attemptsStr = await cacheGet(`login_attempts:${key}`)
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0
  if (attempts >= 5) {
    throw new AppError('Please try again in 15 minutes.', HTTP_STATUS.TOO_MANY_REQUESTS)
  }
}

// Increment failed login counter
const recordFailedLogin = async (key: string): Promise<void> => {
  const attemptsStr = await cacheGet(`login_attempts:${key}`)
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0
  await cacheSet(`login_attempts:${key}`, (attempts + 1).toString(), 900) // 15 mins
}

// Register new Brokerage and Initial Brokerage Owner
export const registerUser = async (input: RegisterInput, clientIp: string = '127.0.0.1', userAgent: string = 'browser'): Promise<AuthResultDto> => {
  // Check if email already exists
  const existingUser = await User.findOne({ email: input.email.toLowerCase() })
  if (existingUser) {
    logger.warn(`Registration attempt with duplicate email: ${input.email}`)
    await logAuditEvent({
      userEmail: input.email,
      action: 'AUTH_REGISTER',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Email already registered',
      ipAddress: clientIp,
      userAgent,
    })
    // Opaque error to avoid email harvesting
    throw new AppError(GENERIC_AUTH_MESSAGES.UNABLE_TO_REGISTER, HTTP_STATUS.BAD_REQUEST)
  }

  // Create new Brokerage tenant
  const brokerage = await Brokerage.create({
    name: input.brokerageName,
    plan: 'growth',
  })

  // Create initial user with role
  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    password: input.password,
    role: input.role || USER_ROLES.BROKERAGE_OWNER,
    brokerageId: brokerage._id,
    phone: input.phone,
  })

  brokerage.createdBy = user._id
  await brokerage.save()

  await logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: brokerage._id,
    action: 'AUTH_REGISTER',
    resource: 'auth',
    resourceId: user._id.toString(),
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const tokens = generateUserTokens(user)
  return {
    user: formatUserResponse(user, brokerage.name),
    ...tokens,
  }
}

// Authenticate user credentials and issue session tokens
export const loginUser = async (
  input: LoginInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<AuthResultDto> => {
  const attemptKey = `${clientIp}_${input.email.toLowerCase()}`
  await checkLoginAttempts(attemptKey)

  // Find user and explicitly select password
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password')

  // Enforce constant-time comparison to prevent timing attacks
  const isMatch = user ? await user.comparePassword(input.password) : false

  if (!user || !isMatch || !user.isActive) {
    await recordFailedLogin(attemptKey)
    await logAuditEvent({
      userEmail: input.email,
      action: 'AUTH_LOGIN',
      resource: 'auth',
      status: 'failure',
      failureReason: !user ? 'User not found' : !isMatch ? 'Invalid password' : 'User deactivated',
      ipAddress: clientIp,
      userAgent,
    })
    // Small artificial delay to mitigate timing analysis
    await new Promise((resolve) => setTimeout(resolve, 100))
    throw new AppError(GENERIC_AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
  }

  // Clear failed attempt counter on success
  await cacheDelete(`login_attempts:${attemptKey}`)

  user.lastActiveAt = new Date()
  await user.save()

  await logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_LOGIN',
    resource: 'auth',
    resourceId: user._id.toString(),
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const brokerage = await Brokerage.findById(user.brokerageId)
  const tokens = generateUserTokens(user)

  return {
    user: formatUserResponse(user, brokerage?.name),
    ...tokens,
  }
}

// Invalidate user session on logout
export const logoutUser = async (user: IUser, clientIp: string = '127.0.0.1', userAgent: string = 'browser'): Promise<void> => {
  const userId = user._id ? user._id.toString() : (user as any).id
  if (userId) {
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } })
    invalidateUserAuthCache(userId)
  }

  await logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_LOGOUT',
    resource: 'auth',
    resourceId: user._id ? user._id.toString() : undefined,
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })
}

// Request password reset token
export const requestPasswordReset = async (
  input: ForgotPasswordInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<string> => {
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (user && user.isActive) {
    const rawToken = generateSecureToken(32)
    user.passwordResetToken = hashSha256(rawToken)
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()
    logger.info(`Password reset requested for user: ${user.email} (token generated)`)
  }

  await logAuditEvent({
    userEmail: input.email,
    action: 'AUTH_PASSWORD_RESET_REQUEST',
    resource: 'auth',
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  // Return generic message regardless of user existence
  return GENERIC_AUTH_MESSAGES.FORGOT_PASSWORD_SENT
}

// Reset password with token and current password verification
export const resetUserPassword = async (
  input: ResetPasswordInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  const hashedToken = hashSha256(input.token)
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+password +passwordResetToken +passwordResetExpires')

  if (!user || !user.isActive) {
    await logAuditEvent({
      action: 'AUTH_PASSWORD_RESET',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Invalid or expired reset token',
      ipAddress: clientIp,
      userAgent,
    })
    throw new AppError(GENERIC_AUTH_MESSAGES.RESET_PASSWORD_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  const isCurrentMatch = await user.comparePassword(input.currentPassword)
  if (!isCurrentMatch) {
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'AUTH_PASSWORD_RESET',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Current password mismatch during reset',
      ipAddress: clientIp,
      userAgent,
    })
    throw new AppError(GENERIC_AUTH_MESSAGES.RESET_PASSWORD_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  user.password = input.newPassword
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  user.tokenVersion += 1
  await user.save()

  await logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_PASSWORD_RESET',
    resource: 'auth',
    resourceId: user._id.toString(),
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })
}

// Change password for authenticated session
export const changeUserPassword = async (
  user: IUser,
  input: ChangePasswordInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (input.currentPassword === input.newPassword) {
    throw new AppError('New password must be different from current password.', HTTP_STATUS.BAD_REQUEST)
  }

  const userWithPassword = await User.findById(user._id).select('+password')
  if (!userWithPassword || !userWithPassword.isActive) {
    throw new AppError(GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  const isCurrentMatch = await userWithPassword.comparePassword(input.currentPassword)
  if (!isCurrentMatch) {
    await logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'AUTH_PASSWORD_CHANGE',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Current password incorrect',
      ipAddress: clientIp,
      userAgent,
    })
    throw new AppError(GENERIC_AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.BAD_REQUEST)
  }

  userWithPassword.password = input.newPassword
  userWithPassword.mustChangePassword = false
  userWithPassword.tokenVersion += 1
  await userWithPassword.save()

  await logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_PASSWORD_CHANGE',
    resource: 'auth',
    resourceId: user._id.toString(),
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })
}


