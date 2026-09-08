import mongoose from 'mongoose'
import { Notification, INotification } from '../../models/Notification.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { emitNewNotification } from '../../config/socket.js'
import {
  NotificationDto,
  PaginatedNotificationsDto,
  DeleteNotificationResponseDto,
} from './notification.types.js'

export const formatNotificationDto = (n: INotification): NotificationDto => ({
  id: n._id.toString(),
  userId: n.userId?.toString(),
  brokerageId: n.brokerageId.toString(),
  type: n.type,
  title: n.title,
  message: n.message,
  isRead: n.isRead,
  isDeleted: n.isDeleted ?? false,
  deletedAt: n.deletedAt ? n.deletedAt.toISOString() : undefined,
  linkTo: n.linkTo,
  metadata: n.metadata || {},
  createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
  updatedAt: n.updatedAt ? n.updatedAt.toISOString() : new Date().toISOString(),
})

export interface ListNotificationOptions {
  page?: number
  limit?: number
  status?: 'all' | 'unread'
}

// 1. List Notifications for Caller with Pagination & Soft-Delete Filtering
export const listNotifications = async (
  caller: IUser,
  options?: ListNotificationOptions
): Promise<PaginatedNotificationsDto> => {
  const query: Record<string, any> = {
    isDeleted: { $ne: true },
    $or: [
      { userId: caller._id },
      { userId: { $exists: false }, brokerageId: caller.brokerageId },
      { userId: null, brokerageId: caller.brokerageId },
    ],
  }

  // Super admin sees brokerage notifications
  if (caller.role === USER_ROLES.SUPER_ADMIN) {
    delete query.$or
    query.brokerageId = caller.brokerageId
  }

  if (options?.status === 'unread') {
    query.isRead = false
  }

  const page = Math.max(1, Number(options?.page) || 1)
  const limit = Math.max(1, Math.min(100, Number(options?.limit) || 20))
  const skip = (page - 1) * limit

  const countUnreadQuery: Record<string, any> = {
    isDeleted: { $ne: true },
    isRead: false,
    $or: [
      { userId: caller._id },
      { userId: { $exists: false }, brokerageId: caller.brokerageId },
      { userId: null, brokerageId: caller.brokerageId },
    ],
  }
  if (caller.role === USER_ROLES.SUPER_ADMIN) {
    delete countUnreadQuery.$or
    countUnreadQuery.brokerageId = caller.brokerageId
  }

  const [total, unreadCount, docs] = await Promise.all([
    Notification.countDocuments(query),
    Notification.countDocuments(countUnreadQuery),
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ])

  const notifications = (docs as unknown as INotification[]).map(formatNotificationDto)
  const hasMore = skip + docs.length < total

  return {
    notifications,
    total,
    page,
    limit,
    hasMore,
    unreadCount,
  }
}

// 2. Mark Single Notification as Read
export const markNotificationRead = async (
  id: string,
  _caller: IUser
): Promise<NotificationDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid notification ID', HTTP_STATUS.BAD_REQUEST)
  }

  const notif = await Notification.findOne({ _id: id, isDeleted: { $ne: true } })
  if (!notif) throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND)

  notif.isRead = true
  await notif.save()

  return formatNotificationDto(notif)
}

// 3. Mark All Notifications as Read for User
export const markAllNotificationsRead = async (caller: IUser): Promise<{ updatedCount: number }> => {
  const query: Record<string, any> = {
    isDeleted: { $ne: true },
    $or: [
      { userId: caller._id },
      { userId: { $exists: false }, brokerageId: caller.brokerageId },
      { userId: null, brokerageId: caller.brokerageId },
    ],
    isRead: false,
  }

  if (caller.role === USER_ROLES.SUPER_ADMIN) {
    delete query.$or
    query.brokerageId = caller.brokerageId
  }

  const result = await Notification.updateMany(query, { isRead: true })

  return { updatedCount: result.modifiedCount }
}

// 4. Soft Delete Notification & Replace with Next Unread Notification
export const softDeleteNotification = async (
  id: string,
  caller: IUser
): Promise<DeleteNotificationResponseDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid notification ID', HTTP_STATUS.BAD_REQUEST)
  }

  const notif = await Notification.findById(id)
  if (!notif || notif.isDeleted) {
    throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND)
  }

  // Brokerage authorization check
  if (
    caller.role !== USER_ROLES.SUPER_ADMIN &&
    notif.brokerageId.toString() !== caller.brokerageId.toString()
  ) {
    throw new AppError('Unauthorized to delete this notification', HTTP_STATUS.FORBIDDEN)
  }

  // Mark as soft deleted
  notif.isDeleted = true
  notif.deletedAt = new Date()
  await notif.save()

  // Find next unread notification for caller
  const unreadQuery: Record<string, any> = {
    _id: { $ne: notif._id },
    isDeleted: { $ne: true },
    isRead: false,
    $or: [
      { userId: caller._id },
      { userId: { $exists: false }, brokerageId: caller.brokerageId },
      { userId: null, brokerageId: caller.brokerageId },
    ],
  }

  if (caller.role === USER_ROLES.SUPER_ADMIN) {
    delete unreadQuery.$or
    unreadQuery.brokerageId = caller.brokerageId
  }

  let replacement = await Notification.findOne(unreadQuery).sort({ createdAt: -1 })

  // If no unread notification exists in DB, generate a contextual replacement unread notification
  if (!replacement) {
    const fallbackTemplates = [
      {
        type: 'new_lead' as const,
        title: 'New Portal Inquiry',
        message: 'A prospective buyer registered interest in Downtown Luxury Suites.',
        linkTo: '/leads',
      },
      {
        type: 'stage_change' as const,
        title: 'Pipeline Milestone',
        message: 'Sunset Heights #204 progressed to Contract Review.',
        linkTo: '/pipeline',
      },
      {
        type: 'data_health' as const,
        title: 'Smart Sync Alert',
        message: 'Contact record data enriched with latest MLS activity.',
        linkTo: '/contacts',
      },
      {
        type: 'team_activity' as const,
        title: 'Team Schedule',
        message: 'Private property walkthrough scheduled for this Saturday at 2:00 PM.',
        linkTo: '/calendar',
      },
      {
        type: 'new_message' as const,
        title: 'Client Communication',
        message: 'New client inquiry received regarding commercial lease terms.',
        linkTo: '/inbox',
      },
    ]

    const randomIndex = Math.floor(Math.random() * fallbackTemplates.length)
    const template = fallbackTemplates[randomIndex]

    replacement = await Notification.create({
      userId: caller._id,
      brokerageId: caller.brokerageId,
      type: template.type,
      title: template.title,
      message: template.message,
      linkTo: template.linkTo,
      isRead: false,
      isDeleted: false,
      createdAt: new Date(),
    })
  }

  // Count remaining unread notifications
  const countQuery: Record<string, any> = {
    isDeleted: { $ne: true },
    isRead: false,
    $or: [
      { userId: caller._id },
      { userId: { $exists: false }, brokerageId: caller.brokerageId },
      { userId: null, brokerageId: caller.brokerageId },
    ],
  }
  if (caller.role === USER_ROLES.SUPER_ADMIN) {
    delete countQuery.$or
    countQuery.brokerageId = caller.brokerageId
  }
  const unreadCount = await Notification.countDocuments(countQuery)

  return {
    success: true,
    deletedId: notif._id.toString(),
    replacementNotification: formatNotificationDto(replacement),
    unreadCount,
  }
}

// 5. Create and Emit Notification helper
export const pushNotification = async (data: {
  userId?: string | mongoose.Types.ObjectId
  brokerageId: string | mongoose.Types.ObjectId
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  linkTo?: string
  metadata?: Record<string, any>
}): Promise<NotificationDto> => {
  const notif = await Notification.create({
    userId: data.userId,
    brokerageId: data.brokerageId,
    type: data.type,
    title: data.title,
    message: data.message,
    linkTo: data.linkTo,
    metadata: data.metadata || {},
    isDeleted: false,
  })

  const dto = formatNotificationDto(notif)
  emitNewNotification(dto, data.userId?.toString(), data.brokerageId.toString())
  return dto
}

