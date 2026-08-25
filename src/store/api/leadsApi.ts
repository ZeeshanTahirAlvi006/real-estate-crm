import { baseApi } from './baseApi'
import type { LeadSource, RoutingRule, Webhook } from '@/types'

// Leads API — endpoints connected to real backend
export const leadsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLeadSources: builder.query<LeadSource[], void>({
      query: () => '/lead-sources',
      providesTags: ['LeadSources'],
    }),

    toggleLeadSource: builder.mutation<LeadSource, string>({
      query: (id) => ({
        url: `/lead-sources/${id}/toggle`,
        method: 'PATCH',
      }),
      invalidatesTags: ['LeadSources'],
    }),

    getRoutingRules: builder.query<RoutingRule[], void>({
      query: () => '/routing-rules',
      providesTags: ['RoutingRules'],
    }),

    createRoutingRule: builder.mutation<RoutingRule, Partial<RoutingRule>>({
      query: (data) => ({
        url: '/routing-rules',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['RoutingRules'],
    }),

    updateRoutingRule: builder.mutation<RoutingRule, { id: string; data: Partial<RoutingRule> }>({
      query: ({ id, data }) => ({
        url: `/routing-rules/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['RoutingRules'],
    }),

    deleteRoutingRule: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/routing-rules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoutingRules'],
    }),

    getWebhooks: builder.query<Webhook[], void>({
      query: () => '/webhooks',
      providesTags: ['Webhooks'],
    }),

    createWebhook: builder.mutation<Webhook, Partial<Webhook>>({
      query: (data) => ({
        url: '/webhooks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Webhooks'],
    }),
  }),
})

export const {
  useGetLeadSourcesQuery,
  useToggleLeadSourceMutation,
  useGetRoutingRulesQuery,
  useCreateRoutingRuleMutation,
  useUpdateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
  useGetWebhooksQuery,
  useCreateWebhookMutation,
} = leadsApi
