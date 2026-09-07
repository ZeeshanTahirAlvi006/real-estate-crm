import { z } from 'zod'

export const dncCheckSchema = z.object({
  body: z.object({
    phone: z.string().min(5, 'Phone number must be at least 5 characters').max(30),
  }),
})

export const recordConsentSchema = z.object({
  params: z.object({
    contactId: z.string().min(1, 'Contact ID is required'),
  }),
  body: z.object({
    sms: z.boolean().optional(),
    call: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    email: z.boolean().optional(),
    consentSource: z.enum(['web_form', 'lead_portal', 'verbal', 'inbound_sms', 'written']).optional(),
    optOutReason: z.string().max(300).optional(),
  }),
})

export const processOptOutSchema = z.object({
  body: z.object({
    phone: z.string().min(5, 'Phone number is required').max(30),
    channel: z.enum(['all', 'sms', 'call', 'whatsapp', 'email']).optional().default('all'),
    reason: z.string().max(300).optional(),
  }),
})

export const verifyOptInSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'Contact ID is required'),
    channel: z.enum(['sms', 'whatsapp']).optional().default('sms'),
  }),
})

export const confirmOptInSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'Contact ID is required'),
    code: z.string().length(6, 'Verification code must be exactly 6 digits'),
  }),
})

export const fairHousingScanSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Text content is required for scanning').max(10000),
  }),
})
