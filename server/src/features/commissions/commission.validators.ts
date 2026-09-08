import { z } from 'zod'

const deductionInputSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
})

export const calculateCommissionSchema = z.object({
  salePrice: z.number().positive('Sale price must be a positive number'),
  commissionRate: z.number().min(0).max(100).optional().default(3.0),
  splitModel: z.enum(['fixed', 'tiered', 'capped']).optional().default('fixed'),
  splitPercentAgent: z.number().min(0).max(100).optional().default(80),
  franchiseFeePercent: z.number().min(0).max(100).optional().default(6.0),
  tcFee: z.number().min(0).optional().default(395),
  eoInsuranceFee: z.number().min(0).optional().default(150),
  deskFee: z.number().min(0).optional().default(100),
  referralFeePercent: z.number().min(0).max(100).optional().default(0),
  agentId: z.string().optional(),
  capThreshold: z.number().min(0).optional().default(18000),
  customDeductions: z.array(deductionInputSchema).optional().default([]),
})

export const createCommissionSchema = z.object({
  transactionId: z.string().optional(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  agentId: z.string().min(1, 'Agent ID is required'),
  salePrice: z.number().positive('Sale price must be a positive number'),
  commissionRate: z.number().min(0).max(100).optional().default(3.0),
  splitModel: z.enum(['fixed', 'tiered', 'capped']).optional().default('fixed'),
  splitPercentAgent: z.number().min(0).max(100).optional().default(80),
  franchiseFeePercent: z.number().min(0).max(100).optional().default(6.0),
  tcFee: z.number().min(0).optional().default(395),
  eoInsuranceFee: z.number().min(0).optional().default(150),
  deskFee: z.number().min(0).optional().default(100),
  referralFeePercent: z.number().min(0).max(100).optional().default(0),
  capThreshold: z.number().min(0).optional().default(18000),
  customDeductions: z.array(deductionInputSchema).optional().default([]),
  settlementDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'paid']).optional().default('draft'),
})

export const updateCommissionStatusSchema = z.object({
  status: z.enum(['draft', 'pending_approval', 'approved', 'paid']),
  notes: z.string().max(1000).optional(),
})
