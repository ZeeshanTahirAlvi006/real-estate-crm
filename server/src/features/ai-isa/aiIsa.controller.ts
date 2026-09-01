import { Request, Response, NextFunction } from 'express'
import {
  simulateAiIsaChat,
  getAiIsaConfig,
  updateAiIsaConfig,
  getQualificationCriteria,
  createQualificationCriteria,
  updateQualificationCriteria,
  deleteQualificationCriteria,
  getReactivationCampaigns,
  getCampaignById,
  createReactivationCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  getCampaignMetrics,
  executeCampaign,
  toggleCampaignStatus,
  getSpeedToLeadMetrics,
  initiateWhatsAppHandshake,
} from './aiIsa.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// AI ISA Config 

// GET /api/ai-isa/config
export const getConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const config = await getAiIsaConfig(req.user.brokerageId)
    sendSuccess(res, config, 'AI ISA configuration retrieved')
  } catch (error) { next(error) }
}

// PATCH /api/ai-isa/config
export const updateConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const config = await updateAiIsaConfig(req.user.brokerageId, req.body, req.user)
    sendSuccess(res, config, 'AI ISA configuration updated')
  } catch (error) { next(error) }
}

// ── Qualification Criteria ──────────────────────────────

// GET /api/ai-isa/qualification-criteria
export const getCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const criteria = await getQualificationCriteria(req.tenantFilter || {}, req.user)
    sendSuccess(res, criteria, 'Qualification criteria retrieved')
  } catch (error) { next(error) }
}

// POST /api/ai-isa/qualification-criteria
export const createCriteriaHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await createQualificationCriteria(req.body, req.user)
    sendSuccess(res, result, 'Qualification criteria created', HTTP_STATUS.CREATED)
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

// DELETE /api/ai-isa/qualification-criteria/:id
export const deleteCriteriaHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    await deleteQualificationCriteria(id, req.user)
    sendSuccess(res, null, 'Qualification criteria deleted')
  } catch (error) { next(error) }
}

// ── Reactivation Campaigns ──────────────────────────────

// GET /api/ai-isa/campaigns
export const getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaigns = await getReactivationCampaigns(req.tenantFilter || {}, req.user)
    sendSuccess(res, campaigns, 'Reactivation campaigns retrieved')
  } catch (error) { next(error) }
}

// GET /api/ai-isa/campaigns/:id
export const getCampaignByIdHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaign = await getCampaignById(req.params.id as string, req.user)
    sendSuccess(res, campaign, 'Campaign retrieved')
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

// PATCH /api/ai-isa/campaigns/:id
export const updateCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaign = await updateCampaign(req.params.id as string, req.body, req.user)
    sendSuccess(res, campaign, 'Campaign updated')
  } catch (error) { next(error) }
}

// DELETE /api/ai-isa/campaigns/:id
export const deleteCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    await deleteCampaign(req.params.id as string, req.user)
    sendSuccess(res, null, 'Campaign deleted')
  } catch (error) { next(error) }
}

// POST /api/ai-isa/campaigns/:id/start
export const startCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaign = await startCampaign(req.params.id as string, req.user)
    sendSuccess(res, campaign, 'Campaign activated')
  } catch (error) { next(error) }
}

// POST /api/ai-isa/campaigns/:id/pause
export const pauseCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const campaign = await pauseCampaign(req.params.id as string, req.user)
    sendSuccess(res, campaign, 'Campaign paused')
  } catch (error) { next(error) }
}

// GET /api/ai-isa/campaigns/:id/metrics
export const getCampaignMetricsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const metrics = await getCampaignMetrics(req.params.id as string, req.user)
    sendSuccess(res, metrics, 'Campaign metrics retrieved')
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

// ── Chat Simulation ─────────────────────────────────────

// POST /api/ai-isa/simulate
export const simulateChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await simulateAiIsaChat(req.body, req.user)
    sendSuccess(res, result, 'AI ISA response generated')
  } catch (error) { next(error) }
}

// ── Speed-to-Lead KPIs ──────────────────────────────────

// GET /api/ai-isa/speed-to-lead
export const getSpeedMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const metrics = await getSpeedToLeadMetrics(req.tenantFilter || {})
    sendSuccess(res, metrics, 'Speed-to-lead metrics retrieved')
  } catch (error) { next(error) }
}

// POST /api/ai-isa/test-whatsapp-handshake
export const testWhatsAppHandshakeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { phone, leadName } = req.body
    const result = await initiateWhatsAppHandshake(phone, leadName, req.user)
    sendSuccess(res, result, result.message)
  } catch (error) { next(error) }
}
