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

// Communication API — endpoints connected to real backend
export const communicationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Inbox / Conversations ──
    getConversations: builder.query<ConversationThread[], { channel?: string; search?: string } | void>({
      query: (params) => ({
        url: '/inbox/conversations',
        params: params || undefined,
      }),
      providesTags: ['Conversations'],
    }),

    getMessages: builder.query<ConversationMessage[], string>({
      query: (conversationId) => `/inbox/conversations/${conversationId}/messages`,
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
      invalidatesTags: ['Conversations'],
    }),

    getQuickTemplates: builder.query<QuickReplyTemplate[], void>({
      query: () => '/communication/templates',
      providesTags: ['QuickTemplates'],
    }),

    // ── Dialer ──
    getDialerQueue: builder.query<DialerQueueContact[], void>({
      query: () => '/dialer/queue',
      providesTags: ['DialerQueue'],
    }),

    getCallLogs: builder.query<CallLog[], void>({
      query: () => '/dialer/call-logs',
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
        linesUsed: 1 | 3 | 5
      }
    >({
      query: (data) => ({
        url: '/dialer/call-logs',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CallLogs', 'DialerQueue'],
    }),

    getVoicemailDrops: builder.query<VoicemailAudioDrop[], void>({
      query: () => '/dialer/voicemail-drops',
      providesTags: ['VoicemailDrops'],
    }),

    // ── AI ISA Engine ──
    getQualificationCriteria: builder.query<QualificationCriteria[], void>({
      query: () => '/ai-isa/qualification-criteria',
      providesTags: ['QualificationCriteria'],
    }),

    updateQualificationCriteria: builder.mutation<QualificationCriteria[], QualificationCriteria[]>({
      query: (criteria) => ({
        url: '/ai-isa/qualification-criteria',
        method: 'PUT',
        body: criteria,
      }),
      invalidatesTags: ['QualificationCriteria'],
    }),

    getReactivationCampaigns: builder.query<ReactivationCampaign[], void>({
      query: () => '/ai-isa/campaigns',
      providesTags: ['ReactivationCampaigns'],
    }),

    toggleReactivationCampaign: builder.mutation<ReactivationCampaign, { id: string; status: 'active' | 'paused' }>({
      query: ({ id, status }) => ({
        url: `/ai-isa/campaigns/${id}/toggle`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['ReactivationCampaigns'],
    }),

    getSpeedToLeadMetrics: builder.query<SpeedToLeadMetric[], void>({
      query: () => '/ai-isa/speed-to-lead',
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
  useSaveCallDispositionMutation,
  useGetVoicemailDropsQuery,
  useGetQualificationCriteriaQuery,
  useUpdateQualificationCriteriaMutation,
  useGetReactivationCampaignsQuery,
  useToggleReactivationCampaignMutation,
  useGetSpeedToLeadMetricsQuery,
} = communicationApi
