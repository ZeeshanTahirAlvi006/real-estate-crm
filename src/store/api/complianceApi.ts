import { baseApi } from './baseApi'

export interface DncCheckResult {
  phone: string
  isClean: boolean
  dncStatus: 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'
  canCall: boolean
  canText: boolean
  safeCallingHours: {
    start: string
    end: string
    isCurrentlySafe: boolean
    currentServerTime: string
  }
  reason?: string
  checkedAt: string
}

export interface FairHousingViolation {
  phrase: string
  reason: string
  replacement: string
  severity: 'high' | 'medium' | 'low'
  index?: number
}

export interface FairHousingScanReport {
  isCompliant: boolean
  totalViolations: number
  violations: FairHousingViolation[]
  cleanedText: string
  scannedAt: string
}

export interface ComplianceDashboardStats {
  totalContacts: number
  cleanCount: number
  federalDncCount: number
  optedOutCount: number
  optInRate: number
  safeCallingWindowActive: boolean
  currentServerTime: string
  recentComplianceEvents: {
    id: string
    type: 'opt_out' | 'dnc_hit' | 'fair_housing_flag' | 'opt_in_verified'
    timestamp: string
    details: string
    contactName?: string
    contactPhone?: string
  }[]
}

export const complianceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getComplianceDashboard: builder.query<ComplianceDashboardStats, void>({
      query: () => '/compliance/dashboard',
      transformResponse: (response: { data: ComplianceDashboardStats }) => response.data,
      providesTags: ['Compliance'],
    }),

    checkDnc: builder.mutation<DncCheckResult, { phone: string }>({
      query: (body) => ({
        url: '/compliance/tcpa/dnc-check',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: DncCheckResult }) => response.data,
    }),

    recordConsent: builder.mutation<
      any,
      {
        contactId: string
        sms?: boolean
        call?: boolean
        whatsapp?: boolean
        email?: boolean
        consentSource?: string
        optOutReason?: string
      }
    >({
      query: ({ contactId, ...body }) => ({
        url: `/compliance/tcpa/consent/${contactId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Compliance', 'ContactDetail', 'Contacts'],
    }),

    processOptOut: builder.mutation<
      any,
      { phone: string; channel?: string; reason?: string }
    >({
      query: (body) => ({
        url: '/compliance/tcpa/opt-out',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Compliance', 'Contacts', 'ContactDetail'],
    }),

    verifyOptIn: builder.mutation<any, { contactId: string; channel?: string }>({
      query: (body) => ({
        url: '/compliance/tcpa/verify-opt-in',
        method: 'POST',
        body,
      }),
    }),

    confirmOptIn: builder.mutation<any, { contactId: string; code: string }>({
      query: (body) => ({
        url: '/compliance/tcpa/confirm-opt-in',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Compliance', 'ContactDetail', 'Contacts'],
    }),

    scanFairHousing: builder.mutation<FairHousingScanReport, { text: string }>({
      query: (body) => ({
        url: '/compliance/fair-housing/scan',
        method: 'POST',
        body,
      }),
      transformResponse: (response: { data: FairHousingScanReport }) => response.data,
    }),
  }),
})

export const {
  useGetComplianceDashboardQuery,
  useCheckDncMutation,
  useRecordConsentMutation,
  useProcessOptOutMutation,
  useVerifyOptInMutation,
  useConfirmOptInMutation,
  useScanFairHousingMutation,
} = complianceApi
