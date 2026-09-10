import mongoose from 'mongoose'
import { User } from '../../models/User.js'
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
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../../utils/tokenHelper.js'
import { AppError } from '../../middleware/errorHandler.js'
import { GENERIC_AUTH_MESSAGES, HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { cacheGet, cacheSet, cacheDelete } from '../../config/redis.js'
import { hashSha256, generateSecureToken } from '../../utils/cryptoHelper.js'
import { logger } from '../../utils/logger.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { invalidateUserAuthCache, warmUserAuthCache } from '../../middleware/authenticate.js'
import { recordDbMetric } from '../../utils/cacheHelper.js'

// Resilient date conversion helper to prevent TypeError on serialized cache objects (RM-12)
const toIsoString = (d: any): string | undefined => {
  if (!d) return undefined
  if (d instanceof Date) return d.toISOString()
  if (typeof d === 'string') return d
  return undefined
}

// Format user document into safe client response DTO
export const formatUserResponse = (user: any, brokerageName?: string): UserResponseDto => {
  const userId = user._id ? user._id.toString() : (user.id ? String(user.id) : '')
  const brokerageId = user.brokerageId ? user.brokerageId.toString() : ''
  return {
    id: userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    brokerageId,
    brokerageName: brokerageName || user.brokerageName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    isActive: user.isActive ?? true,
    mustChangePassword: user.mustChangePassword ?? false,
    createdAt: toIsoString(user.createdAt) || new Date().toISOString(),
    lastActiveAt: toIsoString(user.lastActiveAt),
  }
}

// Generate token pair and payload from user
export const generateUserTokens = (user: any): { accessToken: string; refreshToken: string } => {
  const userId = user._id ? user._id.toString() : String(user.id)
  const brokerageId = user.brokerageId ? user.brokerageId.toString() : ''
  const payload: TokenPayload = {
    userId,
    email: user.email,
    role: user.role,
    brokerageId,
    tokenVersion: user.tokenVersion ?? 0,
  }
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  }
}

// Track and enforce login rate limit per email & IP (RM-11)
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

// Register new Brokerage and Initial Brokerage Owner (RM-04, RM-09, RM-10)
export const registerUser = async (
  input: RegisterInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<AuthResultDto> => {
  const normalizedEmail = input.email.toLowerCase().trim()
  const trimmedBrokerageName = input.brokerageName.trim()
  const isRegisteringAsOwner = !input.role || input.role === USER_ROLES.BROKERAGE_OWNER
  const brokerageCacheKey = `auth:brokerage:owner:${trimmedBrokerageName.toLowerCase()}`

  // 1. Tier 1: Redis Fast-Path Check (< 0.1ms)
  if (isRegisteringAsOwner) {
    try {
      const cachedOwnerId = await cacheGet(brokerageCacheKey)
      if (cachedOwnerId) {
        logger.warn(`Registration attempt for already owned brokerage (cache hit): ${trimmedBrokerageName}`)
        logAuditEvent({
          userEmail: input.email,
          action: 'AUTH_REGISTER',
          resource: 'auth',
          status: 'failure',
          failureReason: 'Brokerage name already registered under an active brokerage owner',
          ipAddress: clientIp,
          userAgent,
        }).catch(() => {})
        throw new AppError(
          'A brokerage with this name already exists under an active brokerage owner.',
          HTTP_STATUS.CONFLICT
        )
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      // Graceful fallback to MongoDB on Redis outage (DI-003)
    }
  }

  // 2. Tier 2: Parallel Covered DB Preflight Checks in a single roundtrip (< 10ms, PERF-M-001, PERF-M-004)
  const startTime = process.hrtime.bigint()

  const [existingUser, conflictingBrokerages] =
    mongoose.connection.readyState === 1
      ? await Promise.all([
          // Query 1: Covered index lookup for duplicate email (RM-09)
          User.findOne({ email: normalizedEmail }).select('_id').lean(),

          // Query 2: Covered index aggregation to check if brokerage name already has an active owner
          isRegisteringAsOwner
            ? Brokerage.aggregate([
                {
                  $match: {
                    name: trimmedBrokerageName,
                  },
                },
                {
                  $lookup: {
                    from: 'users',
                    let: { bId: '$_id' },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ['$brokerageId', '$$bId'] },
                              { $eq: ['$role', USER_ROLES.BROKERAGE_OWNER] },
                              { $eq: ['$isActive', true] },
                            ],
                          },
                        },
                      },
                      { $project: { _id: 1 } },
                      { $limit: 1 },
                    ],
                    as: 'owners',
                  },
                },
                {
                  $match: {
                    'owners.0': { $exists: true },
                  },
                },
                {
                  $project: { _id: 1, name: 1 },
                },
                {
                  $limit: 1,
                },
              ]).collation({ locale: 'en', strength: 2 })
            : Promise.resolve([]),
        ])
      : [null, []]

  recordDbMetric('registerUser:parallelPreflightChecks', startTime, 10)

  // Validate brokerage owner conflict
  if (conflictingBrokerages && conflictingBrokerages.length > 0) {
    const ownerBrokerage = conflictingBrokerages[0]
    // Backfill Redis cache with 24-hour TTL so subsequent duplicate attempts hit Redis in < 0.1ms
    cacheSet(brokerageCacheKey, ownerBrokerage._id.toString(), 86400).catch(() => {})

    logger.warn(`Registration attempt for already owned brokerage (db hit): ${trimmedBrokerageName}`)
    logAuditEvent({
      userEmail: input.email,
      action: 'AUTH_REGISTER',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Brokerage name already registered under an active brokerage owner',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    throw new AppError(
      'A brokerage with this name already exists under an active brokerage owner.',
      HTTP_STATUS.CONFLICT
    )
  }

  // Validate duplicate email
  if (existingUser) {
    logger.warn(`Registration attempt with duplicate email: ${input.email}`)
    logAuditEvent({
      userEmail: input.email,
      action: 'AUTH_REGISTER',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Email already registered',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    // Opaque error to avoid email harvesting
    throw new AppError(GENERIC_AUTH_MESSAGES.UNABLE_TO_REGISTER, HTTP_STATUS.BAD_REQUEST)
  }

  // Pre-allocate userId to consolidate mutations from 3 sequential roundtrips down to 2 (RM-10)
  const userId = new mongoose.Types.ObjectId()

  // Create new Brokerage tenant with createdBy pre-assigned
  const brokerage = await Brokerage.create({
    name: trimmedBrokerageName,
    plan: 'growth',
    createdBy: userId,
  })

  // Create initial user with pre-allocated ID and brokerage link
  const user = await User.create({
    _id: userId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: normalizedEmail,
    password: input.password,
    role: input.role || USER_ROLES.BROKERAGE_OWNER,
    brokerageId: brokerage._id,
    phone: input.phone,
  })

  // Asynchronous non-blocking audit logging (RM-04)
  logAuditEvent({
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
  }).catch(() => {})

  // Cache newly registered brokerage in Redis (24-hour TTL)
  if (isRegisteringAsOwner) {
    cacheSet(brokerageCacheKey, user._id.toString(), 86400).catch(() => {})
    cacheSet(`auth:brokerage:${brokerage._id.toString()}`, brokerage.name, 86400).catch(() => {})
  }

  // Pre-warm L1 and L2 caches immediately
  warmUserAuthCache(user._id.toString(), {
    ...user.toObject(),
    brokerageName: brokerage.name,
  }).catch(() => {})

  const tokens = generateUserTokens(user)
  return {
    user: formatUserResponse(user, brokerage.name),
    ...tokens,
  }
}

// Authenticate user credentials and issue session tokens (RM-04, RM-08, RM-09, RM-13)
export const loginUser = async (
  input: LoginInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<AuthResultDto> => {
  const attemptKey = `${clientIp}_${input.email.toLowerCase()}`
  await checkLoginAttempts(attemptKey)

  // Find user and explicitly select required fields (RM-09)
  const startTime = process.hrtime.bigint()
  const user = await User.findOne({ email: input.email.toLowerCase() }).select(
    '+password _id email password role brokerageId isActive tokenVersion firstName lastName phone avatarUrl timezone mustChangePassword createdAt lastActiveAt'
  )
  recordDbMetric('loginUser:User.findOne', startTime, 10)

  // Enforce constant-time comparison to prevent timing attacks
  const isMatch = user ? await user.comparePassword(input.password) : false

  if (!user || !isMatch || !user.isActive) {
    await recordFailedLogin(attemptKey)
    logAuditEvent({
      userEmail: input.email,
      action: 'AUTH_LOGIN',
      resource: 'auth',
      status: 'failure',
      failureReason: !user ? 'User not found' : !isMatch ? 'Invalid password' : 'User deactivated',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    // Small artificial delay to mitigate timing analysis
    await new Promise((resolve) => setTimeout(resolve, 100))
    throw new AppError(GENERIC_AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED)
  }

  // Clear failed attempt counter on success asynchronously
  cacheDelete(`login_attempts:${attemptKey}`).catch(() => {})

  // Non-blocking targeted atomic update for lastActiveAt (DI-002, RM-08)
  if (mongoose.connection.readyState === 1) {
    void User.updateOne(
      { _id: new mongoose.Types.ObjectId(user._id) },
      { $set: { lastActiveAt: new Date() } }
    ).catch(() => {})
  }

  // Non-blocking audit logging (RM-04)
  logAuditEvent({
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
  }).catch(() => {})

  // Parallel / cached brokerage lookup (RM-01)
  let brokerageName: string | undefined = undefined
  try {
    const brokerageKey = `auth:brokerage:${user.brokerageId.toString()}`
    const cachedName = await cacheGet(brokerageKey)
    if (cachedName) {
      brokerageName = cachedName
    } else if (mongoose.connection.readyState === 1) {
      const brokerage = await Brokerage.findById(new mongoose.Types.ObjectId(user.brokerageId))
        .select('name')
        .lean()
      if (brokerage?.name) {
        brokerageName = brokerage.name
        cacheSet(brokerageKey, brokerage.name, 3600).catch(() => {})
      }
    }
  } catch {
    // Non-fatal fallback
  }

  // Pre-warm L1 and L2 user auth caches (RM-02)
  warmUserAuthCache(user._id.toString(), {
    ...user.toObject(),
    brokerageName,
  }).catch(() => {})

  const tokens = generateUserTokens(user)

  return {
    user: formatUserResponse(user, brokerageName),
    ...tokens,
  }
}

// Invalidate user session on logout (DI-001, DI-002, RM-05)
export const logoutUser = async (
  user: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  const rawUserId = user._id ? user._id.toString() : (user.id ? String(user.id) : '')
  if (rawUserId) {
    // Guard database write: only execute if connected to avoid the 10,000ms Mongoose buffering delay (RM-05)
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(rawUserId)) {
      try {
        await User.updateOne(
          { _id: new mongoose.Types.ObjectId(rawUserId) },
          { $inc: { tokenVersion: 1 } }
        )
      } catch (err: any) {
        logger.warn(`Failed to increment tokenVersion on logout: ${err.message}`)
      }
    }

    // Always invalidate both L1 and L2 cache immediately
    await invalidateUserAuthCache(rawUserId)
  }

  // Non-blocking audit log (RM-04)
  logAuditEvent({
    userId: rawUserId,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_LOGOUT',
    resource: 'auth',
    resourceId: rawUserId || undefined,
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch(() => {})
}

// Request password reset token (RM-04)
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

  logAuditEvent({
    userEmail: input.email,
    action: 'AUTH_PASSWORD_RESET_REQUEST',
    resource: 'auth',
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch(() => {})

  // Return generic message regardless of user existence
  return GENERIC_AUTH_MESSAGES.FORGOT_PASSWORD_SENT
}

// Reset password with token and current password verification (DI-001, RM-04, RM-07)
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
    logAuditEvent({
      action: 'AUTH_PASSWORD_RESET',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Invalid or expired reset token',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    throw new AppError(GENERIC_AUTH_MESSAGES.RESET_PASSWORD_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  const isCurrentMatch = await user.comparePassword(input.currentPassword)
  if (!isCurrentMatch) {
    logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'AUTH_PASSWORD_RESET',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Current password mismatch during reset',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    throw new AppError(GENERIC_AUTH_MESSAGES.RESET_PASSWORD_FAILED, HTTP_STATUS.BAD_REQUEST)
  }

  user.password = input.newPassword
  user.passwordResetToken = undefined
  user.passwordResetExpires = undefined
  user.tokenVersion += 1
  await user.save()

  // Invalidate cached user session immediately (RM-07)
  await invalidateUserAuthCache(user._id.toString())

  logAuditEvent({
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
  }).catch(() => {})
}

// Change password for authenticated session (DI-001, RM-04, RM-07)
export const changeUserPassword = async (
  user: any,
  input: ChangePasswordInput,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (input.currentPassword === input.newPassword) {
    throw new AppError('New password must be different from current password.', HTTP_STATUS.BAD_REQUEST)
  }

  const rawUserId = user._id ? user._id.toString() : String(user.id)
  if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  const userWithPassword = await User.findById(new mongoose.Types.ObjectId(rawUserId)).select('+password')
  if (!userWithPassword || !userWithPassword.isActive) {
    throw new AppError(GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  const isCurrentMatch = await userWithPassword.comparePassword(input.currentPassword)
  if (!isCurrentMatch) {
    logAuditEvent({
      userId: user._id,
      userEmail: user.email,
      action: 'AUTH_PASSWORD_CHANGE',
      resource: 'auth',
      status: 'failure',
      failureReason: 'Current password incorrect',
      ipAddress: clientIp,
      userAgent,
    }).catch(() => {})
    throw new AppError(GENERIC_AUTH_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.BAD_REQUEST)
  }

  userWithPassword.password = input.newPassword
  userWithPassword.mustChangePassword = false
  userWithPassword.tokenVersion += 1
  await userWithPassword.save()

  // Invalidate cached user session immediately (RM-07)
  await invalidateUserAuthCache(rawUserId)

  logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_PASSWORD_CHANGE',
    resource: 'auth',
    resourceId: rawUserId,
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch(() => {})
}

// Refresh access token via valid refresh token (Dual Token Support for Render + Vercel)
export const refreshUserTokens = async (
  refreshToken: string,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<AuthResultDto> => {
  const decoded = verifyRefreshToken(refreshToken)
  const rawUserId = decoded.userId || (decoded as any).id

  if (!rawUserId || !mongoose.Types.ObjectId.isValid(rawUserId)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  const user = await User.findById(new mongoose.Types.ObjectId(rawUserId))
    .select(
      '_id email role brokerageId isActive tokenVersion firstName lastName phone avatarUrl timezone mustChangePassword createdAt lastActiveAt'
    )
    .lean()

  if (!user || !user.isActive || (user.tokenVersion ?? 0) !== (decoded.tokenVersion || 0)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
  }

  let brokerageName: string | undefined = undefined
  try {
    const b = await Brokerage.findById(new mongoose.Types.ObjectId(user.brokerageId)).select('name').lean()
    brokerageName = b?.name
  } catch {
    // Non-fatal fallback
  }

  // Pre-warm user session cache
  warmUserAuthCache(rawUserId, { ...user, brokerageName }).catch(() => {})

  logAuditEvent({
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    brokerageId: user.brokerageId,
    action: 'AUTH_REFRESH_TOKEN',
    resource: 'auth',
    resourceId: rawUserId,
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  }).catch(() => {})

  const tokens = generateUserTokens(user)
  return {
    user: formatUserResponse(user, brokerageName),
    ...tokens,
  }
}



