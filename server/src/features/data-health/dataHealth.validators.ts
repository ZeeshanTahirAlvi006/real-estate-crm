import { z } from 'zod'

export const mergeCandidateSchema = z.object({
  primaryContactId: z.string().min(1, 'Primary contact ID is required'),
  secondaryContactId: z.string().min(1, 'Secondary contact ID is required'),
  fieldOverrides: z
    .object({
      firstName: z.string().trim().min(1).max(50).optional(),
      lastName: z.string().trim().min(1).max(50).optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().min(7).max(25).optional(),
      address: z.string().trim().max(200).optional(),
      city: z.string().trim().max(100).optional(),
      state: z.string().trim().max(50).optional(),
      zipCode: z.string().trim().max(20).optional(),
      tags: z.array(z.string()).optional(),
      notes: z.string().max(5000).optional(),
    })
    .optional(),
})

export const candidateIdParamSchema = z.object({
  id: z.string().min(1, 'Duplicate candidate ID is required'),
})
