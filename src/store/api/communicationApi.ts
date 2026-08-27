import { baseApi } from './baseApi'
import type {
  ConversationThread,
  ConversationMessage,
  QuickReplyTemplate,
  VoicemailAudioDrop,
  DialerQueueContact,
  CallLog,
  QualificationCriteria,
  ReactivationCampaign,
  SpeedToLeadMetric,
  CallDisposition,
} from '@/types/communication'

interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface DialerStats {
  totalCallsToday: number
  connectRatePercent: number
  totalTalkTimeSeconds: number
  avgDurationSeconds: number
  dispositionsBreakdown: Record<string, number>
}

// Communication API — endpoints connected to real backend
export const communicationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Inbox / Conversations ──
    getConversations: builder.query<ConversationThread[], { channel?: string; search?: string } | void>({
      query: (params) => ({
        url: '/inbox/conversations',
        params: params || undefined,
      }),
      transformResponse: (res: ApiResponse<ConversationThread[]>) => res.data || [],
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<ConversationMessage[], string>({
      query: (conversationId) => `/inbox/conversations/${conversationId}/messages`,
      transformResponse: (res: ApiResponse<ConversationMessage[]>) => res.data || [],
      providesTags: (_res, _err, id) => [{ type: 'Messages', id }],
    }),

    sendMessage: builder.mutation<
      ConversationMessage,
      { conversationId: string; body: string; channel: string; fairHousingFlags?: string[] }
    >({
      query: ({ conversationId, ...data }) => ({
        url: `/inbox/conversations/${conversationId}/messages`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (res: ApiResponse<ConversationMessage>) => res.data,
      invalidatesTags: (_res, _err, arg) => [
        'Conversations',
        { type: 'Messages', id: arg.conversationId },
      ],
    }),

    toggleAiIsa: builder.mutation<ConversationThread, { conversationId: string; enabled: boolean }>({
      query: ({ conversationId, enabled }) => ({
        url: `/inbox/conversations/${conversationId}/ai-isa`,
        method: 'PATCH',
        body: { enabled },
      }),
      transformResponse: (res: ApiResponse<ConversationThread>) => res.data,
      invalidatesTags: ['Conversations'],
    }),

    getQuickTemplates: builder.query<QuickReplyTemplate[], void>({
      query: () => '/communication/templates',
      transformResponse: (res: ApiResponse<QuickReplyTemplate[]>) => res.data || [],
      providesTags: ['QuickTemplates'],
    }),

    // ── Dialer ──
    getDialerQueue: builder.query<DialerQueueContact[], void>({
      query: () => '/dialer/queue',
      transformResponse: (res: ApiResponse<DialerQueueContact[]>) => res.data || [],
      providesTags: ['DialerQueue'],
    }),

    getCallLogs: builder.query<{ logs: CallLog[]; total: number } | CallLog[], { page?: number; limit?: number; disposition?: string; search?: string } | void>({
      query: (params) => ({
        url: '/dialer/call-logs',
        params: params || undefined,
      }),
      transformResponse: (res: ApiResponse<{ logs: CallLog[]; total: number }>) => res.data?.logs || res.data || [],
      providesTags: ['CallLogs'],
    }),

    getDialerStats: builder.query<DialerStats, void>({
      query: () => '/dialer/stats',
      transformResponse: (res: ApiResponse<DialerStats>) => res.data,
      providesTags: ['CallLogs'],
    }),

    saveCallDisposition: builder.mutation<
      CallLog,
      {
        contactId: string
        contactName: string
        contactPhone: string
        durationSeconds: number
        disposition: CallDisposition
        notes?: string
        linesUsed?: number
        recordingUrl?: string
      }
    >({
      query: (data) => ({
        url: '/dialer/call-logs',
        method: 'POST',
        body: data,
      }),
      transformResponse: (res: ApiResponse<CallLog>) => res.data,
      invalidatesTags: ['CallLogs', 'DialerQueue', 'Contacts', 'ContactDetail'],
    }),

    getVoicemailDrops: builder.query<VoicemailAudioDrop[], void>({
      query: () => '/dialer/voicemail-drops',
      transformResponse: (res: ApiResponse<VoicemailAudioDrop[]>) => res.data || [],
      providesTags: ['VoicemailDrops'],
    }),

    createVoicemailDrop: builder.mutation<
      VoicemailAudioDrop,
      { name: string; title: string; audioUrl: string; durationSeconds?: number; category?: string; isDefault?: boolean }
    >({
      query: (data) => ({
        url: '/dialer/voicemail-drops',
        method: 'POST',
        body: data,
      }),
      transformResponse: (res: ApiResponse<VoicemailAudioDrop>) => res.data,
      invalidatesTags: ['VoicemailDrops'],
    }),

    enqueueDialerContacts: builder.mutation<{ enqueuedCount: number }, { contactIds: string[]; priority?: number }>({
      query: (data) => ({
        url: '/dialer/queue/enqueue',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DialerQueue'],
    }),

    clearDialerQueue: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/dialer/queue/clear',
        method: 'POST',
      }),
      invalidatesTags: ['DialerQueue'],
    }),

    // ── AI ISA Engine ──
    getQualificationCriteria: builder.query<QualificationCriteria[], void>({
      query: () => '/ai-isa/qualification-criteria',
      transformResponse: (res: ApiResponse<QualificationCriteria[]>) => res.data || [],
      providesTags: ['QualificationCriteria'],
    }),

    getReactivationCampaigns: builder.query<ReactivationCampaign[], void>({
      query: () => '/ai-isa/campaigns',
      transformResponse: (res: ApiResponse<ReactivationCampaign[]>) => res.data || [],
      providesTags: ['ReactivationCampaigns'],
    }),

    getSpeedToLeadMetrics: builder.query<SpeedToLeadMetric[], void>({
      query: () => '/ai-isa/speed-to-lead',
      transformResponse: (res: ApiResponse<SpeedToLeadMetric[]>) => res.data || [],
      providesTags: ['SpeedToLead'],
    }),
  }),
})

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useToggleAiIsaMutation,
  useGetQuickTemplatesQuery,
  useGetDialerQueueQuery,
  useGetCallLogsQuery,
  useGetDialerStatsQuery,
  useSaveCallDispositionMutation,
  useGetVoicemailDropsQuery,
  useCreateVoicemailDropMutation,
  useEnqueueDialerContactsMutation,
  useClearDialerQueueMutation,
  useGetQualificationCriteriaQuery,
  useGetReactivationCampaignsQuery,
  useGetSpeedToLeadMetricsQuery,
} = communicationApi
