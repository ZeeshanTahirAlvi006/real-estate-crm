import { z } from 'zod'
import { API_KEY_SCOPES } from '../../models/ApiKey.js'

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'API Key name is required').max(80),
    scopes: z.array(z.enum(API_KEY_SCOPES)).optional(),
    expiresInDays: z.number().min(1).max(365).optional(),
  }),
})
