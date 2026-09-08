import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../../middleware/authenticate.js'
import { validate } from '../../../middleware/validate.js'
import { cmaStoryController } from './cmaStory.controller.js'

export const generateNarrativeSchema = z.object({
  body: z.object({
    mode: z.enum(['seller', 'buyer']),
    subjectProperty: z.object({
      formattedAddress: z.string().min(3, 'Address is required'),
      beds: z.number().nonnegative().optional(),
      baths: z.number().nonnegative().optional(),
      squareFeet: z.number().positive().optional(),
      propertyType: z.string().optional(),
      purchaseDate: z.string().optional(),
      purchasePrice: z.number().nonnegative().optional(),
      estimatedValue: z.number().positive('Estimated value must be positive'),
      estimatedMortgageBalance: z.number().nonnegative().optional(),
      equity: z.number().optional(),
      equityPercent: z.number().optional(),
    }),
    comparables: z
      .array(
        z.object({
          address: z.string().min(1, 'Comp address required'),
          soldPrice: z.number().positive('Comp sold price must be positive'),
          beds: z.number().nonnegative().optional(),
          baths: z.number().nonnegative().optional(),
          squareFeet: z.number().positive().optional(),
          pricePerSqft: z.number().positive().optional(),
          soldDate: z.string().optional(),
          daysOnMarket: z.number().nonnegative().optional(),
          distanceMiles: z.number().nonnegative().optional(),
        })
      )
      .default([]),
    valuationRange: z
      .object({
        low: z.number().positive(),
        target: z.number().positive(),
        high: z.number().positive(),
        confidenceScore: z.number().min(0).max(100).optional(),
      })
      .optional(),
    cmaReportId: z.string().optional(),
    shareId: z.string().optional(),
    tone: z.enum(['professional', 'consultative', 'concise']).optional().default('consultative'),
  }),
})

const router = Router()

// All narrative generation routes are authenticated
router.use(authenticate)

// POST /api/seller-radar/cma/narrative
router.post('/narrative', validate(generateNarrativeSchema), cmaStoryController.generateNarrative)

export const cmaStoryRoutes = router
