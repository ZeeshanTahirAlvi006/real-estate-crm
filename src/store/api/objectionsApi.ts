import { baseApi } from './baseApi'

export type ObjectionCategory =
  | 'interest_rates'
  | 'market_crash'
  | 'commission_fees'
  | 'lowball_offers'
  | 'timing_delay'
  | 'other'

export type RebuttalAngleType = 'analytical' | 'empathetic' | 'urgency'

export interface ObjectionClassification {
  category: ObjectionCategory
  confidence: number
  detectedPhrases: string[]
  rationale: string
  label: string
}

export interface RebuttalAngleDetail {
  angle: RebuttalAngleType
  title: string
  script: string
  rationale: string
  keyTalkingPoints: string[]
  followUpPrompt?: string
}

export interface MultiAngleRebuttals {
  analytical: RebuttalAngleDetail
  empathetic: RebuttalAngleDetail
  urgency: RebuttalAngleDetail
}

export interface GenerateRebuttalRequest {
  messageText: string
  category?: ObjectionCategory
  leadContext?: {
    name?: string
    propertyType?: string
    budget?: number
    timeframe?: string
    isBuyer?: boolean
    isSeller?: boolean
    city?: string
  }
  tone?: 'professional' | 'consultative' | 'direct' | 'empathetic'
}

export interface GenerateRebuttalResponse {
  category: ObjectionCategory
  categoryLabel: string
  confidence: number
  detectedPhrases: string[]
  rebuttals: MultiAngleRebuttals
  fairHousingPassed: boolean
  isFromCustomPlaybook: boolean
}

export interface PlaybookItemDto {
  id: string
  brokerageId?: string
  category: ObjectionCategory
  categoryLabel: string
  title: string
  triggerKeywords: string[]
  angles: {
    analytical: {
      script: string
      metricsUsed?: string[]
    }
    empathetic: {
      script: string
      followUpQuestion?: string
    }
    urgency: {
      script: string
      marketContext?: string
    }
  }
  isCustom: boolean
  createdAt: string
}

export const objectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    classifyObjection: builder.mutation<
      { success: boolean; data: ObjectionClassification },
      { text: string }
    >({
      query: (body) => ({
        url: '/chatbot/objections/classify',
        method: 'POST',
        body,
      }),
    }),

    generateRebuttal: builder.mutation<
      { success: boolean; data: GenerateRebuttalResponse },
      GenerateRebuttalRequest
    >({
      query: (body) => ({
        url: '/chatbot/objections/rebuttal',
        method: 'POST',
        body,
      }),
    }),

    getPlaybooks: builder.query<
      { success: boolean; data: PlaybookItemDto[] },
      { category?: ObjectionCategory } | void
    >({
      query: (params) => ({
        url: '/chatbot/objections/playbook',
        method: 'GET',
        params: params || undefined,
      }),
      providesTags: ['Objections'],
    }),

    savePlaybook: builder.mutation<
      { success: boolean; data: PlaybookItemDto },
      any
    >({
      query: (body) => ({
        url: '/chatbot/objections/playbook',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Objections'],
    }),

    deletePlaybook: builder.mutation<
      { success: boolean; data: { deleted: boolean } },
      string
    >({
      query: (id) => ({
        url: `/chatbot/objections/playbook/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Objections'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useClassifyObjectionMutation,
  useGenerateRebuttalMutation,
  useGetPlaybooksQuery,
  useSavePlaybookMutation,
  useDeletePlaybookMutation,
} = objectionsApi
