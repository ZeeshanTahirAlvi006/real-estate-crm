import { baseApi } from './baseApi'
import type {
  LeadSource,
  RoutingRule,
  ScoringConfig,
  IngestLeadPayload,
  CaptureLeadPayload,
  Contact,
} from '@/types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

export interface IngestWebhookParams {
  sourceId: string
  payload: IngestLeadPayload
  signature?: string
  apiKey?: string
}

export const leadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Lead Sources ──────────────────────────────────────────
    getLeadSources: builder.query<
      { leadSources: LeadSource[]; total: number },
      { search?: string; type?: string; isActive?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const cleanParams: Record<string, string | number> = {}
        if (params?.search && params.search.trim() && params.search !== 'undefined') {
          cleanParams.search = params.search.trim()
        }
        if (params?.type && params.type !== 'all' && params.type !== 'undefined') {
          cleanParams.type = params.type
        }
        if (params?.isActive && params.isActive !== 'undefined') {
          cleanParams.isActive = params.isActive
        }
        if (params?.page) cleanParams.page = params.page
        if (params?.limit) cleanParams.limit = params.limit

        return {
          url: '/lead-sources',
          params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
        }
      },
      transformResponse: (response: ApiResponse<LeadSource[]>) => ({
        leadSources: response.data || [],
        total: response.meta?.total ?? (response.data?.length || 0),
      }),
      providesTags: ['LeadSources'],
    }),

    getLeadSourceById: builder.query<LeadSource, { id: string; includeSecret?: boolean }>({
      query: ({ id, includeSecret }) => ({
        url: `/lead-sources/${id}`,
        params: includeSecret ? { includeSecret: 'true' } : undefined,
      }),
      transformResponse: (response: ApiResponse<LeadSource>) => response.data,
      providesTags: (_result, _error, { id }) => [{ type: 'LeadSources', id }],
    }),

    createLeadSource: builder.mutation<LeadSource, Partial<LeadSource>>({
      query: (data) => ({
        url: '/lead-sources',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<LeadSource>) => response.data,
      invalidatesTags: ['LeadSources'],
    }),

    updateLeadSource: builder.mutation<LeadSource, { id: string; data: Partial<LeadSource> }>({
      query: ({ id, data }) => ({
        url: `/lead-sources/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<LeadSource>) => response.data,
      invalidatesTags: (_result, _error, { id }) => ['LeadSources', { type: 'LeadSources', id }],
    }),

    deleteLeadSource: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/lead-sources/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        success: response.success,
      }),
      invalidatesTags: ['LeadSources'],
    }),

    rotateWebhookSecret: builder.mutation<{ webhookSecret: string }, string>({
      query: (id) => ({
        url: `/lead-sources/${id}/rotate-secret`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<{ webhookSecret: string }>) => response.data,
      invalidatesTags: (_result, _error, id) => ['LeadSources', { type: 'LeadSources', id }],
    }),

    // ── Routing Rules ─────────────────────────────────────────
    getRoutingRules: builder.query<
      { routingRules: RoutingRule[]; total: number },
      { type?: string; isActive?: string; page?: number; limit?: number } | void
    >({
      query: (params) => {
        const cleanParams: Record<string, string | number> = {}
        if (params?.type && params.type !== 'all' && params.type !== 'undefined') {
          cleanParams.type = params.type
        }
        if (params?.isActive && params.isActive !== 'undefined') {
          cleanParams.isActive = params.isActive
        }
        if (params?.page) cleanParams.page = params.page
        if (params?.limit) cleanParams.limit = params.limit

        return {
          url: '/routing-rules',
          params: Object.keys(cleanParams).length > 0 ? cleanParams : undefined,
        }
      },
      transformResponse: (response: ApiResponse<RoutingRule[]>) => ({
        routingRules: response.data || [],
        total: response.meta?.total ?? (response.data?.length || 0),
      }),
      providesTags: ['RoutingRules'],
    }),

    getRoutingRuleById: builder.query<RoutingRule, string>({
      query: (id) => `/routing-rules/${id}`,
      transformResponse: (response: ApiResponse<RoutingRule>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'RoutingRules', id }],
    }),

    createRoutingRule: builder.mutation<RoutingRule, Partial<RoutingRule>>({
      query: (data) => ({
        url: '/routing-rules',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<RoutingRule>) => response.data,
      invalidatesTags: ['RoutingRules'],
    }),

    updateRoutingRule: builder.mutation<RoutingRule, { id: string; data: Partial<RoutingRule> }>({
      query: ({ id, data }) => ({
        url: `/routing-rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<RoutingRule>) => response.data,
      invalidatesTags: (_result, _error, { id }) => ['RoutingRules', { type: 'RoutingRules', id }],
    }),

    deleteRoutingRule: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/routing-rules/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponse<null>) => ({
        success: response.success,
      }),
      invalidatesTags: ['RoutingRules'],
    }),

    // ── Scoring Config ────────────────────────────────────────
    getScoringConfig: builder.query<ScoringConfig, void>({
      query: () => '/scoring-config',
      transformResponse: (response: ApiResponse<ScoringConfig>) => response.data,
      providesTags: ['ScoringConfig'],
    }),

    updateScoringConfig: builder.mutation<ScoringConfig, Partial<ScoringConfig>>({
      query: (data) => ({
        url: '/scoring-config',
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: ApiResponse<ScoringConfig>) => response.data,
      invalidatesTags: ['ScoringConfig'],
    }),

    // ── Ingestion & Testing Endpoints ─────────────────────────
    ingestManualLead: builder.mutation<
      Contact,
      {
        firstName: string
        lastName: string
        email?: string
        phone?: string
        message?: string
        propertyAddress?: string
        propertyPrice?: number
        zipCode?: string
        leadSource?: string
        tags?: string[]
        assignedAgentId?: string
      }
    >({
      query: (data) => ({
        url: '/leads/manual',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<Contact>) => response.data,
      invalidatesTags: ['Contacts', 'Leads', 'LeadSources'],
    }),

    ingestWebhookLead: builder.mutation<
      { contactId: string; isNew: boolean; routed: boolean },
      IngestWebhookParams
    >({
      query: ({ sourceId, payload, signature, apiKey }) => {
        const headers: Record<string, string> = {}
        if (signature) headers['X-Webhook-Signature'] = signature
        if (apiKey) headers['X-Api-Key'] = apiKey
        headers['X-Source-Id'] = sourceId

        return {
          url: `/leads/ingest?sourceId=${encodeURIComponent(sourceId)}`,
          method: 'POST',
          body: payload,
          headers,
        }
      },
      transformResponse: (response: ApiResponse<{ contactId: string; isNew: boolean; routed: boolean }>) =>
        response.data,
      invalidatesTags: ['Contacts', 'Leads', 'LeadSources'],
    }),

    captureWidgetLead: builder.mutation<
      { contactId: string; isNew: boolean },
      CaptureLeadPayload
    >({
      query: (data) => ({
        url: '/leads/capture',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: ApiResponse<{ contactId: string; isNew: boolean }>) => response.data,
      invalidatesTags: ['Contacts', 'Leads', 'LeadSources'],
    }),

    acknowledgeLeads: builder.mutation<{ acknowledgedCount: number }, { contactIds: string[] }>({
      query: (data) => ({
        url: '/leads/acknowledge',
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<{ acknowledgedCount: number }>) => response.data,
      invalidatesTags: ['Contacts', 'Leads'],
    }),
  }),
})

export const {
  useGetLeadSourcesQuery,
  useGetLeadSourceByIdQuery,
  useCreateLeadSourceMutation,
  useUpdateLeadSourceMutation,
  useDeleteLeadSourceMutation,
  useRotateWebhookSecretMutation,
  useGetRoutingRulesQuery,
  useGetRoutingRuleByIdQuery,
  useCreateRoutingRuleMutation,
  useUpdateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  useGetScoringConfigQuery,
  useUpdateScoringConfigMutation,
  useIngestManualLeadMutation,
  useIngestWebhookLeadMutation,
  useCaptureWidgetLeadMutation,
  useAcknowledgeLeadsMutation,
} = leadsApi
