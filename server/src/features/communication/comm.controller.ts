import { Request, Response } from 'express'
import { commService, QUICK_TEMPLATES } from './comm.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { v4 as uuidv4 } from 'uuid'

export const sendUnifiedHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id
    const brokerageId = (req as any).effectiveBrokerageId || req.user?.brokerageId
    const senderName = `${req.user?.firstName || 'Agent'} ${req.user?.lastName || ''}`.trim()

    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const result = await commService.sendUnifiedMessage(req.body, userId, brokerageId, senderName)
    sendSuccess(res, result, `Message dispatched successfully via ${req.body.channel.toUpperCase()}`, HTTP_STATUS.CREATED)
  } catch (err: any) {
    sendError(res, err.message || 'Failed to dispatch message', err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const optOutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || req.user?.brokerageId
    const userId = req.user?.id
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const result = await commService.optOut(req.body, brokerageId, userId)
    sendSuccess(res, result, result.message)
  } catch (err: any) {
    sendError(res, err.message || 'Failed to process opt-out', err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const optBackInHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || req.user?.brokerageId
    const userId = req.user?.id
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const result = await commService.optBackIn(req.body, brokerageId, userId)
    sendSuccess(res, result, result.message)
  } catch (err: any) {
    sendError(res, err.message || 'Failed to process re-consent', err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const getQuickTemplatesHandler = (req: Request, res: Response): void => {
  const channel = req.query.channel as string
  const templates = commService.getQuickTemplates(channel)
  sendSuccess(res, templates, 'Quick reply templates retrieved successfully')
}

export const createQuickTemplateHandler = (req: Request, res: Response): void => {
  const newTemplate = {
    id: `tmpl-${uuidv4().substring(0, 8)}`,
    ...req.body,
  }
  QUICK_TEMPLATES.push(newTemplate)
  sendSuccess(res, newTemplate, 'Quick reply template created successfully', HTTP_STATUS.CREATED)
}
