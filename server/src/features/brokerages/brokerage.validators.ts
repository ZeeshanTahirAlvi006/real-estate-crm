import { z } from 'zod'

// Create Brokerage Schema
export const createBrokerageSchema = z
  .object({
    name: z.string().trim().min(2, 'Brokerage name must be at least 2 characters').max(100),
    subdomain: z.string().trim().toLowerCase().min(2).max(50).optional(),
    plan: z.enum(['growth', 'pro', 'enterprise']).optional().default('growth'),
    timezone: z.string().trim().optional().default('America/New_York'),
  })
  .strict()

// Update Brokerage Schema
export const updateBrokerageSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    subdomain: z.string().trim().toLowerCase().min(2).max(50).optional(),
    plan: z.enum(['growth', 'pro', 'enterprise']).optional(),
    logoUrl: z.string().trim().url('Invalid logo URL format').optional(),
    timezone: z.string().trim().optional(),
  })
  .strict()

// List Brokerages Query Schema with bounded pagination (PERF-M-002)
export const listBrokeragesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(25)
    .transform((val) => Math.min(Math.max(1, val), 100)),
  search: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => (val === undefined || val === 'all' ? undefined : val === 'true')),
})

export type ListBrokeragesQuery = z.infer<typeof listBrokeragesQuerySchema>
