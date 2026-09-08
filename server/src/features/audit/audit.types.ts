import { AuditLogStatus } from '../../models/AuditLog.js'

export interface AuditLogResponseDto {
  id: string
  userId?: string
  userEmail?: string
  userRole?: string
  brokerageId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  previousState?: Record<string, any>
  newState?: Record<string, any>
  ipAddress: string
  userAgent: string
  status: AuditLogStatus
  failureReason?: string
  createdAt: string
}

export interface ListAuditLogsQuery {
  action?: string
  resource?: string
  userEmail?: string
  status?: AuditLogStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
