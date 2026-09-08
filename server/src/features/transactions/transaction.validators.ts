import { z } from 'zod'

export const createTransactionSchema = z.object({
  body: z.object({
    dealId: z.string().optional(),
    contactId: z.string().min(1, 'Contact ID is required'),
    propertyAddress: z.string().min(3, 'Property address is required').max(300),
    type: z.enum(['buyer', 'seller', 'dual']).default('buyer'),
    purchasePrice: z.number().positive('Purchase price must be greater than 0'),
    earnestMoney: z.number().nonnegative().optional().default(0),
    escrowCompany: z.string().max(150).optional(),
    escrowOfficer: z.string().max(100).optional(),
    escrowOfficerPhone: z.string().max(50).optional(),
    escrowOfficerEmail: z.string().email('Invalid escrow email').optional().or(z.literal('')),
    closingDate: z.string().min(1, 'Closing date is required'),
    contractDate: z.string().optional(),
    assignedAgentId: z.string().optional(),
    notes: z.string().max(5000).optional(),
  }),
})

export const convertDealSchema = z.object({
  params: z.object({
    dealId: z.string().min(1, 'Deal ID is required'),
  }),
  body: z.object({
    closingDate: z.string().min(1, 'Target closing date is required'),
    purchasePrice: z.number().positive().optional(),
    earnestMoney: z.number().nonnegative().optional(),
    escrowCompany: z.string().max(150).optional(),
    escrowOfficer: z.string().max(100).optional(),
    escrowOfficerPhone: z.string().max(50).optional(),
    escrowOfficerEmail: z.string().email('Invalid escrow email').optional().or(z.literal('')),
    type: z.enum(['buyer', 'seller', 'dual']).optional().default('buyer'),
    notes: z.string().max(5000).optional(),
  }),
})

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
  body: z.object({
    status: z.enum(['under_contract', 'pending', 'closed', 'cancelled']).optional(),
    purchasePrice: z.number().positive().optional(),
    earnestMoney: z.number().nonnegative().optional(),
    closingDate: z.string().optional(),
    escrowCompany: z.string().max(150).optional(),
    escrowOfficer: z.string().max(100).optional(),
    escrowOfficerPhone: z.string().max(50).optional(),
    escrowOfficerEmail: z.string().email('Invalid escrow email').optional().or(z.literal('')),
    notes: z.string().max(5000).optional(),
  }),
})

export const updateMilestoneSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
    milestoneId: z.string().min(1, 'Milestone ID is required'),
  }),
  body: z.object({
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    notes: z.string().max(2000).optional(),
    dueDate: z.string().optional(),
  }),
})

export const uploadDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction ID is required'),
  }),
  body: z.object({
    title: z.string().min(1, 'Document title is required').max(200),
    category: z.enum([
      'contract',
      'disclosure',
      'inspection_report',
      'appraisal',
      'title_commitment',
      'closing_disclosure',
      'other',
    ]).default('other'),
    fileUrl: z.string().min(1, 'File URL is required'),
    fileName: z.string().min(1, 'File name is required'),
    fileSize: z.number().optional().default(0),
    mimeType: z.string().optional().default('application/pdf'),
    clientVisible: z.boolean().optional().default(true),
  }),
})
