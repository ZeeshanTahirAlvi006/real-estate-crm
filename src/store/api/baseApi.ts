import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { logout, setCredentials, setInitialized, STORAGE_KEY_TOKEN, STORAGE_KEY_REFRESH } from '../slices/authSlice'

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
  credentials: 'include', // sends httpOnly cookies when supported
  timeout: 8000, // 8 second timeout to prevent indefinite pending states
  prepareHeaders: (headers, { getState }) => {
    // Don't override Content-Type for FormData (file uploads)
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    headers.set('X-Requested-With', 'XMLHttpRequest')

    // Attach Bearer token for cross-origin deployments (Vercel + Render)
    const state = getState() as any
    let token = state?.auth?.token
    if (!token && typeof window !== 'undefined') {
      try {
        token = localStorage.getItem(STORAGE_KEY_TOKEN)
      } catch {}
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    // Attach CSRF protection header from XSRF-TOKEN cookie
    const xsrfToken = getCookie('XSRF-TOKEN')
    if (xsrfToken) {
      headers.set('X-XSRF-Token', xsrfToken)
    }

    return headers
  },
})

// Shared refresh promise to deduplicate concurrent 401 refresh requests
let refreshPromise: Promise<boolean> | null = null

async function executeRefresh(api: any, extraOptions: any): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      let refreshToken: string | null = null
      if (typeof window !== 'undefined') {
        try {
          refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH)
        } catch {}
      }

      // Attempt silent token refresh
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/refresh-token',
          method: 'POST',
          body: { refreshToken: refreshToken || undefined },
        },
        api,
        extraOptions
      )

      if (refreshResult.data) {
        const resData = (refreshResult.data as any).data || refreshResult.data
        const newAccessToken = resData.token || resData.accessToken
        const newRefreshToken = resData.refreshToken
        const user = resData.user || resData

        if (newAccessToken && user) {
          api.dispatch(
            setCredentials({
              user,
              token: newAccessToken,
              refreshToken: newRefreshToken,
            })
          )
          return true
        }
      }

      // Refresh failed or unauthorized
      api.dispatch(logout())
      api.dispatch(setInitialized())
      return false
    } catch {
      api.dispatch(logout())
      api.dispatch(setInitialized())
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Wrapper that intercepts 401 & network error responses globally and updates auth state
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error) {
    if (result.error.status === 401) {
      // Avoid infinite loop on auth endpoints
      const urlStr = typeof args === 'string' ? args : args.url
      const isAuthPath = urlStr?.includes('/auth/login') || urlStr?.includes('/auth/refresh-token')

      if (!isAuthPath) {
        // Await shared mutex refresh execution
        const refreshed = await executeRefresh(api, extraOptions)
        if (refreshed) {
          // Retry the original query with the refreshed credentials
          result = await rawBaseQuery(args, api, extraOptions)
        }
      } else {
        api.dispatch(logout())
        api.dispatch(setInitialized())
      }
    } else {
      // Mark session check initialized so UI does not hang
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
