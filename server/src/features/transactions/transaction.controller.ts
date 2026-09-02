import { Request, Response } from 'express'
import { transactionService } from './transaction.service.js'
import { logger } from '../../utils/logger.js'

export class TransactionController {
  async convertDeal(req: Request, res: Response): Promise<void> {
    try {
      const dealId = String(req.params.dealId)
      const user = (req as any).user
      const transaction = await transactionService.convertDealToTransaction(
        dealId,
        req.body,
        {
          id: user.userId || user.id,
          name: `${user.firstName || 'Agent'} ${user.lastName || ''}`.trim(),
          role: user.role,
          brokerageId: user.brokerageId?.toString() || user.brokerageId,
        }
      )

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Deal converted to escrow transaction successfully',
      })
    } catch (err: any) {
      logger.error(`[TransactionController.convertDeal] Error: ${err.message}`)
      res.status(err.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: err.message,
      })
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user
      const transaction = await transactionService.createTransaction(req.body, {
        id: user.userId || user.id,
        name: `${user.firstName || 'Agent'} ${user.lastName || ''}`.trim(),
        role: user.role,
        brokerageId: user.brokerageId?.toString() || user.brokerageId,
      })

      res.status(201).json({
        success: true,
        data: transaction,
      })
    } catch (err: any) {
      logger.error(`[TransactionController.create] Error: ${err.message}`)
      res.status(400).json({
        success: false,
        message: err.message,
      })
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user
      const result = await transactionService.listTransactions(req.query as any, {
        id: user.userId || user.id,
        role: user.role,
        brokerageId: user.brokerageId?.toString() || user.brokerageId,
      })

      res.json({
        success: true,
        data: result.transactions,
        meta: {
          total: result.total,
          metrics: result.metrics,
        },
      })
    } catch (err: any) {
      logger.error(`[TransactionController.list] Error: ${err.message}`)
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transactions',
      })
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const user = (req as any).user
      const transaction = await transactionService.getTransactionById(id, {
        id: user.userId || user.id,
        role: user.role,
        brokerageId: user.brokerageId?.toString() || user.brokerageId,
      })

      res.json({
        success: true,
        data: transaction,
      })
    } catch (err: any) {
      res.status(404).json({
        success: false,
        message: err.message || 'Transaction not found',
      })
    }
  }

  async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const milestoneId = String(req.params.milestoneId)
      const user = (req as any).user
      const transaction = await transactionService.updateMilestone(
        id,
        milestoneId,
        req.body,
        {
          id: user.userId || user.id,
          name: `${user.firstName || 'Agent'} ${user.lastName || ''}`.trim(),
          role: user.role,
          brokerageId: user.brokerageId?.toString() || user.brokerageId,
        }
      )

      res.json({
        success: true,
        data: transaction,
        message: 'Milestone updated successfully',
      })
    } catch (err: any) {
      logger.error(`[TransactionController.updateMilestone] Error: ${err.message}`)
      res.status(400).json({
        success: false,
        message: err.message,
      })
    }
  }

  async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const user = (req as any).user
      const transaction = await transactionService.addDocument(id, req.body, {
        id: user.userId || user.id,
        name: `${user.firstName || 'Agent'} ${user.lastName || ''}`.trim(),
        role: user.role,
        brokerageId: user.brokerageId?.toString() || user.brokerageId,
      })

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Document attached successfully',
      })
    } catch (err: any) {
      logger.error(`[TransactionController.uploadDocument] Error: ${err.message}`)
      res.status(400).json({
        success: false,
        message: err.message,
      })
    }
  }

  async removeDocument(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id)
      const docId = String(req.params.docId)
      const user = (req as any).user
      const transaction = await transactionService.removeDocument(id, docId, {
        id: user.userId || user.id,
        role: user.role,
        brokerageId: user.brokerageId?.toString() || user.brokerageId,
      })

      res.json({
        success: true,
        data: transaction,
        message: 'Document removed successfully',
      })
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message,
      })
    }
  }

  async getPortalTransaction(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user
      const transaction = await transactionService.getClientPortalTransaction(user)

      res.json({
        success: true,
        data: transaction,
      })
    } catch (err: any) {
      logger.error(`[TransactionController.getPortalTransaction] Error: ${err.message}`)
      res.status(500).json({
        success: false,
        message: 'Failed to fetch portal transaction',
      })
    }
  }
}

export const transactionController = new TransactionController()
