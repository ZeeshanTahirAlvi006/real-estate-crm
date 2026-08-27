import { z } from 'zod'
import { LEAD_SOURCE_TYPES, ROUTING_RULE_TYPES } from '../../utils/constants.js'

// ── LeadSource Schemas ──

export const createLeadSourceSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(LEAD_SOURCE_TYPES as unknown as [string, ...string[]], {
      errorMap: () => ({ message: `Type must be one of: ${LEAD_SOURCE_TYPES.join(', ')}` }),
    }),
    isActive: z.boolean().optional().default(true),
    config: z
      .object({
        fieldMapping: z.record(z.string().trim().max(100), z.string().trim().max(100)).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const updateLeadSourceSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    type: z
      .enum(LEAD_SOURCE_TYPES as unknown as [string, ...string[]])
      .optional(),
    isActive: z.boolean().optional(),
    config: z
      .object({
        fieldMapping: z.record(z.string().trim().max(100), z.string().trim().max(100)).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export const listLeadSourcesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.string().trim().optional(),
  isActive: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.enum(['name', 'type', 'leadCount', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ── RoutingRule Schemas ──

const agentWeightSchema = z
  .object({
    agentId: z.string().trim().min(1, 'Agent ID is required'),
    percentage: z.number().min(0).max(100),
  })
  .strict()

const zipCodeMappingSchema = z
  .object({
    zipCodes: z.array(z.string().trim().min(1).max(20)).min(1, 'At least one zip code is required'),
    agentId: z.string().trim().min(1, 'Agent ID is required'),
  })
  .strict()

const scheduleWindowSchema = z
  .object({
    dayOfWeek: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'At least one day is required'),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(0).max(23),
  })
  .strict()
  .refine((data) => data.startHour < data.endHour, {
    message: 'startHour must be less than endHour',
  })

const agentScheduleSchema = z
  .object({
    agentId: z.string().trim().min(1, 'Agent ID is required'),
    timezone: z.string().trim().min(1).max(50).default('America/New_York'),
    windows: z.array(scheduleWindowSchema).min(1, 'At least one schedule window is required'),
  })
  .strict()

export const createRoutingRuleSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(ROUTING_RULE_TYPES as unknown as [string, ...string[]], {
      errorMap: () => ({ message: `Type must be one of: ${ROUTING_RULE_TYPES.join(', ')}` }),
    }),
    isActive: z.boolean().optional().default(true),
    priority: z.number().int().min(1).max(999).optional().default(10),
    assignedAgentIds: z.array(z.string().trim().min(1)).optional().default([]),
    agentWeights: z.array(agentWeightSchema).optional().default([]),
    zipCodeMappings: z.array(zipCodeMappingSchema).optional().default([]),
    schedules: z.array(agentScheduleSchema).optional().default([]),
    escalationTimeoutSeconds: z.number().int().min(10).max(600).optional().default(60),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Validate round-robin requires assignedAgentIds
    if (data.type === 'round_robin' && (!data.assignedAgentIds || data.assignedAgentIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Round-robin routing requires at least one agent in assignedAgentIds',
        path: ['assignedAgentIds'],
      })
    }

    // Validate weighted requires agentWeights summing to 100
    if (data.type === 'weighted') {
      if (!data.agentWeights || data.agentWeights.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Weighted routing requires at least one entry in agentWeights',
          path: ['agentWeights'],
        })
      } else {
        const totalPercentage = data.agentWeights.reduce((sum, w) => sum + w.percentage, 0)
        if (Math.abs(totalPercentage - 100) > 0.01) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Agent weight percentages must sum to exactly 100 (current total: ${totalPercentage})`,
            path: ['agentWeights'],
          })
        }
      }
    }

    // Validate zip-code requires zipCodeMappings
    if (data.type === 'zip_code' && (!data.zipCodeMappings || data.zipCodeMappings.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Zip-code routing requires at least one entry in zipCodeMappings',
        path: ['zipCodeMappings'],
      })
    }

    // Validate time-of-day requires schedules
    if (data.type === 'time_of_day' && (!data.schedules || data.schedules.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time-of-day routing requires at least one entry in schedules',
        path: ['schedules'],
      })
    }
  })

export const updateRoutingRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
    priority: z.number().int().min(1).max(999).optional(),
    assignedAgentIds: z.array(z.string().trim().min(1)).optional(),
    agentWeights: z.array(agentWeightSchema).optional(),
    zipCodeMappings: z.array(zipCodeMappingSchema).optional(),
    schedules: z.array(agentScheduleSchema).optional(),
    escalationTimeoutSeconds: z.number().int().min(10).max(600).optional(),
  })
  .strict()

export const listRoutingRulesQuerySchema = z.object({
  type: z.string().trim().optional(),
  isActive: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z.enum(['name', 'type', 'priority', 'createdAt', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// ── Lead Ingestion Schemas ──

export const leadIngestSchema = z
  .object({
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    name: z.string().trim().max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(5000).optional(),
    propertyAddress: z.string().trim().max(300).optional(),
    propertyPrice: z.coerce.number().min(0).optional(),
    zipCode: z.string().trim().max(20).optional(),
    source: z.string().trim().max(100).optional(),
  })
  .passthrough() // Allow extra fields from webhooks

export const leadCaptureSchema = z
  .object({
    captureKey: z.string().trim().uuid('Invalid capture key format'),
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().trim().toLowerCase().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(5000).optional(),
    propertyAddress: z.string().trim().max(300).optional(),
    propertyPrice: z.coerce.number().min(0).optional(),
    zipCode: z.string().trim().max(20).optional(),
  })
  .strict()

export const manualLeadEntrySchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().trim().toLowerCase().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    message: z.string().trim().max(5000).optional(),
    propertyAddress: z.string().trim().max(300).optional(),
    propertyPrice: z.coerce.number().min(0).optional(),
    zipCode: z.string().trim().max(20).optional(),
    leadSource: z.string().trim().max(100).optional().default('Manual Entry'),
    tags: z.array(z.string().trim().max(50)).optional().default([]),
    assignedAgentId: z.string().trim().optional(),
  })
  .strict()

export const leadAcknowledgeSchema = z
  .object({
    contactIds: z.array(z.string().trim().min(1)).min(1, 'At least one contact ID is required'),
  })
  .strict()

// ── ScoringConfig Schemas ──

const sourceWeightInputSchema = z
  .object({
    sourceType: z.string().trim().min(1).max(50),
    points: z.number().int().min(-50).max(50),
  })
  .strict()

const keywordWeightInputSchema = z
  .object({
    keyword: z.string().trim().toLowerCase().min(1).max(100),
    points: z.number().int().min(-50).max(50),
  })
  .strict()

const priceTierWeightInputSchema = z
  .object({
    minPrice: z.number().min(0),
    maxPrice: z.number().min(0),
    points: z.number().int().min(-50).max(50),
  })
  .strict()
  .refine((data) => data.maxPrice > data.minPrice, {
    message: 'maxPrice must be greater than minPrice',
  })

const messageLengthBonusInputSchema = z
  .object({
    minLength: z.number().int().min(0).max(10000),
    points: z.number().int().min(-50).max(50),
  })
  .strict()

export const updateScoringConfigSchema = z
  .object({
    sourceWeights: z.array(sourceWeightInputSchema).optional(),
    keywordWeights: z.array(keywordWeightInputSchema).optional(),
    priceTierWeights: z.array(priceTierWeightInputSchema).optional(),
    financingBonus: z.number().int().min(0).max(50).optional(),
    messageLengthBonus: messageLengthBonusInputSchema.optional(),
    baseScore: z.number().int().min(0).max(100).optional(),
  })
  .strict()
