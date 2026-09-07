import { z } from 'zod'

export const objectionCategoryEnum = z.enum([
  'interest_rates',
  'market_crash',
  'commission_fees',
  'lowball_offers',
  'timing_delay',
  'other',
])

export const classifyObjectionSchema = z.object({
  body: z.object({
    text: z.string().min(2, 'Message text is required').max(3000, 'Message text is too long'),
  }),
})

export const generateRebuttalSchema = z.object({
  body: z.object({
    messageText: z.string().min(2, 'Message text is required').max(3000, 'Message text is too long'),
    category: objectionCategoryEnum.optional(),
    leadContext: z
      .object({
        name: z.string().optional(),
        propertyType: z.string().optional(),
        budget: z.number().optional(),
        timeframe: z.string().optional(),
        isBuyer: z.boolean().optional(),
        isSeller: z.boolean().optional(),
        city: z.string().optional(),
      })
      .optional(),
    tone: z.enum(['professional', 'consultative', 'direct', 'empathetic']).optional(),
  }),
})

export const savePlaybookSchema = z.object({
  body: z.object({
    category: objectionCategoryEnum,
    title: z.string().min(3, 'Title must be at least 3 characters').max(120),
    triggerKeywords: z.array(z.string()).default([]),
    angles: z.object({
      analytical: z.object({
        script: z.string().min(10, 'Analytical script is required'),
        metricsUsed: z.array(z.string()).optional(),
      }),
      empathetic: z.object({
        script: z.string().min(10, 'Empathetic script is required'),
        followUpQuestion: z.string().optional(),
      }),
      urgency: z.object({
        script: z.string().min(10, 'Urgency script is required'),
        marketContext: z.string().optional(),
      }),
    }),
  }),
})
