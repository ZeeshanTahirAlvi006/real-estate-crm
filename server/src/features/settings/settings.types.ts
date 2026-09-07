import { INotificationPref, IBrokerageConfig, SupportedCurrency } from '../../models/Settings.js'

export interface UpdateNotificationPrefsPayload {
  notificationPrefs: INotificationPref[]
}

export interface UpdateBrokerageConfigPayload {
  timezone?: string
  currency?: SupportedCurrency
  marketType?: 'north_america' | 'uae_dubai' | 'uk_europe' | 'apac'
  transferTaxRate?: number
  offPlanEnabled?: boolean
}

export interface UserSettingsResponse {
  scope: 'user'
  userId: string
  brokerageId: string
  notificationPrefs: INotificationPref[]
  updatedAt: Date
}

export interface BrokerageSettingsResponse {
  scope: 'brokerage'
  brokerageId: string
  brokerageConfig: IBrokerageConfig
  notificationPrefs: INotificationPref[]
  updatedAt: Date
}
