import { baseApi } from './baseApi'

export interface AuditLogItem {
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
  status: 'success' | 'failure'
  failureReason?: string
  createdAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Audit Logs API
export const auditApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<
      { logs: AuditLogItem[]; total: number },
      { action?: string; resource?: string; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/audit-logs',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<AuditLogItem[]>) => ({
        logs: response.data || [],
        total: response.pagination?.total ?? (response.data?.length || 0),
      }),
      providesTags: ['AuditLogs'],
    }),
  }),
})

export const { useGetAuditLogsQuery } = auditApi
