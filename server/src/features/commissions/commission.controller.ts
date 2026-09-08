import { Request, Response, NextFunction } from 'express'
import { commissionService } from './commission.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { IUser } from '../../models/User.js'

export class CommissionController {
  async calculate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await commissionService.calculate(user, req.body)
      sendSuccess(res, result, 'Commission calculated successfully')
    } catch (err) {
      next(err)
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await commissionService.create(user, req.body)
      sendSuccess(res, result, 'Commission record created successfully', 201)
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await commissionService.list(user, req.query as any)
      sendSuccess(res, result, 'Commissions retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await commissionService.getById(user, req.params.id as string)
      sendSuccess(res, result, 'Commission details retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const { status, notes } = req.body
      const result = await commissionService.updateStatus(user, req.params.id as string, status, notes)
      sendSuccess(res, result, 'Commission status updated successfully')
    } catch (err) {
      next(err)
    }
  }

  async getReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const { startDate, endDate } = req.query
      const result = await commissionService.getReport(
        user,
        startDate as string | undefined,
        endDate as string | undefined
      )
      sendSuccess(res, result, 'Commission performance report generated successfully')
    } catch (err) {
      next(err)
    }
  }
}

export const commissionController = new CommissionController()
