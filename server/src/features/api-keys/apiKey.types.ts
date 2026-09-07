import { ApiKeyScope } from '../../models/ApiKey.js'

export interface CreateApiKeyPayload {
  name: string
  scopes?: ApiKeyScope[]
  expiresInDays?: number
}

export interface CreateApiKeyResponse {
  id: string
  name: string
  keyPrefix: string
  rawKey: string // Unmasked API key string returned ONLY ONCE upon creation
  scopes: ApiKeyScope[]
  expiresAt?: Date
  createdAt: Date
}
