import { AiIsaConfig, IAiIsaConfig } from '../../../models/AiIsaConfig.js'
import { IUser } from '../../../models/User.js'
import { AppError } from '../../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../../utils/constants.js'
import { logAuditEvent } from '../../../utils/auditLogger.js'
import { logger } from '../../../utils/logger.js'
import { buildCacheKey, safeJsonParse, recordDbMetric } from '../../../utils/cacheHelper.js'
import { cacheGet, cacheSet } from '../../../config/redis.js'
import {
  AiIsaConfigDto,
  UpdateAiIsaConfigInput,
} from '../aiIsa.types.js'
import {
  startTimer,
  AI_ISA_CONFIG_PROJECTION,
  formatConfigDto,
  aiIsaConfigL1Cache,
  invalidateAiIsaCaches,
} from './aiIsa.common.js'

export const getAiIsaConfig = async (
  tenantFilter: Record<string, any>,
  caller: IUser
): Promise<AiIsaConfigDto> => {
  const stopTimer = startTimer('getAiIsaConfig')
  try {
    const bIdStr = tenantFilter.brokerageId?.toString() || 'global'
    const l1Key = `cfg:${bIdStr}`

    // L1 Memory Cache Check
    const l1Cached = aiIsaConfigL1Cache.get(l1Key)
    if (l1Cached) {
      stopTimer()
      return l1Cached
    }

    // L2 Redis Cache Check
    const l2Key = buildCacheKey(bIdStr, 'ai-isa', 'config')
    try {
      const l2Raw = await cacheGet(l2Key)
      const l2Parsed = safeJsonParse<AiIsaConfigDto>(l2Raw)
      if (l2Parsed) {
        aiIsaConfigL1Cache.set(l1Key, l2Parsed)
        stopTimer()
        return l2Parsed
      }
    } catch {
      // Fall through to DB gracefully on Redis failure (DI-003)
    }

    const tDb = process.hrtime.bigint()
    let config = (await AiIsaConfig.findOne(tenantFilter)
      .select(AI_ISA_CONFIG_PROJECTION)
      .lean()) as IAiIsaConfig | null

    // Lazy initialization for new tenants
    if (!config && caller.brokerageId) {
      const created = await AiIsaConfig.create({
        brokerageId: caller.brokerageId,
        createdBy: caller._id,
      })
      config = created.toObject() as IAiIsaConfig
    }
    recordDbMetric('getAiIsaConfig', tDb)

    if (!config) {
      throw new AppError('Failed to load AI ISA configuration', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const dto = formatConfigDto(config)
    aiIsaConfigL1Cache.set(l1Key, dto)
    cacheSet(l2Key, JSON.stringify(dto), 300).catch(() => { }) // 5m TTL fire-and-forget

    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 294]: Failed to get AI ISA config")
    throw error
  }
}

export const updateAiIsaConfig = async (
  input: UpdateAiIsaConfigInput,
  caller: IUser
): Promise<AiIsaConfigDto> => {
  const stopTimer = startTimer('updateAiIsaConfig')
  try {
    if (!caller.brokerageId) {
      throw new AppError('Brokerage context required', HTTP_STATUS.BAD_REQUEST)
    }

    const tDb = process.hrtime.bigint()
    // Upsert configuration if it doesn't exist yet
    const config = (await AiIsaConfig.findOneAndUpdate(
      { brokerageId: caller.brokerageId },
      {
        $set: input,
        $setOnInsert: { createdBy: caller._id },
      },
      { new: true, upsert: true, lean: true }
    ).select(AI_ISA_CONFIG_PROJECTION)) as IAiIsaConfig
    recordDbMetric('updateAiIsaConfig', tDb)

    // Fire & Forget Audit Logging
    logAuditEvent({
      action: 'aiIsaConfig.updated',
      userId: caller._id.toString(),
      resource: 'AiIsaConfig',
      resourceId: config._id.toString(),
      details: { fieldsUpdated: Object.keys(input) },
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[AuditLog] Config update error: ${err.message}`))

    // Coordinated Invalidation across all cache layers
    await invalidateAiIsaCaches(caller.brokerageId.toString())

    const dto = formatConfigDto(config)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 349]: Failed to update AI ISA config")
    throw error
  }
}
