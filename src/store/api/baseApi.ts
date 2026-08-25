import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Base API configuration — will connect to real backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include', // sends httpOnly cookies with every request
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
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
    'Transactions',
    'Commissions',
  ],
  endpoints: () => ({}),
})
