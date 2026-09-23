// integrations/whatsapp/types.ts
import { WAState, WAEvent } from './fsm.js'
import { IWhatsAppIntegrationHistoryItem } from '../../models/WhatsAppIntegration.js'

export interface CodeReceivedPayload {
  code: string
  wabaId: string
  phoneNumberId: string
}

export interface FlowCancelledPayload {
  currentStep?: string
}

export interface FlowErrorReportedPayload {
  errorCode?: string | number
  errorMessage?: string
  sessionId?: string
}

export interface WhatsAppIntegrationStatusDto {
  status: WAState
  wabaId?: string
  phoneNumberId?: string
  displayPhoneNumber?: string
  hasToken: boolean
  launchedAt?: string
  updatedAt?: string
  isLocked?: boolean
  legalEvents: WAEvent[]
  history: IWhatsAppIntegrationHistoryItem[]
  appId?: string
  configId?: string
}

export interface MetaOAuthTokenResponse {
  access_token?: string
  token_type?: string
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

export interface MetaSubscribedAppsResponse {
  success?: boolean
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

export interface MetaPhoneRegisterResponse {
  success?: boolean
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id?: string
  }
}
