import { IntegrationProvider, IntegrationStatus } from '../../models/Integration.js'

export interface SaveIntegrationPayload {
  provider: IntegrationProvider
  name: string
  credentials?: Record<string, string>
  config?: Record<string, string>
}

export interface IntegrationResponse {
  id: string
  provider: IntegrationProvider
  name: string
  status: IntegrationStatus
  config: Record<string, string>
  lastTestedAt?: Date
  lastError?: string
  createdAt: Date
  updatedAt: Date
}
