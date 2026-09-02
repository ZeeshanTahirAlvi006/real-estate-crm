import { baseApi } from './baseApi'
import type {
  Transaction,
  ConvertDealPayload,
  CreateTransactionPayload,
  UpdateMilestonePayload,
  UploadDocumentPayload,
} from '@/types/transaction'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    total: number
    metrics?: {
      totalVolume: number
      activeCount: number
      closedCount: number
    }
  }
}

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query<
      {
        transactions: Transaction[]
        total: number
        metrics: { totalVolume: number; activeCount: number; closedCount: number }
      },
      {
        search?: string
        status?: string
        type?: string
        assignedAgentId?: string
        page?: number
        limit?: number
      } | void
    >({
      query: (params) => {
        const cleaned: Record<string, any> = {}
        if (params) {
          if (params.page) cleaned.page = params.page
          if (params.limit) cleaned.limit = params.limit
          if (params.search && params.search.trim()) cleaned.search = params.search.trim()
          if (params.status && params.status !== 'all') cleaned.status = params.status
          if (params.type && params.type !== 'all') cleaned.type = params.type
          if (params.assignedAgentId && params.assignedAgentId !== 'all') {
            cleaned.assignedAgentId = params.assignedAgentId
          }
        }
        return {
          url: '/transactions',
          params: cleaned,
        }
      },
      transformResponse: (response: ApiResponse<Transaction[]>) => ({
        transactions: response.data || [],
        total: response.meta?.total || (response.data?.length || 0),
        metrics: response.meta?.metrics || { totalVolume: 0, activeCount: 0, closedCount: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
            ...result.transactions.map(({ id }) => ({ type: 'Transactions' as const, id })),
            { type: 'Transactions', id: 'LIST' },
          ]
          : [{ type: 'Transactions', id: 'LIST' }],
    }),

    getTransactionById: builder.query<Transaction, string>({
      query: (id) => `/transactions/${id}`,
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Transactions', id }],
    }),

    createTransaction: builder.mutation<Transaction, CreateTransactionPayload>({
      query: (body) => ({
        url: '/transactions',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      invalidatesTags: [{ type: 'Transactions', id: 'LIST' }],
    }),

    convertDealToTransaction: builder.mutation<
      Transaction,
      { dealId: string; payload: ConvertDealPayload }
    >({
      query: ({ dealId, payload }) => ({
        url: `/transactions/from-deal/${dealId}`,
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      invalidatesTags: [
        { type: 'Transactions', id: 'LIST' },
        'Deals',
        'Pipeline',
        'Activities',
      ],
    }),

    updateMilestone: builder.mutation<
      Transaction,
      { transactionId: string; milestoneId: string; payload: UpdateMilestonePayload }
    >({
      query: ({ transactionId, milestoneId, payload }) => ({
        url: `/transactions/${transactionId}/milestones/${milestoneId}`,
        method: 'PATCH',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      invalidatesTags: (_result, _error, { transactionId }) => [
        { type: 'Transactions', id: transactionId },
        { type: 'Transactions', id: 'LIST' },
      ],
    }),

    uploadDocument: builder.mutation<
      Transaction,
      { transactionId: string; payload: UploadDocumentPayload }
    >({
      query: ({ transactionId, payload }) => ({
        url: `/transactions/${transactionId}/documents`,
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      invalidatesTags: (_result, _error, { transactionId }) => [
        { type: 'Transactions', id: transactionId },
        { type: 'Transactions', id: 'LIST' },
      ],
    }),

    deleteDocument: builder.mutation<
      Transaction,
      { transactionId: string; docId: string }
    >({
      query: ({ transactionId, docId }) => ({
        url: `/transactions/${transactionId}/documents/${docId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<Transaction>) => response.data,
      invalidatesTags: (_result, _error, { transactionId }) => [
        { type: 'Transactions', id: transactionId },
        { type: 'Transactions', id: 'LIST' },
      ],
    }),

    getPortalTransaction: builder.query<Transaction | null, void>({
      query: () => '/transactions/portal',
      transformResponse: (response: ApiResponse<Transaction | null>) => response.data,
      providesTags: ['Portal'],
    }),
  }),
})

export const {
  useGetTransactionsQuery,
  useGetTransactionByIdQuery,
  useCreateTransactionMutation,
  useConvertDealToTransactionMutation,
  useUpdateMilestoneMutation,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useGetPortalTransactionQuery,
} = transactionsApi
