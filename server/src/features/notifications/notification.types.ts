export interface NotificationDto {
  id: string
  userId?: string
  brokerageId: string
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  isRead: boolean
  linkTo?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}
