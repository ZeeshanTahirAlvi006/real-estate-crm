import { z } from 'zod'
import { INTEGRATION_PROVIDERS } from '../../models/Integration.js'

export const saveIntegrationSchema = z.object({
  body: z.object({
    provider: z.enum(INTEGRATION_PROVIDERS, {
      required_error: 'Integration provider is required (zapier, quickbooks)',
    }),
    name: z.string().min(1, 'Name is required').max(100),
    credentials: z.record(z.string()).optional(),
    config: z.record(z.string()).optional(),
  }),
})

export const testIntegrationSchema = z.object({
  params: z.object({
    provider: z.enum(INTEGRATION_PROVIDERS),
  }),
})
