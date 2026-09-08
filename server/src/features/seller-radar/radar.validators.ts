import { z } from 'zod'

export const analyzePropertySchema = z.object({
  body: z.object({
    address: z.union([
      z.string().min(3, 'Address is required').max(300),
      z.object({
        street: z.string().optional().default(''),
        city: z.string().optional().default(''),
        state: z.string().optional().default(''),
        zipCode: z.string().optional().default(''),
        formattedAddress: z.string().min(3, 'Formatted address is required'),
      }),
    ]),
    contactId: z.string().optional(),
    propertyId: z.string().optional(),
    purchasePrice: z.number().positive().optional(),
    purchaseDate: z.string().datetime().optional().or(z.string().date()).or(z.string().min(4)),
    currentMortgageRate: z.number().min(0).max(30).optional(),
    beds: z.number().nonnegative().optional(),
    baths: z.number().nonnegative().optional(),
    squareFeet: z.number().positive().optional(),
    propertyType: z
      .enum(['single_family', 'condo', 'townhouse', 'multi_family', 'commercial', 'land'])
      .optional()
      .default('single_family'),
    saveProperty: z.boolean().optional().default(false),
  }),
})

export const prospectsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
    minEquity: z.coerce.number().nonnegative().optional(),
    minProbability: z.coerce.number().min(0).max(100).optional(),
    search: z.string().optional(),
    propertyType: z.string().optional(),
    sortBy: z
      .enum(['probabilityOfSelling', 'equity', 'estimatedValue', 'purchaseDate'])
      .optional()
      .default('probabilityOfSelling'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
})

export const generateCmaSchema = z.object({
  body: z.object({
    propertyId: z.string().optional(),
    contactId: z.string().optional(),
    address: z
      .union([
        z.string().min(3, 'Address is required').max(300),
        z.object({
          street: z.string().optional().default(''),
          city: z.string().optional().default(''),
          state: z.string().optional().default(''),
          zipCode: z.string().optional().default(''),
          formattedAddress: z.string().min(3, 'Formatted address is required'),
        }),
      ])
      .optional(),
    customNarrative: z.string().max(5000).optional(),
    lowRangeModifier: z.number().min(0.8).max(1.0).optional().default(0.95),
    highRangeModifier: z.number().min(1.0).max(1.2).optional().default(1.05),
    notes: z.string().max(2000).optional(),
  }),
})

export const cmaParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'CMA ID or share slug is required'),
  }),
})

export const triggerAnniversarySchema = z.object({
  body: z.object({
    forceAll: z.boolean().optional().default(false),
  }).optional(),
})
