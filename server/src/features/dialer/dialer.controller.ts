import { Request, Response, NextFunction } from 'express'
import {
  getSmartQueue,
  enqueueContacts,
  clearQueue,
  saveCallDisposition,
  getCallLogs,
  getVoicemailDrops,
  createVoicemailDrop,
  getDialerStats,
  getTwilioToken,
  startParallelSession,
} from './dialer.service.js'
import { matchLocalPresence } from './localPresence.js'
import { generateCallSummary } from './transcription.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/dialer/queue
export const getQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const queue = await getSmartQueue(req.tenantFilter || {})
    sendSuccess(res, queue, 'Dialer queue retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/queue/enqueue
export const enqueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await enqueueContacts(req.body, req.user)
    sendSuccess(res, result, `Enqueued ${result.enqueuedCount} contact(s) to dialer`)
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/queue/clear
export const clear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await clearQueue(req.tenantFilter || {})
    sendSuccess(res, result, 'Dialer queue cleared')
  } catch (error) {
    next(error)
  }
}

// GET /api/dialer/call-logs
export const getLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await getCallLogs(req.query, req.tenantFilter || {})
    sendSuccess(res, result, 'Call logs retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/call-logs
export const saveDisposition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await saveCallDisposition(req.body, req.user, clientIp, userAgent)
    sendSuccess(res, result, 'Call disposition saved successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// GET /api/dialer/voicemail-drops
export const getDrops = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const drops = await getVoicemailDrops(req.tenantFilter || {}, req.user)
    sendSuccess(res, drops, 'Voicemail drops retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/voicemail-drops
export const createDrop = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const drop = await createVoicemailDrop(req.body, req.user)
    sendSuccess(res, drop, 'Voicemail drop created successfully', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// GET /api/dialer/stats
export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const stats = await getDialerStats(req.tenantFilter || {})
    sendSuccess(res, stats, 'Dialer KPIs retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// GET /api/dialer/token
export const getToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const tokenData = await getTwilioToken(req.user)
    sendSuccess(res, tokenData, 'Dialer telephony token generated')
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/local-presence/match
export const matchPresence = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body
    const result = matchLocalPresence(phone, req.user?.brokerageId?.toString())
    sendSuccess(res, result, 'Local presence caller ID matched')
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/parallel/start
export const startParallel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await startParallelSession(req.body, req.user)
    sendSuccess(res, result, 'Parallel power dialing session started', HTTP_STATUS.CREATED)
  } catch (error) {
    next(error)
  }
}

// POST /api/dialer/summarize-call
export const summarizeCall = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { transcript, contactName, durationSeconds } = req.body
    const summary = await generateCallSummary(transcript, contactName || 'Prospect', durationSeconds || 60)
    sendSuccess(res, summary, 'AI call summary generated successfully')
  } catch (error) {
    next(error)
  }
}
