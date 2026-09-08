import { z } from 'zod'

const DEAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export const createDealSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline ID is required'),
  stageId: z.string().min(1, 'Stage ID is required'),
  contactId: z.string().min(1, 'Contact ID is required'),
  propertyAddress: z.string().trim().min(1, 'Property address is required').max(300),
  dealValue: z.number().min(0, 'Deal value cannot be negative'),
  assignedAgentId: z.string().min(1, 'Assigned agent is required'),
  priority: z.enum(DEAL_PRIORITIES).default('medium'),
  notes: z.string().max(5000).optional().default(''),
})

export const updateDealSchema = z.object({
  propertyAddress: z.string().trim().min(1).max(300).optional(),
  dealValue: z.number().min(0).optional(),
  assignedAgentId: z.string().min(1).optional(),
  priority: z.enum(DEAL_PRIORITIES).optional(),
  notes: z.string().max(5000).optional(),
})

export const moveDealStageSchema = z.object({
  stageId: z.string().min(1, 'New stage ID is required'),
})

export const listDealsQuerySchema = z.object({
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  assignedAgentId: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
})
