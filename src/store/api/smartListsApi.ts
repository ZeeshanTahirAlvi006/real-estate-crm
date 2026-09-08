import { baseApi } from './baseApi'
import type { Contact, SavedSmartList, SmartListFilter } from '@/types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface SmartListPreviewResponse {
  contacts: Contact[]
  total: number
  page: number
  limit: number
}

export const smartListsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSmartLists: builder.query<SavedSmartList[], void>({
      query: () => '/smart-lists',
      transformResponse: (response: ApiResponse<any[]>) => {
        const lists = response.data || []
        return lists.map((item) => ({
          id: item._id || item.id,
          name: item.name,
          filters: item.filters || [],
          contactCount: item.contactCount || 0,
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        }))
      },
      providesTags: ['SmartLists'],
    }),

    createSmartList: builder.mutation<SavedSmartList, { name: string; filters: SmartListFilter[] }>({
      query: (body) => ({
        url: '/smart-lists',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<any>) => ({
        id: response.data._id || response.data.id,
        name: response.data.name,
        filters: response.data.filters || [],
        contactCount: response.data.contactCount || 0,
        updatedAt: response.data.updatedAt || new Date().toISOString(),
      }),
      invalidatesTags: ['SmartLists'],
    }),

    updateSmartList: builder.mutation<
      SavedSmartList,
      { id: string; name?: string; filters?: SmartListFilter[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/smart-lists/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponse<any>) => ({
        id: response.data._id || response.data.id,
        name: response.data.name,
        filters: response.data.filters || [],
        contactCount: response.data.contactCount || 0,
        updatedAt: response.data.updatedAt || new Date().toISOString(),
      }),
      invalidatesTags: ['SmartLists'],
    }),

    deleteSmartList: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/smart-lists/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SmartLists'],
    }),

    previewSmartList: builder.mutation<
      SmartListPreviewResponse,
      { filters: SmartListFilter[]; page?: number; limit?: number }
    >({
      query: ({ filters, page = 1, limit = 50 }) => ({
        url: `/smart-lists/preview?page=${page}&limit=${limit}`,
        method: 'POST',
        body: { filters },
      }),
      transformResponse: (response: ApiResponse<SmartListPreviewResponse>) => response.data,
    }),
  }),
})

export const {
  useGetSmartListsQuery,
  useCreateSmartListMutation,
  useUpdateSmartListMutation,
  useDeleteSmartListMutation,
  usePreviewSmartListMutation,
} = smartListsApi
