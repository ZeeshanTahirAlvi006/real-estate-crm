import { z } from 'zod'

const objectIdRegex = /^[0-9a-fA-F]{24}$/

export const mergeCandidateSchema = z.object({
  primaryContactId: z
    .string()
    .regex(objectIdRegex, 'Invalid primary contact ID format'),
  secondaryContactId: z
    .string()
    .regex(objectIdRegex, 'Invalid secondary contact ID format'),
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
  id: z.string().regex(objectIdRegex, 'Invalid duplicate candidate ID format'),
})

export const listIssuesQuerySchema = z.object({
  type: z.enum(['all', 'email', 'phone']).optional().default('all'),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export const listDuplicatesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})
