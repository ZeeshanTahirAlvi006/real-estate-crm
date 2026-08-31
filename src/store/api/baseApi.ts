import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { logout } from '../slices/authSlice'

// Base API configuration — connects to real backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // sends httpOnly cookies with every request
  prepareHeaders: (headers) => {
    // Don't override Content-Type for FormData (file uploads)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return headers
  },
})

// Wrapper that intercepts 401 responses globally and resets auth state
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    // Session expired or invalid — clear auth state and reset API cache
    api.dispatch(logout())
    api.dispatch(baseApi.util.resetApiState())
  }

  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Contacts',
    'ContactDetail',
    'Leads',
    'LeadSources',
    'RoutingRules',
    'Webhooks',
    'Deals',
    'Pipeline',
    'DataHealth',
    'Duplicates',
    'Users',
    'TeamMembers',
    'Settings',
    'Notifications',
    'SmartLists',
    'Integrations',
    'Conversations',
    'Messages',
    'QuickTemplates',
    'DialerQueue',
    'CallLogs',
    'VoicemailDrops',
    'QualificationCriteria',
    'ReactivationCampaigns',
    'SpeedToLead',
    'AuditLogs',
    'FeatureFlags',
    'Brokerages',
    'Transactions',
    'Commissions',
    'ScoringConfig',
    'WhatsAppTemplates',
    'WhatsAppBroadcasts',
  ],
  endpoints: () => ({}),
})
