import { baseApi } from './baseApi'
import type { DataHealthScore, DuplicatePair } from '@/types'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface MergeDuplicatePayload {
  id: string
  primaryContactId: string
  secondaryContactId: string
  fieldOverrides?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zipCode?: string
    tags?: string[]
    notes?: string
  }
}

export interface ScanResult {
  scannedCount: number
  issuesFound: number
  message: string
}

export interface ContactDataIssue {
  type: 'email' | 'phone' | 'missing'
  field: string
  title: string
  description: string
  severity: 'error' | 'warning' | 'info'
}

export interface ContactWithDataIssues {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource: string
  leadScore: number
  status: string
  tags: string[]
  notes?: string
  propertyInterests?: string[]
  assignedAgentName?: string
  dealCount: number
  activityCount: number
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
  hasInvalidEmail: boolean
  hasInvalidPhone: boolean
  hasMissingFields: boolean
  issues: ContactDataIssue[]
}

export const dataHealthApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDataHealth: builder.query<DataHealthScore, void>({
      query: () => '/data-health/score',
      transformResponse: (response: ApiResponse<DataHealthScore>) => response.data,
      providesTags: ['DataHealth'],
    }),

    getDuplicates: builder.query<DuplicatePair[], void>({
      query: () => '/data-health/duplicates',
      transformResponse: (response: ApiResponse<DuplicatePair[]>) => response.data || [],
      providesTags: ['Duplicates'],
    }),

    getDataIssues: builder.query<
      ContactWithDataIssues[],
      { type?: 'all' | 'email' | 'phone'; search?: string } | void
    >({
      query: (params) => ({
        url: '/data-health/issues',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<ContactWithDataIssues[]>) => response.data || [],
      providesTags: ['DataHealth', 'Contacts'],
    }),

    mergeDuplicate: builder.mutation<{ success: boolean }, MergeDuplicatePayload>({
      query: ({ id, ...body }) => ({
        url: `/data-health/duplicates/${id}/merge`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Duplicates', 'DataHealth', 'Contacts', 'ContactDetail', 'Deals'],
    }),

    dismissDuplicate: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/data-health/duplicates/${id}/dismiss`,
        method: 'POST',
      }),
      invalidatesTags: ['Duplicates', 'DataHealth'],
    }),

    triggerDeduplication: builder.mutation<ScanResult, void>({
      query: () => ({
        url: '/data-health/scan/deduplication',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<ScanResult>) => response.data,
      invalidatesTags: ['DataHealth', 'Duplicates'],
    }),

    triggerPhoneVerification: builder.mutation<ScanResult, void>({
      query: () => ({
        url: '/data-health/scan/phone-verification',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<ScanResult>) => response.data,
      invalidatesTags: ['DataHealth'],
    }),

    triggerEmailValidation: builder.mutation<ScanResult, void>({
      query: () => ({
        url: '/data-health/scan/email-validation',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<ScanResult>) => response.data,
      invalidatesTags: ['DataHealth'],
    }),

    triggerFullScan: builder.mutation<DataHealthScore, void>({
      query: () => ({
        url: '/data-health/scan/all',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<DataHealthScore>) => response.data,
      invalidatesTags: ['DataHealth', 'Duplicates'],
    }),
  }),
})

export const {
  useGetDataHealthQuery,
  useGetDuplicatesQuery,
  useGetDataIssuesQuery,
  useMergeDuplicateMutation,
  useDismissDuplicateMutation,
  useTriggerDeduplicationMutation,
  useTriggerPhoneVerificationMutation,
  useTriggerEmailValidationMutation,
  useTriggerFullScanMutation,
} = dataHealthApi

