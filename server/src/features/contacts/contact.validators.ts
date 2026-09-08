import { z } from 'zod'

const socialLinksSchema = z
  .object({
    linkedin: z.string().trim().url('Invalid LinkedIn URL').optional().or(z.literal('')),
    facebook: z.string().trim().url('Invalid Facebook URL').optional().or(z.literal('')),
    instagram: z.string().trim().url('Invalid Instagram URL').optional().or(z.literal('')),
  })
  .strict()

// Create Contact Schema
export const createContactSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().trim().toLowerCase().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    secondaryPhone: z.string().trim().max(30).optional().or(z.literal('')),
    address: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
    zipCode: z.string().trim().max(20).optional(),
    leadSource: z.string().trim().max(100).optional().default('Manual Entry'),
    leadScore: z.coerce.number().min(0).max(100).optional().default(50),
    tags: z.array(z.string().trim().max(50)).optional().default([]),
    status: z.enum(['active', 'inactive', 'do_not_contact', 'archived']).optional().default('active'),
    assignedAgentId: z.string().trim().optional(),
    notes: z.string().trim().max(5000).optional(),
    propertyInterests: z.array(z.string().trim().max(100)).optional().default([]),
    socialLinks: socialLinksSchema.optional(),
  })
  .strict()

// Update Contact Schema
export const updateContactSchema = z
  .object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().trim().max(30).optional().or(z.literal('')),
    secondaryPhone: z.string().trim().max(30).optional().or(z.literal('')),
    address: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
    zipCode: z.string().trim().max(20).optional(),
    leadSource: z.string().trim().max(100).optional(),
    leadScore: z.coerce.number().min(0).max(100).optional(),
    tags: z.array(z.string().trim().max(50)).optional(),
    status: z.enum(['active', 'inactive', 'do_not_contact', 'archived']).optional(),
    assignedAgentId: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().max(5000).optional(),
    propertyInterests: z.array(z.string().trim().max(100)).optional(),
    socialLinks: socialLinksSchema.optional(),
    lastContactedAt: z.string().datetime().optional(),
  })
  .strict()

// Add Note Schema
export const addNoteSchema = z
  .object({
    note: z.string().trim().min(1, 'Note content is required').max(2000),
  })
  .strict()

// Bulk Action Schema
export const bulkContactActionSchema = z
  .object({
    contactIds: z.array(z.string().trim().min(1)).min(1, 'At least one contact ID is required'),
    action: z.enum(['add_tags', 'remove_tags', 'assign_agent', 'update_status']),
    tags: z.array(z.string().trim().max(50)).optional(),
    assignedAgentId: z.string().trim().optional(),
    status: z.enum(['active', 'inactive', 'do_not_contact', 'archived']).optional(),
  })
  .strict()

// List Contacts Query Schema
export const listContactsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.string().trim().optional(),
  source: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  assignedAgentId: z.string().trim().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  sortBy: z
    .enum(['firstName', 'lastName', 'email', 'leadScore', 'status', 'createdAt', 'updatedAt', 'lastContactedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
