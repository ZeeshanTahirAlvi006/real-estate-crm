import { Request, Response, NextFunction } from 'express'
import {
  qualifyLead,
  streamQualifyLead,
  draftAgentResponse,
  summarizeConversation,
  suggestNextActions,
} from './chatbot.service.js'
import { scanFairHousingCompliance } from '../compliance/nlp/fairHousing.js'
import { dncComplianceService } from '../compliance/dnc.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'

// Helper for telemetry and cmd timer logging
const recordChatbotTelemetry = (res: Response, startTime: bigint, handlerName: string) => {
  const deltaMs = Number(process.hrtime.bigint() - startTime) / 1e6
  res.setHeader('X-Response-Time', `${deltaMs.toFixed(3)}ms`)
  setImmediate(() => {
    console.log(`[Chatbot Controller Timer] ${handlerName} executed in ${deltaMs.toFixed(3)}ms`)
  })
}

// POST /api/chatbot/qualify
export const qualifyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    const result = await qualifyLead(req.body, req.user)
    recordChatbotTelemetry(res, t0, 'qualifyHandler')
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
  const t0 = process.hrtime.bigint()
  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let isClientClosed = false
    // Fix ML-001: use .once() to prevent listener accumulation
    req.once('close', () => {
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
    recordChatbotTelemetry(res, t0, 'qualifyStreamHandler')
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
  const t0 = process.hrtime.bigint()
  try {
    const result = await draftAgentResponse(req.body)
    recordChatbotTelemetry(res, t0, 'draftResponseHandler')
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
  const t0 = process.hrtime.bigint()
  try {
    const result = await summarizeConversation(req.body)
    recordChatbotTelemetry(res, t0, 'summarizeHandler')
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
  const t0 = process.hrtime.bigint()
  try {
    const result = await suggestNextActions(req.body, req.user)
    recordChatbotTelemetry(res, t0, 'suggestNextActionHandler')
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
  const t0 = process.hrtime.bigint()
  try {
    const { text } = req.body
    const result = scanFairHousingCompliance(text || '')
    recordChatbotTelemetry(res, t0, 'fairHousingCheckHandler')
    sendSuccess(res, result, 'Fair Housing compliance scanned')
  } catch (error) {
    next(error)
  }
}

// POST /api/compliance/dnc-check
export const dncCheckHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const t0 = process.hrtime.bigint()
  try {
    const { phone } = req.body
    const brokerageId = (req as any).effectiveBrokerageId || req.user?.brokerageId
    const result = await dncComplianceService.checkPhoneNumber(phone, brokerageId)
    recordChatbotTelemetry(res, t0, 'dncCheckHandler')
    sendSuccess(res, result, 'DNC compliance check completed')
  } catch (error) {
    next(error)
  }
}
