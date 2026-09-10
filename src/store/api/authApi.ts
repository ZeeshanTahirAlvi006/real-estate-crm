import { baseApi } from './baseApi'
import type { User } from '@/types/auth'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Auth API — endpoints connected to real backend
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ user: User; token?: string; refreshToken?: string }, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: ApiResponse<any>) => ({
        user: response.data?.user || response.data,
        token: response.data?.token || response.data?.accessToken,
        refreshToken: response.data?.refreshToken,
      }),
    }),

    signup: builder.mutation<
      { user: User; token?: string; refreshToken?: string },
      { firstName: string; lastName: string; email: string; password: string; role?: string; brokerageName?: string }
    >({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<any>) => ({
        user: response.data?.user || response.data,
        token: response.data?.token || response.data?.accessToken,
        refreshToken: response.data?.refreshToken,
      }),
    }),

    refreshToken: builder.mutation<
      { user: User; token: string; refreshToken?: string },
      { refreshToken?: string } | void
    >({
      query: (body) => ({
        url: '/auth/refresh-token',
        method: 'POST',
        body: body || {},
      }),
      transformResponse: (response: ApiResponse<any>) => ({
        user: response.data?.user || response.data,
        token: response.data?.token || response.data?.accessToken,
        refreshToken: response.data?.refreshToken,
      }),
    }),

    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        message: response.message || 'Password reset link sent',
      }),
    }),

    resetPassword: builder.mutation<{ message: string }, { token: string; password: string; currentPassword?: string }>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: {
          token: data.token,
          currentPassword: data.currentPassword || data.password,
          newPassword: data.password,
        },
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        message: response.message || 'Password reset successful',
      }),
    }),

    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        message: response.message || 'Password changed successfully',
      }),
    }),

    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (response: ApiResponse<User>) => response.data,
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        message: response.message || 'Logged out successfully',
      }),
    }),
  }),
})

export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetMeQuery,
  useLogoutMutation,
} = authApi
