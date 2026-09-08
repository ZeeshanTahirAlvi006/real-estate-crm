export type DncStatus = 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'

export interface DncCheckResult {
  phone: string
  isClean: boolean
  dncStatus: DncStatus
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

export interface ChannelConsentInput {
  sms?: boolean
  call?: boolean
  whatsapp?: boolean
  email?: boolean
  consentSource?: 'web_form' | 'lead_portal' | 'verbal' | 'inbound_sms' | 'written'
  optOutReason?: string
}

export interface OptOutInput {
  phone: string
  channel?: 'all' | 'sms' | 'call' | 'whatsapp' | 'email'
  reason?: string
}

export interface VerifyOptInInput {
  contactId: string
  channel?: 'sms' | 'whatsapp'
}

export interface ConfirmOptInInput {
  contactId: string
  code: string
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
