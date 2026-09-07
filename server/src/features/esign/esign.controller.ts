import { Request, Response, NextFunction } from 'express'
import { esignService } from './esign.service.js'
import { STANDARD_CONTRACT_TEMPLATES } from './esign.templates.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { IUser } from '../../models/User.js'

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || '127.0.0.1'
}

export class ESignController {
  async getTemplates(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, STANDARD_CONTRACT_TEMPLATES, 'Standard contract templates retrieved successfully')
  }

  async prepare(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await esignService.prepareEnvelope(user, req.body)
      sendSuccess(res, result, 'Envelope prepared successfully', 201)
    } catch (err) {
      next(err)
    }
  }

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await esignService.sendEnvelope(user, req.params.id as string)
      sendSuccess(res, result, 'Signing invitations dispatched successfully')
    } catch (err) {
      next(err)
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await esignService.list(user, req.query as any)
      sendSuccess(res, result, 'Envelopes retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await esignService.getById(user, req.params.id as string)
      sendSuccess(res, result, 'Envelope details retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  async voidEnvelope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const { reason } = req.body
      const result = await esignService.voidEnvelope(user, req.params.id as string, reason)
      sendSuccess(res, result, 'Envelope voided successfully')
    } catch (err) {
      next(err)
    }
  }

  // --- Public Unauthenticated Signing Handlers ---

  async getSigningSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string
      const ip = getClientIp(req)
      const userAgent = req.headers['user-agent'] || ''

      // Automatically log view timestamp and IP
      await esignService.recordViewAction(token, ip, userAgent)
      const result = await esignService.getSigningSession(token)
      sendSuccess(res, result, 'Signing session active')
    } catch (err) {
      next(err)
    }
  }

  async completeSigning(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string
      const ip = getClientIp(req)
      const userAgent = req.headers['user-agent'] || ''
      const result = await esignService.completeSignerSession(token, req.body, ip, userAgent)
      sendSuccess(res, result, 'Document executed successfully')
    } catch (err) {
      next(err)
    }
  }

  async declineSigning(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token as string
      const ip = getClientIp(req)
      const userAgent = req.headers['user-agent'] || ''
      const { reason } = req.body
      const result = await esignService.declineSigningSession(token, reason, ip, userAgent)
      sendSuccess(res, result, 'Signing invitation declined')
    } catch (err) {
      next(err)
    }
  }
}

export const esignController = new ESignController()
