import { z } from 'zod'

const objectIdRegex = /^[0-9a-fA-F]{24}$/

export const voiceNoteOptionsSchema = z.object({
  contactId: z.string().regex(objectIdRegex, 'Invalid contact ID format').optional(),
  dealId: z.string().regex(objectIdRegex, 'Invalid deal ID format').optional(),
  promptHint: z.string().max(500, 'Prompt hint cannot exceed 500 characters').optional(),
})

export const textExtractSchema = z.object({
  text: z
    .string({ required_error: 'Text is required for entity extraction' })
    .min(3, 'Text must be at least 3 characters')
    .max(10000, 'Text cannot exceed 10,000 characters'),
  contactId: z.string().regex(objectIdRegex, 'Invalid contact ID format').optional(),
})

export const contactVoiceNotesParamSchema = z.object({
  contactId: z.string().regex(objectIdRegex, 'Invalid contact ID format'),
})
