import { baseApi } from './baseApi'
import type { Contact, ActivityItem } from '@/types'

// Contacts API — endpoints connected to real backend
export const contactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getContacts: builder.query<{ contacts: Contact[]; total: number }, { search?: string; page?: number; limit?: number; source?: string; status?: string; sortBy?: string; sortOrder?: string }>({
      query: (params) => ({
        url: '/contacts',
        params,
      }),
      providesTags: ['Contacts'],
    }),

    getContactById: builder.query<Contact, string>({
      query: (id) => `/contacts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ContactDetail', id }],
    }),

    createContact: builder.mutation<Contact, Partial<Contact>>({
      query: (data) => ({
        url: '/contacts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Contacts'],
    }),

    updateContact: builder.mutation<Contact, { id: string; data: Partial<Contact> }>({
      query: ({ id, data }) => ({
        url: `/contacts/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Contacts', { type: 'ContactDetail', id }],
    }),

    deleteContact: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Contacts'],
    }),

    getContactActivity: builder.query<ActivityItem[], string>({
      query: (contactId) => `/contacts/${contactId}/activities`,
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
} = contactsApi
