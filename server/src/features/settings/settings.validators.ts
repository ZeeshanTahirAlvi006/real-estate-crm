import { z } from 'zod'
import { NOTIFICATION_EVENT_TYPES, SUPPORTED_CURRENCIES } from '../../models/Settings.js'

export const updateNotificationPrefsSchema = z.object({
  body: z.object({
    notificationPrefs: z.array(
      z.object({
        type: z.enum(NOTIFICATION_EVENT_TYPES),
        email: z.boolean(),
        push: z.boolean(),
        sms: z.boolean(),
      })
    ).min(1, 'At least one notification preference must be provided'),
  }),
})

export const updateBrokerageConfigSchema = z.object({
  body: z.object({
    timezone: z.string().min(1, 'Timezone cannot be empty').optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    marketType: z.enum(['north_america', 'uae_dubai', 'uk_europe', 'apac']).optional(),
    transferTaxRate: z.number().min(0).max(100).optional(),
    offPlanEnabled: z.boolean().optional(),
  }),
})
