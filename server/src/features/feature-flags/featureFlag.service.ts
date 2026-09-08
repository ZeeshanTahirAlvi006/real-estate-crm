import { FeatureFlag, IFeatureFlag } from '../../models/FeatureFlag.js'
import { IUser } from '../../models/User.js'
import { FeatureFlagResponseDto, ToggleFeatureFlagInput } from './featureFlag.types.js'
import { cacheSet } from '../../config/redis.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { logger } from '../../utils/logger.js'
import { logAuditEvent } from '../../utils/auditLogger.js'

// Format FeatureFlag document to DTO
const formatFeatureFlagDto = (flag: IFeatureFlag): FeatureFlagResponseDto => ({
  id: flag._id.toString(),
  key: flag.key,
  name: flag.name,
  isEnabled: flag.isEnabled,
  description: flag.description,
  disabledReason: flag.disabledReason,
  updatedAt: flag.updatedAt.toISOString(),
})

// Get all feature flags
export const listFeatureFlags = async (): Promise<FeatureFlagResponseDto[]> => {
  const flags = await FeatureFlag.find().sort({ name: 1 })
  return flags.map(formatFeatureFlagDto)
}

// Toggle a feature flag (Super Admin only)
export const updateFeatureFlag = async (
  key: string,
  input: ToggleFeatureFlagInput,
  adminUser: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<FeatureFlagResponseDto> => {
  const flag = await FeatureFlag.findOne({ key: key.toLowerCase() })
  if (!flag) {
    throw new AppError('Feature flag not found', HTTP_STATUS.NOT_FOUND)
  }

  const previousState = flag.isEnabled
  flag.isEnabled = input.isEnabled
  flag.disabledReason = input.isEnabled ? undefined : input.disabledReason || 'Under maintenance'
  flag.updatedBy = adminUser._id
  await flag.save()

  // Update Redis cache immediately (0ms propagation)
  await cacheSet(`feature_flag:${flag.key}`, flag.isEnabled ? '1' : '0', 86400)

  await logAuditEvent({
    userId: adminUser._id,
    userEmail: adminUser.email,
    userRole: adminUser.role,
    brokerageId: adminUser.brokerageId,
    action: 'FEATURE_FLAG_TOGGLE',
    resource: 'feature_flags',
    resourceId: flag.key,
    details: { feature: flag.key, name: flag.name },
    previousState: { isEnabled: previousState },
    newState: { isEnabled: flag.isEnabled, disabledReason: flag.disabledReason },
    ipAddress: clientIp,
    userAgent,
    status: 'success',
  })

  logger.info(
    `Feature flag [${flag.key}] toggled: ${previousState} -> ${flag.isEnabled} by admin: ${adminUser.email}`
  )

  return formatFeatureFlagDto(flag)
}
