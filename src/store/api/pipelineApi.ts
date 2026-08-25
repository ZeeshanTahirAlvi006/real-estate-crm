import { baseApi } from './baseApi'
import type { Deal, Pipeline } from '@/types'

// Pipeline & Deals API — endpoints connected to real backend
export const pipelineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPipeline: builder.query<Pipeline, void>({
      query: () => '/pipelines/default',
      providesTags: ['Pipeline'],
    }),

    getDeals: builder.query<Deal[], { stageId?: string } | void>({
      query: (params) => ({
        url: '/deals',
        params: params || undefined,
      }),
      providesTags: ['Deals'],
    }),

    updateDealStage: builder.mutation<Deal, { dealId: string; newStageId: string }>({
      query: ({ dealId, newStageId }) => ({
        url: `/deals/${dealId}/stage`,
        method: 'PATCH',
        body: { stageId: newStageId },
      }),
      invalidatesTags: ['Deals', 'Pipeline'],
    }),

    createDeal: builder.mutation<Deal, Partial<Deal>>({
      query: (data) => ({
        url: '/deals',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Deals', 'Pipeline'],
    }),

    updateDeal: builder.mutation<Deal, { id: string; data: Partial<Deal> }>({
      query: ({ id, data }) => ({
        url: `/deals/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Deals', 'Pipeline'],
    }),

    deleteDeal: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/deals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Deals', 'Pipeline'],
    }),
  }),
})

export const {
  useGetPipelineQuery,
  useGetDealsQuery,
  useUpdateDealStageMutation,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
} = pipelineApi
