import { Request, Response, NextFunction } from 'express'
import {
  createPipeline,
  listPipelines,
  getPipelineById,
  updatePipeline,
  deletePipeline,
  addStage,
  updateStage,
  reorderStages,
  deleteStage,
} from './pipeline.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/pipelines
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const pipelines = await listPipelines(req.tenantFilter || {})
    sendSuccess(res, pipelines, 'Pipelines retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/pipelines/:id
export const get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const pipeline = await getPipelineById(req.params.id as string, req.user)
    sendSuccess(res, pipeline, 'Pipeline retrieved successfully')
  } catch (error) { next(error) }
}

// POST /api/pipelines
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await createPipeline(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Pipeline created successfully', HTTP_STATUS.CREATED)
  } catch (error) { next(error) }
}

// PATCH /api/pipelines/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updatePipeline(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Pipeline updated successfully')
  } catch (error) { next(error) }
}

// DELETE /api/pipelines/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    await deletePipeline(req.params.id as string, req.user, clientIp, userAgent)
    sendSuccess(res, null, 'Pipeline deleted successfully')
  } catch (error) { next(error) }
}

// POST /api/pipelines/:id/stages
export const createStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await addStage(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Stage added successfully', HTTP_STATUS.CREATED)
  } catch (error) { next(error) }
}

// PATCH /api/pipelines/:id/stages/:stageId
export const patchStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updateStage(req.params.id as string, req.params.stageId as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Stage updated successfully')
  } catch (error) { next(error) }
}

// PATCH /api/pipelines/:id/stages/reorder
export const patchReorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await reorderStages(req.params.id as string, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Stages reordered successfully')
  } catch (error) { next(error) }
}

// DELETE /api/pipelines/:id/stages/:stageId
export const removeStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await deleteStage(req.params.id as string, req.params.stageId as string, req.user, clientIp, userAgent)
    sendSuccess(res, pipeline, 'Stage deleted successfully')
  } catch (error) { next(error) }
}
