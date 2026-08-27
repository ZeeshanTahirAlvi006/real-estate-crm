import { Brokerage, IBrokerage } from '../../models/Brokerage.js'
import { User, IUser } from '../../models/User.js'
import {
  BrokerageResponseDto,
  CreateBrokerageInput,
  UpdateBrokerageInput,
} from './brokerage.types.js'
import { verifyBrokerageAccess } from '../../middleware/tenantScope.js'
import { AppError } from '../../middleware/errorHandler.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import mongoose from 'mongoose'

// Format Brokerage document to DTO
const formatBrokerageDto = (brokerage: IBrokerage, memberCount?: number): BrokerageResponseDto => ({
  id: brokerage._id.toString(),
  name: brokerage.name,
  subdomain: brokerage.subdomain,
  plan: brokerage.plan,
  logoUrl: brokerage.logoUrl,
  timezone: brokerage.timezone,
  isActive: brokerage.isActive,
  memberCount,
  createdAt: brokerage.createdAt.toISOString(),
  updatedAt: brokerage.updatedAt.toISOString(),
})

// List all brokerages with active member counts (Super Admin only)
export const listAllBrokerages = async (): Promise<BrokerageResponseDto[]> => {
  const brokerages = await Brokerage.find().sort({ createdAt: -1 })

  // Aggregate member counts per brokerage
  const counts = await User.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$brokerageId', count: { $sum: 1 } } },
  ])
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]))

  return brokerages.map((b) => formatBrokerageDto(b, countMap.get(b._id.toString()) || 0))
}

// Get single brokerage details
export const getBrokerageDetail = async (id: string, caller: IUser): Promise<BrokerageResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!verifyBrokerageAccess(caller, id)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }

  const brokerage = await Brokerage.findById(id)
  if (!brokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const memberCount = await User.countDocuments({ brokerageId: brokerage._id, isActive: true })
  return formatBrokerageDto(brokerage, memberCount)
}

// Create new brokerage (Super Admin only)
export const createNewBrokerage = async (
  input: CreateBrokerageInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<BrokerageResponseDto> => {
  const brokerage = await Brokerage.create({
    name: input.name,
    subdomain: input.subdomain,
    plan: input.plan || 'growth',
    timezone: input.timezone || 'America/New_York',
    createdBy: caller._id,
  })

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: brokerage._id,
    action: 'BROKERAGE_CREATE',
    resource: 'brokerages',
    resourceId: brokerage._id.toString(),
    details: { name: brokerage.name, plan: brokerage.plan },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  return formatBrokerageDto(brokerage, 0)
}

// Update brokerage settings or plan
export const updateBrokerageDetails = async (
  id: string,
  input: UpdateBrokerageInput,
  caller: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<BrokerageResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  if (!verifyBrokerageAccess(caller, id)) {
    throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
  }

  // Only Super Admin can change plan tier
  if (input.plan && caller.role !== USER_ROLES.SUPER_ADMIN) {
    throw new AppError('Unauthorized: You may contact super admin', HTTP_STATUS.FORBIDDEN)
  }

  const brokerage = await Brokerage.findById(id)
  if (!brokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const previousState = {
    name: brokerage.name,
    subdomain: brokerage.subdomain,
    plan: brokerage.plan,
    logoUrl: brokerage.logoUrl,
    timezone: brokerage.timezone,
  }

  if (input.name !== undefined && typeof input.name === 'string') brokerage.name = input.name
  if (input.subdomain !== undefined && typeof input.subdomain === 'string') brokerage.subdomain = input.subdomain
  if (input.plan !== undefined && caller.role === USER_ROLES.SUPER_ADMIN && typeof input.plan === 'string') brokerage.plan = input.plan
  if (input.logoUrl !== undefined && typeof input.logoUrl === 'string') brokerage.logoUrl = input.logoUrl
  if (input.timezone !== undefined && typeof input.timezone === 'string') brokerage.timezone = input.timezone

  await brokerage.save()

  await logAuditEvent({
    userId: caller._id,
    userEmail: caller.email,
    userRole: caller.role,
    brokerageId: brokerage._id,
    action: 'BROKERAGE_UPDATE',
    resource: 'brokerages',
    resourceId: brokerage._id.toString(),
    previousState,
    newState: {
      name: brokerage.name,
      subdomain: brokerage.subdomain,
      plan: brokerage.plan,
      logoUrl: brokerage.logoUrl,
      timezone: brokerage.timezone,
    },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })

  const memberCount = await User.countDocuments({ brokerageId: brokerage._id, isActive: true })
  return formatBrokerageDto(brokerage, memberCount)
}

// Deactivate brokerage and revoke member sessions (Super Admin only)
export const deactivateBrokerage = async (
  id: string,
  caller?: IUser,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'browser'
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  const brokerage = await Brokerage.findById(id)
  if (!brokerage) {
    throw new AppError('Brokerage not found', HTTP_STATUS.NOT_FOUND)
  }

  brokerage.isActive = false
  await brokerage.save()

  // Deactivate all users within the brokerage & invalidate sessions
  await User.updateMany(
    { brokerageId: brokerage._id },
    { $set: { isActive: false }, $inc: { tokenVersion: 1 } }
  )

  await logAuditEvent({
    userId: caller?._id,
    userEmail: caller?.email,
    userRole: caller?.role,
    brokerageId: brokerage._id,
    action: 'BROKERAGE_DEACTIVATE',
    resource: 'brokerages',
    resourceId: brokerage._id.toString(),
    details: { name: brokerage.name },
    status: 'success',
    ipAddress: clientIp,
    userAgent,
  })
}
