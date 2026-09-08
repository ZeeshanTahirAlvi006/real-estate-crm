import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { logout, setInitialized } from '../slices/authSlice'

// Base API configuration — connects to real backend using single API_URL
const rawApiUrl = import.meta.env.API_URL || ''
const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`)
  : '/api'

// Extract a cookie value by name from document.cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'))
  return match ? decodeURIComponent(match[3]) : null
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: 'include', // sends httpOnly cookies with every request
  timeout: 8000, // 8 second timeout to prevent indefinite pending states
  prepareHeaders: (headers) => {
    // Don't override Content-Type for FormData (file uploads)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    // Identifies standard SPA request (blocks cross-origin form CSRF exploits)
    headers.set('X-Requested-With', 'XMLHttpRequest')

    // Attach CSRF protection header from XSRF-TOKEN cookie if accessible
    const xsrfToken = getCookie('XSRF-TOKEN')
    if (xsrfToken) {
      headers.set('X-XSRF-Token', xsrfToken)
    }

    return headers
  },
})

// Wrapper that intercepts 401 & network error responses globally and updates auth state
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    if (result.error.status === 401) {
      // Session expired or invalid — clear auth state and reset API cache
      api.dispatch(logout())
      api.dispatch(baseApi.util.resetApiState())
    } else {
      // Network error or server offline — mark session check initialized so UI doesn't hang
      api.dispatch(setInitialized())
    }
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
    'AiIsaConfig',
    'AuditLogs',
    'FeatureFlags',
    'Brokerages',
    'Transactions',
    'Commissions',
    'ScoringConfig',
    'WhatsAppTemplates',
    'WhatsAppBroadcasts',
    'WhatsAppConfig',
    'Portal',
    'Activities',
    'ESign',
    'SellerRadar',
    'CmaReports',
    'Compliance',
    'Objections',
  ],
  endpoints: () => ({}),
})
