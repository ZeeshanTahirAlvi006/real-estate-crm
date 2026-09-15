import { Request, Response, NextFunction } from 'express'
import { commissionService } from './commission.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { IUser } from '../../models/User.js'
import { GENERIC_AUTH_MESSAGES, HTTP_STATUS } from '../../utils/constants.js'

export class CommissionController {
  async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.calculate(user, req.body)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:calculate] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission calculated successfully')
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.create(user, req.body)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:create] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission record created successfully', 201)
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.list(user, req.query as any)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:list] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commissions retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.getById(user, req.params.id as string)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:getById] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission details retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const { status, notes } = req.body
      const result = await commissionService.updateStatus(user, req.params.id as string, status, notes)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:updateStatus] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission status updated successfully')
    } catch (err) {
      next(err)
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const { startDate, endDate } = req.query
      const result = await commissionService.getReport(
        user,
        startDate as string | undefined,
        endDate as string | undefined
      )
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:getReport] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission performance report generated successfully')
    } catch (err) {
      next(err)
    }
  }

  async getCapSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.getCapSettings(user)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:getCapSettings] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Commission cap settings retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async updateBrokerageCap(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.updateBrokerageCap(user, req.body)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:updateBrokerageCap] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Brokerage commission cap updated successfully')
    } catch (err) {
      next(err)
    }
  }

  async updateAgentCap(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
        return
      }
      const user = req.user as IUser
      const result = await commissionService.updateAgentCap(user, req.params.agentId as string, req.body)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`)
      console.log(`[COMMISSION-PERF][controller:updateAgentCap] ${durationMs.toFixed(3)}ms`)
      sendSuccess(res, result, 'Agent commission cap updated successfully')
    } catch (err) {
      next(err)
    }
  }
}

export const commissionController = new CommissionController()
