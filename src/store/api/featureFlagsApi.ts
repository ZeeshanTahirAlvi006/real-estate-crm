import { baseApi } from './baseApi'

export interface FeatureFlagItem {
  id: string
  key: string
  name: string
  isEnabled: boolean
  description?: string
  disabledReason?: string
  updatedAt: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Feature Flags & Kill-Switch API
export const featureFlagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFeatureFlags: builder.query<FeatureFlagItem[], void>({
      query: () => '/feature-flags',
      transformResponse: (response: ApiResponse<FeatureFlagItem[]>) => response.data || [],
      providesTags: ['FeatureFlags'],
    }),

    toggleFeatureFlag: builder.mutation<FeatureFlagItem, { key: string; isEnabled: boolean; disabledReason?: string }>({
      query: ({ key, isEnabled, disabledReason }) => ({
        url: `/feature-flags/${key}`,
        method: 'PATCH',
        body: { isEnabled, disabledReason },
      }),
      transformResponse: (response: ApiResponse<FeatureFlagItem>) => response.data,
      invalidatesTags: ['FeatureFlags'],
    }),
  }),
})

export const { useGetFeatureFlagsQuery, useToggleFeatureFlagMutation } = featureFlagsApi
