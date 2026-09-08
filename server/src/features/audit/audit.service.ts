import { AuditLog, IAuditLog } from '../../models/AuditLog.js'
import { AuditLogResponseDto, ListAuditLogsQuery } from './audit.types.js'
import { getPagination } from '../../utils/pagination.js'

// Format AuditLog document into DTO
export const formatAuditLogDto = (log: IAuditLog): AuditLogResponseDto => ({
  id: log._id.toString(),
  userId: log.userId?.toString(),
  userEmail: log.userEmail,
  userRole: log.userRole,
  brokerageId: log.brokerageId?.toString(),
  action: log.action,
  resource: log.resource,
  resourceId: log.resourceId,
  details: log.details,
  previousState: log.previousState,
  newState: log.newState,
  ipAddress: log.ipAddress,
  userAgent: log.userAgent,
  status: log.status,
  failureReason: log.failureReason,
  createdAt: log.createdAt.toISOString(),
})

// Build query filter with tenant scoping and date boundaries
const buildAuditFilter = (query: ListAuditLogsQuery, tenantFilter: Record<string, any>) => {
  const filter: Record<string, any> = { ...tenantFilter }

  if (query.action) filter.action = query.action
  if (query.resource) filter.resource = query.resource
  if (query.userEmail) filter.userEmail = query.userEmail.toLowerCase()
  if (query.status) filter.status = query.status

  if (query.startDate || query.endDate) {
    filter.createdAt = {}
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate)
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate)
  }

  return filter
}

// List audit logs with pagination and multi-dimensional filters
export const listAuditLogs = async (
  query: ListAuditLogsQuery,
  tenantFilter: Record<string, any> = {}
): Promise<{ logs: AuditLogResponseDto[]; total: number }> => {
  const filter = buildAuditFilter(query, tenantFilter)
  const { limit, skip } = getPagination(query)
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1
  const sortField = query.sortBy || 'createdAt'

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ])

  return { logs: logs.map(formatAuditLogDto), total }
}
