import { baseApi } from './baseApi'
import type {
  Commission,
  CalculateCommissionInput,
  CommissionCalculationResult,
  CreateCommissionInput,
  BrokerageCommissionReport,
} from '@/types/commission'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface ListCommissionsResponse {
  commissions: Commission[]
  total: number
  page: number
  limit: number
}

export const commissionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    calculateCommission: builder.mutation<CommissionCalculationResult, CalculateCommissionInput>({
      query: (body) => ({
        url: '/commissions/calculate',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<CommissionCalculationResult>) => response.data,
    }),

    createCommission: builder.mutation<Commission, CreateCommissionInput>({
      query: (body) => ({
        url: '/commissions',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Commission>) => response.data,
      invalidatesTags: ['Commissions', 'Transactions', 'Deals'],
    }),

    getCommissions: builder.query<
      ListCommissionsResponse,
      { agentId?: string; transactionId?: string; dealId?: string; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/commissions',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<ListCommissionsResponse>) => response.data,
      providesTags: ['Commissions'],
    }),

    getCommissionById: builder.query<Commission, string>({
      query: (id) => `/commissions/${id}`,
      transformResponse: (response: ApiResponse<Commission>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Commissions', id }],
    }),

    updateCommissionStatus: builder.mutation<Commission, { id: string; status: 'draft' | 'pending_approval' | 'approved' | 'paid'; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/commissions/${id}/status`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<Commission>) => response.data,
      invalidatesTags: ['Commissions'],
    }),

    getCommissionReport: builder.query<BrokerageCommissionReport, { startDate?: string; endDate?: string } | void>({
      query: (params) => ({
        url: '/commissions/report',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<BrokerageCommissionReport>) => response.data,
      providesTags: ['Commissions'],
    }),
  }),
})

export const {
  useCalculateCommissionMutation,
  useCreateCommissionMutation,
  useGetCommissionsQuery,
  useGetCommissionByIdQuery,
  useUpdateCommissionStatusMutation,
  useGetCommissionReportQuery,
} = commissionsApi
