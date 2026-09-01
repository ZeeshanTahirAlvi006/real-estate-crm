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

// ── AI ISA Config ───────────────────────────────────────
export const updateAiIsaConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  persona: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      tone: z.enum(['professional', 'friendly', 'concise', 'consultative']).optional(),
      agentName: z.string().trim().min(1).max(100).optional(),
      brokerageName: z.string().trim().max(100).optional(),
      customInstructions: z.string().trim().max(2000).optional(),
    })
    .optional(),
  officeHoursOnly: z.boolean().optional(),
  autoReplyChannels: z.array(z.enum(['sms', 'whatsapp', 'email'])).optional(),
  autoPilotEnabled: z.boolean().optional(),
  humanHandoffDelaySeconds: z.number().int().min(0).max(300).optional(),
  qualificationThresholdScore: z.number().int().min(0).max(100).optional(),
})

// ── Qualification Criteria ──────────────────────────────
export const createCriteriaSchema = z.object({
  category: z.enum(['budget', 'timeline', 'pre_approval', 'location', 'home_to_sell']),
  label: z.string().trim().min(1).max(150),
  isRequired: z.boolean().default(true),
  promptDirective: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1)).optional(),
  order: z.number().int().min(0).default(0),
})

export const updateCriteriaSchema = z.object({
  isRequired: z.boolean().optional(),
  promptDirective: z.string().trim().min(1).optional(),
  options: z.array(z.string()).optional(),
})

// ── Reactivation Campaigns ──────────────────────────────
export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetSegment: z.string().trim().min(1).max(100),
  channel: z.enum(['sms', 'whatsapp', 'email']).default('sms'),
  messageTemplate: z.string().trim().min(1).max(2000),
  dormantDaysThreshold: z.number().int().min(1).max(365).default(90),
  totalLeads: z.number().int().min(0).default(0),
})

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetSegment: z.string().trim().min(1).max(100).optional(),
  channel: z.enum(['sms', 'whatsapp', 'email']).optional(),
  messageTemplate: z.string().trim().min(1).max(2000).optional(),
  dormantDaysThreshold: z.number().int().min(1).max(365).optional(),
})
