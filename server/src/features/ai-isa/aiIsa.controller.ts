import { Request, Response, NextFunction } from 'express'
import {
  simulateAiIsaChat,
  getQualificationCriteria,
  updateQualificationCriteria,
  getReactivationCampaigns,
  createReactivationCampaign,
  executeCampaign,
  toggleCampaignStatus,
  getSpeedToLeadMetrics,
} from './aiIsa.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// POST /api/ai-isa/simulate
export const simulateChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await simulateAiIsaChat(req.body, req.user)
    sendSuccess(res, result, 'AI ISA response generated')
  } catch (error) { next(error) }
}

// GET /api/ai-isa/qualification-criteria
export const getCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const criteria = await getQualificationCriteria(req.tenantFilter || {}, req.user)
    sendSuccess(res, criteria, 'Qualification criteria retrieved')
  } catch (error) { next(error) }
}

// PUT /api/ai-isa/qualification-criteria/:id
export const updateCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const result = await updateQualificationCriteria(id, req.body, req.user)
    sendSuccess(res, result, 'Qualification criteria updated')
  } catch (error) { next(error) }
}

// GET /api/ai-isa/campaigns
export const getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaigns = await getReactivationCampaigns(req.tenantFilter || {}, req.user)
    sendSuccess(res, campaigns, 'Reactivation campaigns retrieved')
  } catch (error) { next(error) }
}

// POST /api/ai-isa/campaigns
export const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaign = await createReactivationCampaign(req.body, req.user)
    sendSuccess(res, campaign, 'Reactivation campaign created', HTTP_STATUS.CREATED)
  } catch (error) { next(error) }
}

// POST /api/ai-isa/campaigns/:id/execute
export const executeCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const result = await executeCampaign(id, req.user)
    sendSuccess(res, result, result.message)
  } catch (error) { next(error) }
}

// POST /api/ai-isa/campaigns/:id/toggle
export const toggleCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const result = await toggleCampaignStatus(id)
    sendSuccess(res, result, 'Campaign status updated')
  } catch (error) { next(error) }
}

// GET /api/ai-isa/speed-to-lead
export const getSpeedMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const metrics = await getSpeedToLeadMetrics(req.tenantFilter || {})
    sendSuccess(res, metrics, 'Speed-to-lead metrics retrieved')
  } catch (error) { next(error) }
}
