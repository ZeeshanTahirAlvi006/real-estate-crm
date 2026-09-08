import { z } from 'zod'

export const sendUnifiedSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp', 'voice']),
  to: z.string().min(1, 'Recipient address or phone is required'),
  text: z.string().min(1, 'Message text is required'),
  subject: z.string().optional(),
  html: z.string().optional(),
  contactId: z.string().optional(),
  conversationId: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'document', 'audio', 'video']).optional(),
  templateName: z.string().optional(),
  templateVariables: z.record(z.string()).optional(),
})

export const optOutSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contactId: z.string().optional(),
  reason: z.string().optional(),
}).refine((data) => data.phone || data.email || data.contactId, {
  message: 'At least one of phone, email, or contactId must be provided to opt-out',
})

export const optBackInSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  contactId: z.string().optional(),
}).refine((data) => data.phone || data.email || data.contactId, {
  message: 'At least one of phone, email, or contactId must be provided to re-consent',
})

export const createQuickTemplateSchema = z.object({
  title: z.string().min(2, 'Template title is required'),
  channel: z.enum(['all', 'email', 'sms', 'whatsapp']),
  category: z.string().default('general'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Template body is required'),
  variables: z.array(z.string()).default([]),
})
