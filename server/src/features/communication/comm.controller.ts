import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { commService } from './comm.service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { Conversation } from '../../models/Conversation.js'
import { IUser } from '../../models/User.js'
import { v4 as uuidv4 } from 'uuid'
import { assertSuperAdminCanContact } from './commGuard.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { QuickTemplateDto } from './comm.types.js'

export const customTemplatesCache = new BoundedLruCache<QuickTemplateDto>(200, 3600)

export const sendUnifiedHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = req.user
    const userId = caller?.id
    const brokerageId = caller?.brokerageId?.toString()
    const senderName = `${caller?.firstName || 'Agent'} ${caller?.lastName || ''}`.trim()

    // 1. First enforce Super Admin multi-tenant isolation guard (must precede brokerageId existence check)
    if (caller) {
      await assertSuperAdminCanContact(caller as IUser, {
        contactId: req.body.contactId,
        to: req.body.to,
        conversationId: req.body.conversationId,
      })
    }

    // 2. Enforce brokerageId presence for standard tenant processing
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    // 3. Verify conversation assignment if conversationId is provided (Super Admin cannot speak for other agents)
    if (caller?.role === USER_ROLES.SUPER_ADMIN && req.body.conversationId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.conversationId)) {
        sendError(res, 'Invalid conversation ID format', HTTP_STATUS.BAD_REQUEST)
        return
      }
      const convObjectId = new mongoose.Types.ObjectId(req.body.conversationId)
      const existingConv = await Conversation.findById(convObjectId)
      if (existingConv && (!existingConv.assignedAgentId || existingConv.assignedAgentId.toString() !== caller._id.toString())) {
        sendError(res, 'Access denied: Super Admin is restricted from sending communications on behalf of other users.', HTTP_STATUS.FORBIDDEN)
        return
      }
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
  const baseTemplates = commService.getQuickTemplates(channel)
  const customTemplates: QuickTemplateDto[] = []
  // Snapshot keys into static array to prevent infinite loop from Map mutation during iteration (Rule ML-002)
  const keys = Array.from(customTemplatesCache.keys())
  for (const key of keys) {
    const item = customTemplatesCache.get(key)
    if (item && (!channel || channel === 'all' || item.channel === 'all' || item.channel === channel)) {
      customTemplates.push(item)
    }
  }
  sendSuccess(res, [...baseTemplates, ...customTemplates], 'Quick reply templates retrieved successfully')
}

export const createQuickTemplateHandler = (req: Request, res: Response): void => {
  const newTemplate: QuickTemplateDto = {
    id: `tmpl-${uuidv4().substring(0, 8)}`,
    ...req.body,
  }
  customTemplatesCache.set(newTemplate.id, newTemplate, 3600)
  sendSuccess(res, newTemplate, 'Quick reply template created successfully', HTTP_STATUS.CREATED)
}
