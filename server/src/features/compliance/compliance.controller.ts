import { Request, Response } from 'express'
import { HTTP_STATUS } from '../../utils/constants.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { complianceService } from './compliance.service.js'

export const getDashboardHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).brokerageId
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const dashboard = await complianceService.getComplianceDashboard(brokerageId)
    sendSuccess(res, dashboard, 'Compliance dashboard retrieved successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve compliance dashboard', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const dncCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body
    const brokerageId = (req as any).brokerageId

    const result = await complianceService.checkPhoneNumber(phone, brokerageId)
    sendSuccess(res, result, 'DNC and TCPA status verified')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to verify DNC status', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const recordConsentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).brokerageId
    const { contactId } = req.params
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    const userId = (req as any).user?.id

    const updated = await complianceService.recordConsent(
      brokerageId,
      contactId as string,
      req.body,
      clientIp,
      userId
    )
    sendSuccess(res, updated, 'TCPA consent recorded successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to record TCPA consent', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const processOptOutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).brokerageId
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1'
    const userId = (req as any).user?.id

    const result = await complianceService.processOptOut(brokerageId, req.body, clientIp, userId)
    sendSuccess(res, result, 'Opt-out processed successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process opt-out', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const sendOptInVerificationHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).brokerageId
    const { contactId } = req.body

    const result = await complianceService.sendOptInVerification(brokerageId, contactId)
    sendSuccess(res, result, 'Double opt-in verification dispatched')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to dispatch verification code', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const confirmOptInHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).brokerageId
    const { contactId, code } = req.body

    const result = await complianceService.confirmOptIn(brokerageId, contactId, code)
    sendSuccess(res, result, 'Double opt-in verified successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to verify double opt-in', HTTP_STATUS.BAD_REQUEST)
  }
}

export const scanFairHousingHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body
    const report = complianceService.scanListingContent(text)
    sendSuccess(res, report, 'Fair Housing scan completed')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to execute Fair Housing scan', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
