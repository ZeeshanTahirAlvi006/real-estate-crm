import { Request, Response, NextFunction } from 'express'
import {
  createDeal,
  listDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  moveDealStage,
  getKanbanData,
  getStageDeals,
  getMultipleStageDeals,
} from './deal.service.js'
import { sendSuccess, sendPaginated } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/deals
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { deals, total } = await listDeals(req.query as any, req.user, req.tenantFilter || {})
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    sendPaginated(res, deals, total, page, limit, 'Deals retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/deals/kanban/:pipelineId
export const kanban = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const stageId = req.query.stageId as string | undefined
    const includeDeals = req.query.includeDeals !== undefined ? req.query.includeDeals !== 'false' : undefined
    const data = await getKanbanData(
      req.params.pipelineId as string,
      req.user,
      req.tenantFilter || {},
      { stageId, includeDeals }
    )
    sendSuccess(res, data, 'Kanban data retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/deals/:id
export const get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const deal = await getDealById(req.params.id as string, req.user)
    sendSuccess(res, deal, 'Deal retrieved successfully')
  } catch (error) { next(error) }
}

// POST /api/deals
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const deal = await createDeal(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, deal, 'Deal created successfully', HTTP_STATUS.CREATED)
  } catch (error) { next(error) }
}

// PATCH /api/deals/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const deal = await updateDeal(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, deal, 'Deal updated successfully')
  } catch (error) { next(error) }
}

// PATCH /api/deals/:id/stage
export const moveStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const deal = await moveDealStage(req.params.id as string, { newStageId: req.body.stageId }, req.user, clientIp, userAgent)
    sendSuccess(res, deal, 'Deal stage updated successfully')
  } catch (error) { next(error) }
}

// DELETE /api/deals/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    await deleteDeal(req.params.id as string, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Deal archived successfully')
  } catch (error) { next(error) }
}

// GET /api/deals/stage/:stageId — Fetch deals for a single stage
export const stageDealsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const pipelineId = req.query.pipelineId as string | undefined
    const data = await getStageDeals(
      req.params.stageId as string,
      req.user,
      req.tenantFilter || {},
      pipelineId
    )
    sendSuccess(res, data, 'Stage deals retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/deals/stages — Batch-fetch deals for multiple stages
export const multipleStageDealsHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const stageIdsParam = req.query.stageIds as string | undefined
    const pipelineId = req.query.pipelineId as string | undefined
    if (!stageIdsParam) {
      sendSuccess(res, [], 'No stage IDs provided')
      return
    }
    const stageIds = stageIdsParam.split(',').map((id) => id.trim()).filter(Boolean)
    const data = await getMultipleStageDeals(stageIds, req.user, req.tenantFilter || {}, pipelineId)
    sendSuccess(res, data, 'Multiple stage deals retrieved successfully')
  } catch (error) { next(error) }
}
