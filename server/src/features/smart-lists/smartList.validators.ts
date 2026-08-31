import { z } from 'zod'

const FilterOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'between',
  'in',
  'is_empty',
  'is_not_empty',
])

const SmartListFilterSchema = z.object({
  id: z.string().min(1, 'Filter ID is required'),
  field: z.string().min(1, 'Field name is required'),
  operator: FilterOperatorSchema,
  value: z.any().optional(), // Depending on operator, could be string, number, array, etc.
})

export const createSmartListSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Smart List name is required'),
    filters: z.array(SmartListFilterSchema),
  }),
})

export const updateSmartListSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Smart List name is required').optional(),
    filters: z.array(SmartListFilterSchema).optional(),
  }),
})

export const previewSmartListSchema = z.object({
  body: z.object({
    filters: z.array(SmartListFilterSchema),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }).optional(),
})
