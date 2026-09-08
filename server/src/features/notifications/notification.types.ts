export interface NotificationDto {
  id: string
  userId?: string
  brokerageId: string
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  isRead: boolean
  isDeleted?: boolean
  deletedAt?: string
  linkTo?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface PaginatedNotificationsDto {
  notifications: NotificationDto[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  unreadCount: number
}

export interface DeleteNotificationResponseDto {
  success: boolean
  deletedId: string
  replacementNotification: NotificationDto
  unreadCount: number
}

