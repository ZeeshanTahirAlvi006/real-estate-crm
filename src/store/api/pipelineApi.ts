import { baseApi } from './baseApi'
import type { Deal, Pipeline, KanbanResponse } from '@/types'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface CreatePipelinePayload {
  name: string
  stages?: { name: string; color: string; probability: number }[]
}

export interface CreateStagePayload {
  pipelineId: string
  name: string
  color: string
  probability: number
}

export interface UpdateStagePayload {
  pipelineId: string
  stageId: string
  data: {
    name?: string
    color?: string
    probability?: number
  }
}

export interface ReorderStagesPayload {
  pipelineId: string
  orderings: { stageId: string; order: number }[]
}

export interface CreateDealPayload {
  pipelineId: string
  stageId: string
  contactId: string
  propertyAddress: string
  dealValue: number
  assignedAgentId: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string
}

export interface UpdateDealPayload {
  id: string
  data: {
    propertyAddress?: string
    dealValue?: number
    assignedAgentId?: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    notes?: string
  }
}

export interface MoveDealStagePayload {
  dealId: string
  stageId: string
}

export const pipelineApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    //Pipelines 
    getPipelines: builder.query<Pipeline[], void>({
      query: () => '/pipelines',
      transformResponse: (response: ApiResponse<Pipeline[]>) => response.data || [],
      providesTags: ['Pipeline'],
    }),

    getPipeline: builder.query<Pipeline, string>({
      query: (id) => `/pipelines/${id}`,
      transformResponse: (response: ApiResponse<Pipeline>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Pipeline', id }],
    }),

    createPipeline: builder.mutation<Pipeline, CreatePipelinePayload>({
      query: (body) => ({
        url: '/pipelines',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pipeline'],
    }),

    updatePipeline: builder.mutation<Pipeline, { id: string; name: string }>({
      query: ({ id, name }) => ({
        url: `/pipelines/${id}`,
        method: 'PATCH',
        body: { name },
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    deletePipeline: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/pipelines/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    // Stages
    addStage: builder.mutation<Pipeline, CreateStagePayload>({
      query: ({ pipelineId, ...body }) => ({
        url: `/pipelines/${pipelineId}/stages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    updateStage: builder.mutation<Pipeline, UpdateStagePayload>({
      query: ({ pipelineId, stageId, data }) => ({
        url: `/pipelines/${pipelineId}/stages/${stageId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    reorderStages: builder.mutation<Pipeline, ReorderStagesPayload>({
      query: ({ pipelineId, orderings }) => ({
        url: `/pipelines/${pipelineId}/stages/reorder`,
        method: 'PATCH',
        body: { orderings },
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    deleteStage: builder.mutation<Pipeline, { pipelineId: string; stageId: string }>({
      query: ({ pipelineId, stageId }) => ({
        url: `/pipelines/${pipelineId}/stages/${stageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pipeline', 'Deals'],
    }),

    // Kanban View 
    getKanbanData: builder.query<KanbanResponse, string>({
      query: (pipelineId) => `/deals/kanban/${pipelineId}`,
      transformResponse: (response: ApiResponse<KanbanResponse>) => response.data,
      providesTags: ['Deals', 'Pipeline'],
    }),

    // Deals CRUD 
    getDeals: builder.query<Deal[], { pipelineId?: string; stageId?: string; search?: string } | void>({
      query: (params) => ({
        url: '/deals',
        params: params || undefined,
      }),
      transformResponse: (response: ApiResponse<Deal[]>) => response.data || [],
      providesTags: ['Deals'],
    }),

    getDeal: builder.query<Deal, string>({
      query: (id) => `/deals/${id}`,
      transformResponse: (response: ApiResponse<Deal>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Deals', id }],
    }),

    createDeal: builder.mutation<Deal, CreateDealPayload>({
      query: (body) => ({
        url: '/deals',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Deals', 'Pipeline', 'Contacts', 'ContactDetail'],
    }),

    updateDeal: builder.mutation<Deal, UpdateDealPayload>({
      query: ({ id, data }) => ({
        url: `/deals/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Deals', 'Pipeline'],
    }),

    moveDealStage: builder.mutation<Deal, MoveDealStagePayload>({
      query: ({ dealId, stageId }) => ({
        url: `/deals/${dealId}/stage`,
        method: 'PATCH',
        body: { stageId },
      }),
      invalidatesTags: ['Deals', 'Pipeline', 'Contacts', 'ContactDetail'],
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
  useGetPipelinesQuery,
  useGetPipelineQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
  useAddStageMutation,
  useUpdateStageMutation,
  useReorderStagesMutation,
  useDeleteStageMutation,
  useGetKanbanDataQuery,
  useGetDealsQuery,
  useGetDealQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useMoveDealStageMutation,
  useDeleteDealMutation,
} = pipelineApi
