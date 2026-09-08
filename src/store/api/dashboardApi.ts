import { baseApi } from './baseApi'

export interface DashboardKpis {
  totalContacts: number
  newLeadsThisWeek: number
  activeDeals: number
  pipelineValue: number
  dataHealthScore: number
  dataHealthGrade: string
  activeUsers?: number
  highPriorityLeads?: number
  avgSpeedSeconds?: number
}

export interface LeadSourceStat {
  _id: string
  count: number
}

export interface LeadsOverTimeStat {
  _id: string // YYYY-MM-DD date string
  count: number
}

export interface PipelineSummaryStat {
  _id: string
  count: number
  value: number
}

export interface ActivityFeedItem {
  id: string
  type: string
  description: string
  createdAt: string
  createdBy?: string
}

export interface LeadPortalDeal {
  id: string
  title: string
  value: number
  stage: string
}

export interface LeadPortalContactProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  propertyInterests?: string[]
  dncStatus?: string
  optedOutAt?: string
}

export interface LeadPortalData {
  contactId: string
  assignedAgent?: {
    name: string
    email: string
    phone?: string
  }
  contactProfile?: LeadPortalContactProfile
  deals: LeadPortalDeal[]
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardKpis: builder.query<DashboardKpis, void>({
      query: () => '/dashboard/kpis',
      transformResponse: (response: ApiResponse<DashboardKpis>) => response.data,
      providesTags: ['Contacts', 'Deals', 'DataHealth'],
    }),

    getDashboardLeadSources: builder.query<LeadSourceStat[], void>({
      query: () => '/dashboard/lead-sources',
      transformResponse: (response: ApiResponse<LeadSourceStat[]>) => response.data || [],
      providesTags: ['Contacts', 'Leads'],
    }),

    getLeadsOverTime: builder.query<LeadsOverTimeStat[], void>({
      query: () => '/dashboard/leads-over-time',
      transformResponse: (response: ApiResponse<LeadsOverTimeStat[]>) => response.data || [],
      providesTags: ['Contacts', 'Leads'],
    }),

    getPipelineSummary: builder.query<PipelineSummaryStat[], void>({
      query: () => '/dashboard/pipeline-summary',
      transformResponse: (response: ApiResponse<PipelineSummaryStat[]>) => response.data || [],
      providesTags: ['Pipeline', 'Deals'],
    }),

    getActivityFeed: builder.query<ActivityFeedItem[], void>({
      query: () => '/dashboard/activity-feed',
      transformResponse: (response: ApiResponse<ActivityFeedItem[]>) => response.data || [],
      providesTags: ['Contacts', 'Deals'],
    }),

    getLeadPortal: builder.query<LeadPortalData, void>({
      query: () => '/dashboard/lead-portal',
      transformResponse: (response: ApiResponse<LeadPortalData>) => response.data,
      providesTags: ['Contacts', 'Deals'],
    }),

    updateLeadPortalProfile: builder.mutation<LeadPortalData, Partial<LeadPortalContactProfile>>({
      query: (data) => ({
        url: '/dashboard/lead-portal/profile',
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: ApiResponse<LeadPortalData>) => response.data,
      invalidatesTags: ['Contacts'],
    }),
  }),
})

export const {
  useGetDashboardKpisQuery,
  useGetDashboardLeadSourcesQuery,
  useGetLeadsOverTimeQuery,
  useGetPipelineSummaryQuery,
  useGetActivityFeedQuery,
  useGetLeadPortalQuery,
  useUpdateLeadPortalProfileMutation,
} = dashboardApi
