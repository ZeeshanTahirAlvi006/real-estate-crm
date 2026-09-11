import { Request, Response, NextFunction } from 'express'
import {
  createLeadSource,
  listLeadSources,
  getLeadSourceById,
  updateLeadSource,
  deleteLeadSource,
  rotateWebhookSecret,
  createRoutingRule,
  listRoutingRules,
  getRoutingRuleById,
  updateRoutingRule,
  deleteRoutingRule,
  getScoringConfig,
  updateScoringConfig,
  ingestWebhookLead,
  ingestCaptureWidgetLead,
  ingestManualLead,
  acknowledgeLeads,
} from './lead.service.js'
import { sendSuccess, sendPaginated, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { logger } from '../../utils/logger.js'

// Helper to extract IP and user-agent
const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// ── LeadSource Controllers ──

export const createLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const source = await createLeadSource(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, source, 'Lead source created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

export const listLeadSourcesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      logger.warn('[listLeadSourcesHandler] No req.user found')
      sendError(res, 'Unauthorized', HTTP_STATUS.UNAUTHORIZED)
      return
    }
    logger.info('[listLeadSourcesHandler] req.query: %o, user: %s, tenantFilter: %o', req.query, req.user._id, req.tenantFilter)
    const { leadSources, total } = await listLeadSources(req.query, req.user, req.tenantFilter || {})
    logger.info('[listLeadSourcesHandler] Returning total: %d, items: %d', total, leadSources.length)
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, leadSources, total, page, limit, 'Lead sources retrieved successfully')
  } catch (error) {
    logger.error('[listLeadSourcesHandler] Error:', error)
    next(error)
  }
}

export const getLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    // Owner+ can see the decrypted secret
    const includeSecret = req.query.includeSecret === 'true'
    const source = await getLeadSourceById(req.params.id as string, req.user, includeSecret)
    sendSuccess(res, source, 'Lead source retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const source = await updateLeadSource(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, source, 'Lead source updated successfully')
  } catch (error) {
    next(error)
  }
}

export const deleteLeadSourceHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteLeadSource(req.params.id as string, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Lead source deleted successfully')
  } catch (error) {
    next(error)
  }
}

export const rotateSecretHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await rotateWebhookSecret(req.params.id as string, req.user, clientIp, userAgent)
    sendSuccess(res, result, 'Webhook secret rotated successfully')
  } catch (error) {
    next(error)
  }
}

// ── RoutingRule Controllers ──

export const createRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const rule = await createRoutingRule(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, rule, 'Routing rule created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

export const listRoutingRulesHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { routingRules, total } = await listRoutingRules(req.query, req.user, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, routingRules, total, page, limit, 'Routing rules retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const getRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const rule = await getRoutingRuleById(req.params.id as string, req.user)
    sendSuccess(res, rule, 'Routing rule retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const rule = await updateRoutingRule(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, rule, 'Routing rule updated successfully')
  } catch (error) {
    next(error)
  }
}

export const deleteRoutingRuleHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteRoutingRule(req.params.id as string, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Routing rule deleted successfully')
  } catch (error) {
    next(error)
  }
}

// ── ScoringConfig Controllers ──

export const getScoringConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const config = await getScoringConfig(req.user)
    sendSuccess(res, config, 'Scoring configuration retrieved successfully')
  } catch (error) {
    next(error)
  }
}

export const updateScoringConfigHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const config = await updateScoringConfig(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, config, 'Scoring configuration updated successfully')
  } catch (error) {
    next(error)
  }
}

// ── Lead Ingestion Controllers ──

export const webhookIngestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sourceId = (req.query.sourceId as string) || (req.headers['x-source-id'] as string)
    if (!sourceId) {
      sendError(res, 'Lead source ID is required (query param sourceId or header X-Source-Id)', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const signature = req.headers['x-webhook-signature'] as string | undefined

    // Extract API key from x-api-key, Authorization: Bearer, or query param
    let apiKey = req.headers['x-api-key'] as string | undefined
    if (!apiKey) {
      const authHeader = req.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.slice(7).trim()
      }
    }
    if (!apiKey && req.query.apiKey) {
      apiKey = req.query.apiKey as string
    }

    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'

    const result = await ingestWebhookLead(req.body, rawBody, signature, sourceId, clientIp, apiKey)
    sendSuccess(
      res,
      { contactId: result.contact.id, isNew: result.isNew, routed: result.routingResult.matched },
      result.isNew ? 'Lead ingested successfully' : 'Lead reinquiry recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const captureWidgetHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1'
    const result = await ingestCaptureWidgetLead(req.body, clientIp)
    sendSuccess(
      res,
      { contactId: result.contact.id, isNew: result.isNew },
      result.isNew ? 'Thank you for your inquiry!' : 'Your inquiry has been recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const manualLeadEntryHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await ingestManualLead(req.body, req.user, clientIp, userAgent)
    sendSuccess(
      res,
      result.contact,
      result.isNew ? 'Lead created and routed successfully' : 'Lead reinquiry recorded',
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    next(error)
  }
}

export const acknowledgeLeadsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await acknowledgeLeads(req.body.contactIds, req.user, clientIp, userAgent)
    sendSuccess(res, result, `${result.acknowledgedCount} lead(s) acknowledged successfully`)
  } catch (error) {
    next(error)
  }
}
