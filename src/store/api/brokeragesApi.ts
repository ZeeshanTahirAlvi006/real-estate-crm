import { baseApi } from './baseApi'

export interface BrokerageItem {
  id: string
  name: string
  subdomain?: string
  plan: 'growth' | 'pro' | 'enterprise'
  logoUrl?: string
  timezone: string
  isActive: boolean
  memberCount?: number
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Brokerage Multi-Tenant Management API
export const brokeragesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrokerages: builder.query<BrokerageItem[], void>({
      query: () => '/brokerages',
      transformResponse: (response: ApiResponse<BrokerageItem[]>) => response.data || [],
      providesTags: ['Brokerages'],
    }),

    getBrokerageById: builder.query<BrokerageItem, string>({
      query: (id) => `/brokerages/${id}`,
      transformResponse: (response: ApiResponse<BrokerageItem>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Brokerages', id }],
    }),

    updateBrokerage: builder.mutation<BrokerageItem, { id: string; data: Partial<BrokerageItem> }>({
      query: ({ id, data }) => ({
        url: `/brokerages/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<BrokerageItem>) => response.data,
      invalidatesTags: ['Brokerages'],
    }),
  }),
})

export const { useGetBrokeragesQuery, useGetBrokerageByIdQuery, useUpdateBrokerageMutation } = brokeragesApi
