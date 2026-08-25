import { User, IUser } from '../../models/User.js'
import { Brokerage } from '../../models/Brokerage.js'
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  AuthResultDto,
  UserResponseDto,
} from './auth.types.js'
import { signAccessToken, signRefreshToken, TokenPayload } from '../../utils/tokenHelper.js'
import { AppError } from '../../middleware/errorHandler.js'
import { GENERIC_AUTH_MESSAGES, HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { cacheGet, cacheSet, cacheDelete } from '../../config/redis.js'
import { hashSha256, generateSecureToken } from '../../utils/cryptoHelper.js'
import { logger } from '../../utils/logger.js'

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
    throw new AppError('Too many failed login attempts. Please try again in 15 minutes.', HTTP_STATUS.TOO_MANY_REQUESTS)
  }
}

// Increment failed login counter
const recordFailedLogin = async (key: string): Promise<void> => {
  const attemptsStr = await cacheGet(`login_attempts:${key}`)
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0
  await cacheSet(`login_attempts:${key}`, (attempts + 1).toString(), 900) // 15 mins
}

// Register new Brokerage and Initial Brokerage Owner
export const registerUser = async (input: RegisterInput): Promise<AuthResultDto> => {
  // Check if email already exists
  const existingUser = await User.findOne({ email: input.email.toLowerCase() })
  if (existingUser) {
    logger.warn(`Registration attempt with duplicate email: ${input.email}`)
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

  const tokens = generateUserTokens(user)
  return {
    user: formatUserResponse(user, brokerage.name),
    ...tokens,
  }
}

// Authenticate user credentials and issue session tokens
export const loginUser = async (input: LoginInput, clientIp: string = '127.0.0.1'): Promise<AuthResultDto> => {
  const attemptKey = `${clientIp}_${input.email.toLowerCase()}`
  await checkLoginAttempts(attemptKey)

  // Find user and explicitly select password
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+password')

  // Enforce constant-time comparison to prevent timing attacks
  const isMatch = user ? await user.comparePassword(input.password) : false

  if (!user || !isMatch || !user.isActive) {
    await recordFailedLogin(attemptKey)
    // Small artificial delay to mitigate timing analysis
    await new Promise((resolve) => setTimeout(resolve, 100))
    throw new AppError(GENERIC_AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
  }

  // Clear failed attempt counter on success
  await cacheDelete(`login_attempts:${attemptKey}`)

  user.lastActiveAt = new Date()
  await user.save()

  const brokerage = await Brokerage.findById(user.brokerageId)
  const tokens = generateUserTokens(user)

  return {
    user: formatUserResponse(user, brokerage?.name),
    ...tokens,
  }
}

// Invalidate user session on logout
export const logoutUser = async (user: IUser): Promise<void> => {
  user.tokenVersion += 1
  await user.save()
}

// Request password reset token
export const requestPasswordReset = async (input: ForgotPasswordInput): Promise<string> => {
  const user = await User.findOne({ email: input.email.toLowerCase() })
  if (user && user.isActive) {
    const rawToken = generateSecureToken(32)
    user.passwordResetToken = hashSha256(rawToken)
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    await user.save()
    logger.info(`Password reset requested for user: ${user.email} (token generated)`)
  }
  // Return generic message regardless of user existence
  return GENERIC_AUTH_MESSAGES.FORGOT_PASSWORD_SENT
}

// Reset password with token verification
export const resetUserPassword = async (input: ResetPasswordInput): Promise<void> => {
  const hashedToken = hashSha256(input.token)
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires')

  if (!user || !user.isActive) {
    throw new AppError(GENERIC_AUTH_MESSAGES.RESET_PASSWORD_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  user.password = input.password
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  user.tokenVersion += 1
  await user.save()
}
