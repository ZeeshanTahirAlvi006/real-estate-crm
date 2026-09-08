import { baseApi } from './baseApi'
import type { Contact, ActivityItem, PortalCredentials } from '@/types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Contacts API — endpoints connected to real backend
export const contactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<
      { contacts: Contact[]; total: number },
      { search?: string; page?: number; limit?: number; source?: string; status?: string; sortBy?: string; sortOrder?: string } | void
    >({
      query: (params) => {
        const cleanedParams: Record<string, any> = {}
        if (params) {
          if (params.page) cleanedParams.page = params.page
          if (params.limit) cleanedParams.limit = params.limit
          if (params.search && params.search.trim()) cleanedParams.search = params.search.trim()
          if (params.source && params.source !== 'all') cleanedParams.source = params.source
          if (params.status && params.status !== 'all') cleanedParams.status = params.status
          if (params.sortBy) cleanedParams.sortBy = params.sortBy
          if (params.sortOrder) cleanedParams.sortOrder = params.sortOrder
        }
        return {
          url: '/contacts',
          params: cleanedParams,
        }
      },
      transformResponse: (response: ApiResponse<Contact[]>) => ({
        contacts: response.data || [],
        total: response.meta?.total ?? response.pagination?.total ?? (response.data?.length || 0),
      }),
      providesTags: ['Contacts'],
    }),

    getContactById: builder.query<Contact, string>({
      query: (id) => `/contacts/${id}`,
      transformResponse: (response: ApiResponse<Contact>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'ContactDetail', id }],
    }),

    createContact: builder.mutation<Contact, Partial<Contact>>({
      query: (data) => ({
        url: '/contacts',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Contact>) => response.data,
      invalidatesTags: ['Contacts'],
    }),

    updateContact: builder.mutation<Contact, { id: string; data: Partial<Contact> }>({
      query: ({ id, data }) => ({
        url: `/contacts/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Contact>) => response.data,
      invalidatesTags: (_result, _error, { id }) => ['Contacts', { type: 'ContactDetail', id }, 'DataHealth'],
    }),

    deleteContact: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        success: response.success,
      }),
      invalidatesTags: ['Contacts'],
    }),

    getContactActivity: builder.query<ActivityItem[], string>({
      query: (contactId) => `/contacts/${contactId}/activities`,
      transformResponse: (response: ApiResponse<ActivityItem[]>) => response.data || [],
    }),

    getPortalInvite: builder.query<PortalCredentials, string>({
      query: (contactId) => `/contacts/${contactId}/portal-invite`,
      transformResponse: (response: ApiResponse<PortalCredentials>) => response.data,
    }),

    generatePortalInvite: builder.mutation<PortalCredentials, { contactId: string; customPassword?: string }>({
      query: ({ contactId, customPassword }) => ({
        url: `/contacts/${contactId}/portal-invite`,
        method: 'POST',
        body: { customPassword },
      }),
      transformResponse: (response: ApiResponse<PortalCredentials>) => response.data,
      invalidatesTags: (_result, _error, { contactId }) => [{ type: 'ContactDetail', id: contactId }],
    }),
  }),
})

export const {
  useGetContactsQuery,
  useGetContactByIdQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useGetContactActivityQuery,
  useGetPortalInviteQuery,
  useGeneratePortalInviteMutation,
} = contactsApi
