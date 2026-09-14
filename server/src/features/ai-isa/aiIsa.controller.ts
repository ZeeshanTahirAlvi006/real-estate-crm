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
  aiIsaConfigL1Cache,
  criteriaL1Cache,
  campaignsL1Cache,
  campaignDetailL1Cache,
  campaignMetricsL1Cache,
  speedMetricsL1Cache,
} from './aiIsa.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'

// Helper for timing and header injection
const recordTelemetry = (res: Response, startTime: bigint, handlerName: string, cacheHit?: boolean) => {
  const deltaMs = Number(process.hrtime.bigint() - startTime) / 1e6
  res.setHeader('X-Response-Time', `${deltaMs.toFixed(3)}ms`)
  if (cacheHit !== undefined) {
    res.setHeader('X-Cache', cacheHit ? 'L1-HIT' : 'MISS')
  }
  setImmediate(() => {
    console.log(`[AI ISA Controller Timer] ${handlerName} executed in ${deltaMs.toFixed(3)}ms`)
  })
}

// ── AI ISA Config ───────────────────────────────────────

// GET /api/ai-isa/config
export const getConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = aiIsaConfigL1Cache.has(`cfg:${req.user.brokerageId}`)
    const config = await getAiIsaConfig(req.user.brokerageId)
    recordTelemetry(res, t0, 'getConfigHandler', isCached)
    sendSuccess(res, config, 'AI ISA configuration retrieved')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/ai-isa/config
export const updateConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const config = await updateAiIsaConfig(req.user.brokerageId, req.body, req.user)
    recordTelemetry(res, t0, 'updateConfigHandler')
    sendSuccess(res, config, 'AI ISA configuration updated')
  } catch (error) {
    next(error)
  }
}

// ── Qualification Criteria ──────────────────────────────

// GET /api/ai-isa/qualification-criteria
export const getCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = criteriaL1Cache.has(`crit:${req.user.brokerageId}`)
    const criteria = await getQualificationCriteria(req.tenantFilter || {}, req.user)
    recordTelemetry(res, t0, 'getCriteria', isCached)
    sendSuccess(res, criteria, 'Qualification criteria retrieved')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/qualification-criteria
export const createCriteriaHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const result = await createQualificationCriteria(req.body, req.user)
    recordTelemetry(res, t0, 'createCriteriaHandler')
    sendSuccess(res, result, 'Qualification criteria created', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PUT /api/ai-isa/qualification-criteria/:id
export const updateCriteria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const id = req.params.id as string
    const result = await updateQualificationCriteria(id, req.body, req.user)
    recordTelemetry(res, t0, 'updateCriteria')
    sendSuccess(res, result, 'Qualification criteria updated')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/ai-isa/qualification-criteria/:id
export const deleteCriteriaHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const id = req.params.id as string
    await deleteQualificationCriteria(id, req.user)
    recordTelemetry(res, t0, 'deleteCriteriaHandler')
    sendSuccess(res, null, 'Qualification criteria deleted')
  } catch (error) {
    next(error)
  }
}

// ── Reactivation Campaigns ──────────────────────────────

// GET /api/ai-isa/campaigns
export const getCampaigns = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = campaignsL1Cache.has(`camps:${req.user.brokerageId}`)
    const campaigns = await getReactivationCampaigns(req.tenantFilter || {}, req.user)
    recordTelemetry(res, t0, 'getCampaigns', isCached)
    sendSuccess(res, campaigns, 'Reactivation campaigns retrieved')
  } catch (error) {
    next(error)
  }
}

// GET /api/ai-isa/campaigns/:id
export const getCampaignByIdHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = campaignDetailL1Cache.has(`camp:${req.params.id}`)
    const campaign = await getCampaignById(req.params.id as string, req.user)
    recordTelemetry(res, t0, 'getCampaignByIdHandler', isCached)
    sendSuccess(res, campaign, 'Campaign retrieved')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/campaigns
export const createCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const campaign = await createReactivationCampaign(req.body, req.user)
    recordTelemetry(res, t0, 'createCampaign')
    sendSuccess(res, campaign, 'Reactivation campaign created', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/ai-isa/campaigns/:id
export const updateCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const campaign = await updateCampaign(req.params.id as string, req.body, req.user)
    recordTelemetry(res, t0, 'updateCampaignHandler')
    sendSuccess(res, campaign, 'Campaign updated')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/ai-isa/campaigns/:id
export const deleteCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    await deleteCampaign(req.params.id as string, req.user)
    recordTelemetry(res, t0, 'deleteCampaignHandler')
    sendSuccess(res, null, 'Campaign deleted')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/campaigns/:id/start
export const startCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const campaign = await startCampaign(req.params.id as string, req.user)
    recordTelemetry(res, t0, 'startCampaignHandler')
    sendSuccess(res, campaign, 'Campaign activated')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/campaigns/:id/pause
export const pauseCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const campaign = await pauseCampaign(req.params.id as string, req.user)
    recordTelemetry(res, t0, 'pauseCampaignHandler')
    sendSuccess(res, campaign, 'Campaign paused')
  } catch (error) {
    next(error)
  }
}

// GET /api/ai-isa/campaigns/:id/metrics
export const getCampaignMetricsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = campaignMetricsL1Cache.has(`metrics:${req.params.id}`)
    const metrics = await getCampaignMetrics(req.params.id as string, req.user)
    recordTelemetry(res, t0, 'getCampaignMetricsHandler', isCached)
    sendSuccess(res, metrics, 'Campaign metrics retrieved')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/campaigns/:id/execute
export const executeCampaignHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const id = req.params.id as string
    const result = await executeCampaign(id, req.user)
    recordTelemetry(res, t0, 'executeCampaignHandler')
    sendSuccess(res, result, result.message)
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/campaigns/:id/toggle
export const toggleCampaign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const id = req.params.id as string
    const result = await toggleCampaignStatus(id, req.user)
    recordTelemetry(res, t0, 'toggleCampaign')
    sendSuccess(res, result, 'Campaign status updated')
  } catch (error) {
    next(error)
  }
}

// ── Chat Simulation ─────────────────────────────────────

// POST /api/ai-isa/simulate
export const simulateChat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const result = await simulateAiIsaChat(req.body, req.user)
    recordTelemetry(res, t0, 'simulateChat')
    sendSuccess(res, result, 'AI ISA response generated')
  } catch (error) {
    next(error)
  }
}

// ── Speed-to-Lead KPIs ──────────────────────────────────

// GET /api/ai-isa/speed-to-lead
export const getSpeedMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const isCached = speedMetricsL1Cache.has(`speed:${req.tenantFilter?.brokerageId}`)
    const metrics = await getSpeedToLeadMetrics(req.tenantFilter || {})
    recordTelemetry(res, t0, 'getSpeedMetrics', isCached)
    sendSuccess(res, metrics, 'Speed-to-lead metrics retrieved')
  } catch (error) {
    next(error)
  }
}

// POST /api/ai-isa/test-whatsapp-handshake
export const testWhatsAppHandshakeHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { phone, leadName } = req.body
    const result = await initiateWhatsAppHandshake(phone, leadName, req.user)
    recordTelemetry(res, t0, 'testWhatsAppHandshakeHandler')
    sendSuccess(res, result, result.message)
  } catch (error) {
    next(error)
  }
}
