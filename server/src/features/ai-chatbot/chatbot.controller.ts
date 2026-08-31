import { Request, Response, NextFunction } from 'express'
import {
  qualifyLead,
  streamQualifyLead,
  draftAgentResponse,
  summarizeConversation,
  suggestNextActions,
} from './chatbot.service.js'
import { scanFairHousingCompliance } from '../compliance/nlp/fairHousing.js'
import { sendSuccess } from '../../utils/apiResponse.js'

// POST /api/chatbot/qualify
export const qualifyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await qualifyLead(req.body, req.user)
    sendSuccess(res, result, 'Lead qualification processed')
  } catch (error) {
    next(error)
  }
}

// POST /api/chatbot/qualify/stream (SSE Stream)
export const qualifyStreamHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let isClientClosed = false
    req.on('close', () => {
      isClientClosed = true
    })

    const onToken = (token: string) => {
      if (isClientClosed) return
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`)
    }

    const result = await streamQualifyLead(req.body, onToken, req.user)

    if (!isClientClosed) {
      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`)
      res.end()
    }
  } catch (error) {
    if (!res.headersSent) {
      next(error)
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
      res.end()
    }
  }
}

// POST /api/chatbot/draft-response
export const draftResponseHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await draftAgentResponse(req.body)
    sendSuccess(res, result, 'Smart drafts generated')
  } catch (error) {
    next(error)
  }
}

// POST /api/chatbot/summarize
export const summarizeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await summarizeConversation(req.body)
    sendSuccess(res, result, 'Conversation summarized')
  } catch (error) {
    next(error)
  }
}

// POST /api/chatbot/suggest-next-action
export const suggestNextActionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await suggestNextActions(req.body)
    sendSuccess(res, result, 'Next actions recommended')
  } catch (error) {
    next(error)
  }
}

// POST /api/compliance/fair-housing-check
export const fairHousingCheckHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body
    const result = scanFairHousingCompliance(text || '')
    sendSuccess(res, result, 'Fair Housing compliance scanned')
  } catch (error) {
    next(error)
  }
}
