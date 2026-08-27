import { baseApi } from './baseApi'
import type { User, UserRole } from '@/types/auth'

export interface InviteUserPayload {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  phone?: string
  brokerageId?: string
}

export interface InviteUserResponse {
  user: User
  temporaryPassword: string
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

// Users & Team Management API
export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<{ users: User[]; total: number }, { search?: string; role?: string; page?: number; limit?: number } | void>({
      query: (params) => ({
        url: '/users',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<User[]>) => ({
        users: response.data || [],
        total: response.pagination?.total ?? (response.data?.length || 0),
      }),
      providesTags: ['Users', 'TeamMembers'],
    }),

    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      transformResponse: (response: ApiResponse<User>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Users', id }],
    }),

    inviteUser: builder.mutation<InviteUserResponse, InviteUserPayload>({
      query: (data) => ({
        url: '/users/invite',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<InviteUserResponse>) => response.data,
      invalidatesTags: ['Users', 'TeamMembers'],
    }),

    updateUser: builder.mutation<User, { id: string; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<User>) => response.data,
      invalidatesTags: (_result, _error, { id }) => ['Users', 'TeamMembers', { type: 'Users', id }],
    }),

    changeUserRole: builder.mutation<User, { id: string; role: UserRole }>({
      query: ({ id, role }) => ({
        url: `/users/${id}/role`,
        method: 'PATCH',
        body: { role },
      }),
      transformResponse: (response: ApiResponse<User>) => response.data,
      invalidatesTags: ['Users', 'TeamMembers'],
    }),

    deactivateUser: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        success: response.success,
      }),
      invalidatesTags: ['Users', 'TeamMembers'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useInviteUserMutation,
  useUpdateUserMutation,
  useChangeUserRoleMutation,
  useDeactivateUserMutation,
} = usersApi
