import { baseApi } from './baseApi'
import type {
  ESignEnvelope,
  PrepareEnvelopeInput,
  PublicSigningSession,
  SubmitSignaturePayload,
  ESignContractTemplate,
} from '@/types/esign'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface ListEnvelopesResponse {
  envelopes: ESignEnvelope[]
  total: number
  page: number
  limit: number
}

export const esignApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getESignTemplates: builder.query<ESignContractTemplate[], void>({
      query: () => '/esign/templates',
      transformResponse: (response: ApiResponse<ESignContractTemplate[]>) => response.data || [],
    }),

    getEnvelopes: builder.query<
      ListEnvelopesResponse,
      { transactionId?: string; dealId?: string; status?: string; page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/esign',
        params: params || {},
      }),
      transformResponse: (response: ApiResponse<ListEnvelopesResponse>) => response.data,
      providesTags: ['ESign'],
    }),

    getEnvelopeById: builder.query<ESignEnvelope, string>({
      query: (id) => `/esign/${id}`,
      transformResponse: (response: ApiResponse<ESignEnvelope>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'ESign', id }],
    }),

    prepareEnvelope: builder.mutation<ESignEnvelope, PrepareEnvelopeInput>({
      query: (body) => ({
        url: '/esign/prepare',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<ESignEnvelope>) => response.data,
      invalidatesTags: ['ESign', 'Transactions'],
    }),

    sendEnvelope: builder.mutation<ESignEnvelope, string>({
      query: (id) => ({
        url: `/esign/${id}/send`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponse<ESignEnvelope>) => response.data,
      invalidatesTags: ['ESign'],
    }),

    voidEnvelope: builder.mutation<ESignEnvelope, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/esign/${id}/void`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response: ApiResponse<ESignEnvelope>) => response.data,
      invalidatesTags: ['ESign'],
    }),

    // Public signing session endpoints (unauthenticated)
    getSigningSession: builder.query<PublicSigningSession, string>({
      query: (token) => `/esign/sign/${token}`,
      transformResponse: (response: ApiResponse<PublicSigningSession>) => response.data,
      providesTags: (_result, _error, token) => [{ type: 'ESign', id: `sign-${token}` }],
    }),

    completeSigning: builder.mutation<PublicSigningSession, { token: string; payload: SubmitSignaturePayload }>({
      query: ({ token, payload }) => ({
        url: `/esign/sign/${token}/complete`,
        method: 'POST',
        body: payload,
      }),
      transformResponse: (response: ApiResponse<PublicSigningSession>) => response.data,
      invalidatesTags: ['ESign'],
    }),

    declineSigning: builder.mutation<PublicSigningSession, { token: string; reason: string }>({
      query: ({ token, reason }) => ({
        url: `/esign/sign/${token}/decline`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response: ApiResponse<PublicSigningSession>) => response.data,
      invalidatesTags: ['ESign'],
    }),
  }),
})

export const {
  useGetESignTemplatesQuery,
  useGetEnvelopesQuery,
  useGetEnvelopeByIdQuery,
  usePrepareEnvelopeMutation,
  useSendEnvelopeMutation,
  useVoidEnvelopeMutation,
  useGetSigningSessionQuery,
  useCompleteSigningMutation,
  useDeclineSigningMutation,
} = esignApi
