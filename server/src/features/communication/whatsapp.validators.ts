import { z } from 'zod'

export const sendWhatsAppSchema = z.object({
  contactId: z.string().optional(),
  toPhone: z.string().optional(),
  conversationId: z.string().optional(),
  type: z.enum(['text', 'template', 'media']).default('text'),
  text: z.string().max(4096).optional(),
  templateName: z.string().optional(),
  languageCode: z.string().default('en_US'),
  templateVariables: z.record(z.any()).optional(),
  mediaType: z.enum(['image', 'document', 'audio', 'video']).optional(),
  mediaUrl: z.string().optional(),
  caption: z.string().max(1024).optional(),
})

export const createWhatsAppTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  title: z.string().min(2).max(150),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).default('UTILITY'),
  language: z.string().default('en_US'),
  headerType: z.enum(['TEXT', 'IMAGE', 'DOCUMENT', 'VIDEO', 'NONE']).default('NONE'),
  headerText: z.string().max(60).optional(),
  bodyText: z.string().min(5).max(1024),
  footerText: z.string().max(60).optional(),
  buttons: z
    .array(
      z.object({
        type: z.enum(['QUICK_REPLY', 'URL', 'PHONE_NUMBER']),
        text: z.string().max(25),
        url: z.string().url().optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .optional(),
  variables: z.array(z.string()).default([]),
})

export const createWhatsAppBroadcastSchema = z.object({
  title: z.string().min(3).max(120),
  templateName: z.string().min(2),
  targetAudience: z.enum(['all', 'dormant', 'high_score', 'buyers', 'sellers', 'custom_tag']).default('all'),
  targetTag: z.string().optional(),
  customVariables: z.record(z.any()).optional(),
})
