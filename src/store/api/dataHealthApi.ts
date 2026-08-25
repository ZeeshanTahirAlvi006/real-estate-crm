import { baseApi } from './baseApi'
import type { DataHealthScore, DuplicatePair } from '@/types'

// Data Health API — endpoints connected to real backend
export const dataHealthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDataHealth: builder.query<DataHealthScore, void>({
      query: () => '/data-health/score',
      providesTags: ['DataHealth'],
    }),

    getDuplicates: builder.query<DuplicatePair[], void>({
      query: () => '/data-health/duplicates',
      providesTags: ['Duplicates'],
    }),

    mergeDuplicate: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/data-health/duplicates/${id}/merge`,
        method: 'POST',
      }),
      invalidatesTags: ['Duplicates', 'DataHealth'],
    }),

    dismissDuplicate: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/data-health/duplicates/${id}/dismiss`,
        method: 'POST',
      }),
      invalidatesTags: ['Duplicates', 'DataHealth'],
    }),

    triggerDeduplication: builder.mutation<{ found: number }, void>({
      query: () => ({
        url: '/data-health/scan/deduplication',
        method: 'POST',
      }),
      invalidatesTags: ['DataHealth', 'Duplicates'],
    }),

    triggerPhoneVerification: builder.mutation<{ verified: number }, void>({
      query: () => ({
        url: '/data-health/scan/phone-verification',
        method: 'POST',
      }),
      invalidatesTags: ['DataHealth'],
    }),

    triggerEmailValidation: builder.mutation<{ validated: number }, void>({
      query: () => ({
        url: '/data-health/scan/email-validation',
        method: 'POST',
      }),
      invalidatesTags: ['DataHealth'],
    }),
  }),
})

export const {
  useGetDataHealthQuery,
  useGetDuplicatesQuery,
  useMergeDuplicateMutation,
  useDismissDuplicateMutation,
  useTriggerDeduplicationMutation,
  useTriggerPhoneVerificationMutation,
  useTriggerEmailValidationMutation,
} = dataHealthApi
