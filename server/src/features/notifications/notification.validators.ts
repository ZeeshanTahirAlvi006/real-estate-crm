import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .default(20)
    .transform((val) => Math.min(Math.max(1, val), 100)),
  status: z.enum(['all', 'unread']).optional().default('all'),
})

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>
