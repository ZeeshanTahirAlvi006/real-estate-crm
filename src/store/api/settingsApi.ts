import { baseApi } from './baseApi'
import type { User } from '@/types/auth'
import type { Integration, NotificationPreference, TeamMember, Notification } from '@/types'

// Settings API — endpoints connected to real backend
export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<User, Partial<User>>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
    }),

    getTeamMembers: builder.query<TeamMember[], void>({
      query: () => '/users',
      transformResponse: (response: any) => response.data || [],
      providesTags: ['TeamMembers'],
    }),

    inviteTeamMember: builder.mutation<TeamMember, { email: string; role: string }>({
      query: (data) => ({
        url: '/users/invite',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['TeamMembers'],
    }),

    getIntegrations: builder.query<Integration[], void>({
      query: () => '/integrations',
      transformResponse: (response: any) => response.data || [],
      providesTags: ['Integrations'],
    }),

    getNotificationPreferences: builder.query<NotificationPreference[], void>({
      query: () => '/settings/notification-preferences',
      transformResponse: (response: any) => response.data || [],
    }),

    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      transformResponse: (response: any) => {
        if (Array.isArray(response)) return response
        if (Array.isArray(response?.data)) return response.data
        return []
      },
      providesTags: ['Notifications'],
    }),

    markNotificationRead: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      // Optimistic update — instantly mark as read in cache
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          settingsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notif = draft.find((n) => n.id === id)
            if (notif) {
              notif.isRead = true
            }
          })
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: ['Notifications'],
    }),

    markAllNotificationsRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      // Optimistic update — instantly mark all as read in cache
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          settingsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            draft.forEach((n) => {
              n.isRead = true
            })
          })
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useUpdateProfileMutation,
  useGetTeamMembersQuery,
  useInviteTeamMemberMutation,
  useGetIntegrationsQuery,
  useGetNotificationPreferencesQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = settingsApi
