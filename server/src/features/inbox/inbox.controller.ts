import { Request, Response, NextFunction } from 'express'
import {
  listConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  toggleAiIsa,
  startConversation,
} from './inbox.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// GET /api/inbox/conversations
export const getConversationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const result = await listConversations(req.user, req.query as any, req.tenantFilter || {})
    sendSuccess(res, result.conversations, 'Conversations retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/inbox/conversations/:id/messages
export const getMessagesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const channel = req.query.channel as string | undefined
    const result = await getMessages(id, req.user, page, limit, channel)
    sendSuccess(res, result.messages, 'Messages retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/inbox/conversations/:id/messages
export const sendMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const message = await sendMessage(id, req.body, req.user)
    sendSuccess(res, message, 'Message sent successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// PATCH /api/inbox/conversations/:id/read
export const markReadHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const conv = await markConversationRead(id, req.user)
    sendSuccess(res, conv, 'Conversation marked as read')
  } catch (error) {
    next(error)
  }
}

// PATCH /api/inbox/conversations/:id/ai-isa
export const toggleAiIsaHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const id = req.params.id as string
    const conv = await toggleAiIsa(id, req.body.enabled, req.user)
    sendSuccess(res, conv, `AI ISA mode ${req.body.enabled ? 'enabled' : 'disabled'}`)
  } catch (error) {
    next(error)
  }
}

// POST /api/inbox/conversations/start
export const startConversationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) return
    const conv = await startConversation(req.body, req.user)
    sendSuccess(res, conv, 'Conversation ready', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}
