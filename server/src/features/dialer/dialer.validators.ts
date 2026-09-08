import { z } from 'zod'

export const saveDispositionSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  contactName: z.string().trim().min(1, 'Contact name is required'),
  contactPhone: z.string().trim().min(1, 'Contact phone is required'),
  durationSeconds: z.number().min(0).default(0),
  direction: z.enum(['inbound', 'outbound']).default('outbound'),
  disposition: z.enum([
    'interested',
    'showing_requested',
    'nurture_long_term',
    'wrong_number',
    'not_interested',
    'dnc_requested',
    'voicemail_left',
    'call_back_later',
    'no_answer',
  ]),
  notes: z.string().max(2000).optional(),
  recordingUrl: z.string().url().optional().or(z.literal('')),
  liveTranscript: z.string().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  aiSummary: z.string().optional(),
  linesUsed: z.number().int().min(1).max(5).default(1),
  lineIndex: z.number().int().min(0).max(4).default(0),
})

export const createVoicemailDropSchema = z.object({
  name: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  audioUrl: z.string().url('Valid audio URL is required'),
  durationSeconds: z.number().min(1).max(300).default(25),
  category: z.enum(['general', 'seller_equity', 'price_drop', 'followup']).default('followup'),
  isDefault: z.boolean().default(false),
})

export const enqueueContactsSchema = z.object({
  contactIds: z.array(z.string().min(1)).min(1, 'At least one contact ID is required'),
  priority: z.number().int().min(1).max(100).default(50),
})

export const matchLocalPresenceSchema = z.object({
  phone: z.string().min(3, 'Phone number or area code is required'),
})

export const startParallelSessionSchema = z.object({
  lineCount: z.union([z.literal(1), z.literal(3), z.literal(5)]).default(3),
  targets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
  ).min(1),
  useLocalPresence: z.boolean().default(true),
})

export const summarizeCallSchema = z.object({
  transcript: z.string().min(5),
  contactName: z.string().default('Prospect'),
  durationSeconds: z.number().default(60),
})
