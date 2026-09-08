import { z } from 'zod'

export const confirmImportSchema = z.object({
  body: z.object({
    entityType: z.enum(['contacts', 'deals', 'properties']),
    mapping: z.record(z.string(), z.string()).refine((m) => Object.keys(m).length > 0, {
      message: 'Mapping dictionary cannot be empty',
    }),
    csvContent: z.string().optional(),
    rows: z.array(z.record(z.string())).optional(),
  }),
})
