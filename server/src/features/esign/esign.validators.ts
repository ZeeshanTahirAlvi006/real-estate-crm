import { z } from 'zod'

const signerInputSchema = z.object({
  name: z.string().min(1, 'Signer name is required').trim(),
  email: z.string().email('Valid signer email is required').trim().toLowerCase(),
  role: z.enum(['buyer', 'seller', 'agent', 'broker', 'witness']).optional().default('buyer'),
})

const fieldInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox']),
  signerEmail: z.string().email('Valid signer email required for field').trim().toLowerCase(),
  page: z.number().int().min(1).default(1),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100).optional().default(20),
  height: z.number().min(1).max(50).optional().default(6),
  required: z.boolean().optional().default(true),
  label: z.string().optional().default('Signature'),
  value: z.string().optional(),
})

export const prepareEnvelopeSchema = z.object({
  transactionId: z.string().optional(),
  dealId: z.string().optional(),
  title: z.string().min(1, 'Envelope title is required').max(200),
  documentUrl: z.string().min(1, 'Document URL or path is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().min(0).optional().default(0),
  pageCount: z.number().int().min(1).optional().default(1),
  signers: z.array(signerInputSchema).min(1, 'At least one signer is required'),
  fields: z.array(fieldInputSchema).min(1, 'At least one field tag is required'),
  sendImmediately: z.boolean().optional().default(true),
})

export const submitSignatureSchema = z.object({
  signatureData: z.string().min(1, 'Signature data is required'),
  fields: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.string(),
    })
  ).optional().default([]),
})

export const declineSigningSchema = z.object({
  reason: z.string().min(1, 'Decline reason is required').max(500),
})
