import { z } from 'zod'

// Toggle Feature Flag Schema
export const toggleFeatureFlagSchema = z
  .object({
    isEnabled: z.boolean({
      required_error: 'isEnabled boolean flag is required',
    }),
    disabledReason: z.string().trim().max(250, 'Reason cannot exceed 250 characters').optional(),
  })
  .strict()
