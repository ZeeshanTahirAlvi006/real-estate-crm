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
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../utils/constants.js'
import { measureExecutionMs } from '../../utils/cacheHelper.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/pipelines
export const list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { pipelines, source } = await listPipelines(req.tenantFilter || {})
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:list] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader}, count: ${pipelines.length})`)
    sendSuccess(res, pipelines, 'Pipelines retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/pipelines/:id
export const get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { pipeline, source } = await getPipelineById(req.params.id as string, req.user)
    const cacheHeader = source === 'l1' ? 'L1-HIT' : source === 'l2' ? 'L2-HIT' : 'MISS'
    res.setHeader('X-Cache', cacheHeader)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:get] ${elapsed.toFixed(3)}ms (cache: ${cacheHeader}, id: ${pipeline.id})`)
    sendSuccess(res, pipeline, 'Pipeline retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/pipelines
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await createPipeline(req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:create] ${elapsed.toFixed(3)}ms (id: ${pipeline.id})`)
    sendSuccess(res, pipeline, 'Pipeline created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updatePipeline(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:update] ${elapsed.toFixed(3)}ms (id: ${pipeline.id})`)
    sendSuccess(res, pipeline, 'Pipeline updated successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/pipelines/:id
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    await deletePipeline(req.params.id as string, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:remove] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, null, 'Pipeline deleted successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/pipelines/:id/stages
export const createStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await addStage(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:createStage] ${elapsed.toFixed(3)}ms (stageCount: ${pipeline.stages.length})`)
    sendSuccess(res, pipeline, 'Stage added successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id/stages/:stageId
export const patchStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await updateStage(
      req.params.id as string,
      req.params.stageId as string,
      req.body,
      req.user,
      clientIp,
      userAgent
    )
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:patchStage] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stage updated successfully')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/pipelines/:id/stages/reorder
export const patchReorder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await reorderStages(req.params.id as string, req.body, req.user, clientIp, userAgent)
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:patchReorder] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stages reordered successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/pipelines/:id/stages/:stageId
export const removeStage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    if (!req.user) {
      sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      return
    }
    const { clientIp, userAgent } = getClientMeta(req)
    const pipeline = await deleteStage(
      req.params.id as string,
      req.params.stageId as string,
      req.user,
      clientIp,
      userAgent
    )
    const elapsed = measureExecutionMs(t0)
    res.setHeader('X-Response-Time', `${elapsed.toFixed(3)}ms`)
    console.log(`[PIPELINE-PERF][controller:removeStage] ${elapsed.toFixed(3)}ms`)
    sendSuccess(res, pipeline, 'Stage deleted successfully')
  } catch (error) {
    next(error)
  }
}
