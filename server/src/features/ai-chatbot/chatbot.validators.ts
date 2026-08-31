import { z } from 'zod'

export const qualifyLeadSchema = z.object({
  body: z.object({
    leadMessage: z.string().min(1, 'Lead message cannot be empty'),
    contactId: z.string().optional(),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(['lead', 'assistant']),
          text: z.string(),
        })
      )
      .optional(),
    currentCriteriaState: z
      .object({
        budget: z.string().optional(),
        timeline: z.string().optional(),
        preApproval: z.enum(['approved', 'cash', 'needs_lender', 'not_started']).optional(),
        location: z.string().optional(),
        homeToSell: z.enum(['yes', 'no', 'selling_first']).optional(),
      })
      .optional(),
  }),
})

export const draftResponseSchema = z.object({
  body: z.object({
    conversationId: z.string().optional(),
    contactId: z.string().optional(),
    messages: z.array(
      z.object({
        sender: z.string(),
        body: z.string(),
      })
    ),
    intentHint: z.string().optional(),
  }),
})

export const summarizeSchema = z.object({
  body: z.object({
    text: z.string().optional(),
    conversationId: z.string().optional(),
    contactId: z.string().optional(),
    messages: z
      .array(
        z.object({
          sender: z.string(),
          senderName: z.string().optional(),
          body: z.string(),
        })
      )
      .optional(),
  }),
})

export const suggestNextActionSchema = z.object({
  body: z.object({
    contactId: z.string().optional(),
    stage: z.string().optional(),
    leadScore: z.number().optional(),
    daysSinceLastContact: z.number().optional(),
    notes: z.string().optional(),
  }),
})

export const fairHousingCheckSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text is required for compliance scan'),
  }),
})
