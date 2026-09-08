import { z } from 'zod'

// List Audit Logs Query Schema
export const listAuditLogsQuerySchema = z.object({
  action: z.string().trim().max(100).optional(),
  resource: z.string().trim().max(100).optional(),
  userEmail: z.string().trim().toLowerCase().optional(),
  status: z.enum(['success', 'failure']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.enum(['createdAt', 'action', 'resource', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
