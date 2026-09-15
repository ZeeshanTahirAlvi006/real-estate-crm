import mongoose from 'mongoose'
import { QualificationCriteria, IQualificationCriteria } from '../../../models/QualificationCriteria.js'
import { IUser } from '../../../models/User.js'
import { AppError } from '../../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../../utils/constants.js'
import { logAuditEvent } from '../../../utils/auditLogger.js'
import { logger } from '../../../utils/logger.js'
import { buildCacheKey, safeJsonParse, recordDbMetric } from '../../../utils/cacheHelper.js'
import { cacheGet, cacheSet } from '../../../config/redis.js'
import {
  QualificationCriteriaDto,
  CreateQualificationCriteriaInput,
  UpdateCriteriaInput,
} from '../aiIsa.types.js'
import {
  startTimer,
  DEFAULT_CRITERIA_SEEDS,
  CRITERIA_PROJECTION,
  formatCriteriaDto,
  criteriaL1Cache,
  invalidateAiIsaCaches,
} from './aiIsa.common.js'

export const getQualificationCriteria = async (
  tenantFilter: Record<string, any>,
  caller: IUser
): Promise<QualificationCriteriaDto[]> => {
  const stopTimer = startTimer('getQualificationCriteria')
  try {
    const bIdStr = tenantFilter.brokerageId?.toString() || 'global'
    const l1Key = `crit:${bIdStr}`

    const l1Cached = criteriaL1Cache.get(l1Key)
    if (l1Cached) {
      stopTimer()
      return l1Cached
    }

    const l2Key = buildCacheKey(bIdStr, 'ai-isa', 'criteria')
    try {
      const l2Raw = await cacheGet(l2Key)
      const l2Parsed = safeJsonParse<QualificationCriteriaDto[]>(l2Raw)
      if (l2Parsed) {
        criteriaL1Cache.set(l1Key, l2Parsed)
        stopTimer()
        return l2Parsed
      }
    } catch {
      // Fall through on Redis failure
    }

    const tDb = process.hrtime.bigint()
    let criteria = (await QualificationCriteria.find(tenantFilter)
      .select(CRITERIA_PROJECTION)
      .sort({ order: 1 })
      .lean()) as unknown as IQualificationCriteria[]

    // Seed default best-practice criteria if none exist
    if (criteria.length === 0 && caller.brokerageId) {
      const seeded = await Promise.all(
        DEFAULT_CRITERIA_SEEDS.map((seed) =>
          QualificationCriteria.create({
            ...seed,
            brokerageId: caller.brokerageId,
            createdBy: caller._id,
          })
        )
      )
      criteria = seeded.map((s) => s.toObject() as IQualificationCriteria)
    }
    recordDbMetric('getQualificationCriteria', tDb)

    const dtos = criteria.map(formatCriteriaDto)
    criteriaL1Cache.set(l1Key, dtos)
    cacheSet(l2Key, JSON.stringify(dtos), 300).catch(() => { })

    stopTimer()
    return dtos
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 81]: Failed to get AI ISA qualification criteria")
    throw error
  }
}

export const createQualificationCriteria = async (
  input: CreateQualificationCriteriaInput,
  caller: IUser
): Promise<QualificationCriteriaDto> => {
  const stopTimer = startTimer('createQualificationCriteria')
  try {
    const tDb = process.hrtime.bigint()
    const maxOrderDoc = await QualificationCriteria.findOne({ brokerageId: caller.brokerageId })
      .sort({ order: -1 })
      .select('order')
      .lean()
    const nextOrder = maxOrderDoc?.order !== undefined ? maxOrderDoc.order + 1 : 0

    const item = await QualificationCriteria.create({
      ...input,
      order: nextOrder,
      brokerageId: caller.brokerageId,
      createdBy: caller._id,
    })
    recordDbMetric('createQualificationCriteria', tDb)

    logAuditEvent({
      action: 'qualificationCriteria.created',
      userId: caller._id.toString(),
      resource: 'QualificationCriteria',
      resourceId: item._id.toString(),
      details: { category: input.category, label: input.label },
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[AuditLog] Criteria create error: ${err.message}`))

    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCriteriaDto(item)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 124]: Failed to create qualification criteria")
    throw error
  }
}

export const updateQualificationCriteria = async (
  id: string,
  input: UpdateCriteriaInput,
  caller: IUser
): Promise<QualificationCriteriaDto> => {
  const stopTimer = startTimer('updateQualificationCriteria')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid criteria ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const item = (await QualificationCriteria.findOneAndUpdate(
      { _id: objectId, brokerageId: caller.brokerageId },
      { $set: input },
      { new: true, lean: true }
    ).select(CRITERIA_PROJECTION)) as IQualificationCriteria | null
    recordDbMetric('updateQualificationCriteria', tDb)

    if (!item) throw new AppError('Qualification criteria not found', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'qualificationCriteria.updated',
      userId: caller._id.toString(),
      resource: 'QualificationCriteria',
      resourceId: id,
      details: input,
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/aiIsa.service.ts: Line 159]: Failed to audit log update qualification criteria`, err))

    await invalidateAiIsaCaches(caller.brokerageId?.toString())

    const dto = formatCriteriaDto(item)
    stopTimer()
    return dto
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 168]: Failed to update qualification criteria")
    throw error
  }
}

export const deleteQualificationCriteria = async (
  id: string,
  caller: IUser
): Promise<void> => {
  const stopTimer = startTimer('deleteQualificationCriteria')
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid criteria ID format', HTTP_STATUS.BAD_REQUEST)
    }
    const objectId = new mongoose.Types.ObjectId(id)

    const tDb = process.hrtime.bigint()
    const result = await QualificationCriteria.deleteOne({
      _id: objectId,
      brokerageId: caller.brokerageId,
    })
    recordDbMetric('deleteQualificationCriteria', tDb)

    if (result.deletedCount === 0) throw new AppError('Qualification criteria not found', HTTP_STATUS.NOT_FOUND)

    logAuditEvent({
      action: 'qualificationCriteria.deleted',
      userId: caller._id.toString(),
      resource: 'QualificationCriteria',
      resourceId: id,
      ipAddress: '127.0.0.1',
      userAgent: 'browser',
    }).catch((err) => logger.error(`[server/src/features/ai-isa/aiIsa.service.ts: Line 200]: Failed to audit log delete qualification criteria`, err))

    await invalidateAiIsaCaches(caller.brokerageId?.toString())
    stopTimer()
  } catch (error) {
    stopTimer()
    logger.warn("[server/src/features/ai-isa/aiIsa.service.ts: Line 206]: Failed to delete qualification criteria")
    throw error
  }
}
