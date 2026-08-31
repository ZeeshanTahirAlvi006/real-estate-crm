import mongoose from 'mongoose'
import { Notification, INotification } from '../../models/Notification.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { emitNewNotification } from '../../config/socket.js'
import { NotificationDto } from './notification.types.js'

export const formatNotificationDto = (n: INotification): NotificationDto => ({
  id: n._id.toString(),
  userId: n.userId?.toString(),
  brokerageId: n.brokerageId.toString(),
  type: n.type,
  title: n.title,
  message: n.message,
  isRead: n.isRead,
  linkTo: n.linkTo,
  metadata: n.metadata || {},
  createdAt: n.createdAt ? n.createdAt.toISOString() : new Date().toISOString(),
  updatedAt: n.updatedAt ? n.updatedAt.toISOString() : new Date().toISOString(),
})

// 1. List Notifications for Caller
export const listNotifications = async (caller: IUser): Promise<NotificationDto[]> => {
  const query: Record<string, any> = {
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

  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30).lean()
  return (notifications as unknown as INotification[]).map(formatNotificationDto)
}

// 2. Mark Single Notification as Read
export const markNotificationRead = async (
  id: string,
  _caller: IUser
): Promise<NotificationDto> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid notification ID', HTTP_STATUS.BAD_REQUEST)
  }

  const notif = await Notification.findById(id)
  if (!notif) throw new AppError('Notification not found', HTTP_STATUS.NOT_FOUND)

  notif.isRead = true
  await notif.save()

  return formatNotificationDto(notif)
}

// 3. Mark All Notifications as Read for User
export const markAllNotificationsRead = async (caller: IUser): Promise<{ updatedCount: number }> => {
  const result = await Notification.updateMany(
    {
      $or: [
        { userId: caller._id },
        { userId: { $exists: false }, brokerageId: caller.brokerageId },
        { userId: null, brokerageId: caller.brokerageId },
      ],
      isRead: false,
    },
    { isRead: true }
  )

  return { updatedCount: result.modifiedCount }
}

// 4. Create and Emit Notification helper
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
  })

  const dto = formatNotificationDto(notif)
  emitNewNotification(dto, data.userId?.toString(), data.brokerageId.toString())
  return dto
}
