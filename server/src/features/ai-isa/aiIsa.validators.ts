import { z } from 'zod'

export const simulateChatSchema = z.object({
  leadMessage: z.string().trim().min(1, 'Message is required'),
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
})

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetSegment: z.string().trim().min(1).max(100),
  channel: z.enum(['sms', 'whatsapp', 'email']).default('sms'),
  messageTemplate: z.string().trim().min(1).max(2000),
  totalLeads: z.number().int().min(0).default(0),
})

export const updateCriteriaSchema = z.object({
  isRequired: z.boolean().optional(),
  promptDirective: z.string().trim().min(1).optional(),
  options: z.array(z.string()).optional(),
})
