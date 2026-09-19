import { z } from 'zod'

export const sendMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(5000, 'Message body too long'),
  channel: z.enum(['whatsapp', 'email']).optional().default('whatsapp'),
  fairHousingFlags: z.array(z.string()).optional(),
})

export const startConversationSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  initialMessage: z.string().optional(),
  channel: z.enum(['whatsapp', 'email']).optional().default('whatsapp'),
})

export const toggleAiIsaSchema = z.object({
  enabled: z.boolean(),
})
