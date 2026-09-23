// integrations/whatsapp/controller.ts
import { Request, Response } from 'express'
import {
  getIntegrationStatus,
  launchSignup,
  handleCodeReceived,
  retryStep,
  restartSignup,
  handleFlowCancelled,
  handleFlowError,
  handleCallbackTimeout,
  confirmPaymentMethod,
  manualDisconnect,
} from './service.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

const getTenantId = (req: Request): string => {
  const caller = (req as any).user
  const tenantFilter = (req as any).tenantFilter
  const tenantId = (req as any).effectiveBrokerageId || caller?.brokerageId || tenantFilter?.brokerageId
  if (!tenantId) {
    throw new Error('Tenant brokerage ID is required for WhatsApp integration operations')
  }
  return tenantId.toString()
}

export const getIntegrationStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const statusDto = await getIntegrationStatus(tenantId)
    sendSuccess(res, statusDto, 'WhatsApp integration status retrieved')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const launchSignupHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const nextState = await launchSignup(tenantId)
    sendSuccess(res, { status: nextState }, 'WhatsApp Embedded Signup flow initiated')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleCallbackHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const { code, wabaId, phoneNumberId } = req.body

    if (!code || !wabaId || !phoneNumberId) {
      sendError(
        res,
        'Missing required parameters: code, wabaId, and phoneNumberId are all required.',
        HTTP_STATUS.BAD_REQUEST
      )
      return
    }

    const result = await handleCodeReceived(tenantId, {
      code: String(code).trim(),
      wabaId: String(wabaId).trim(),
      phoneNumberId: String(phoneNumberId).trim(),
    })

    if (result.error) {
      sendError(res, result.error, HTTP_STATUS.BAD_REQUEST, { status: result.status })
      return
    }

    sendSuccess(res, result, 'WhatsApp Embedded Signup callback processed successfully')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleSessionEventHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const { event: _event, currentStep, errorCode, errorMessage, sessionId } = req.body

    let nextState: string
    if (errorCode || errorMessage) {
      nextState = await handleFlowError(tenantId, {
        errorCode,
        errorMessage,
        sessionId,
      })
    } else {
      nextState = await handleFlowCancelled(tenantId, { currentStep })
    }

    sendSuccess(res, { status: nextState }, 'Session event logged')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleCallbackTimeoutHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const nextState = await handleCallbackTimeout(tenantId)
    sendSuccess(res, { status: nextState }, 'Signup callback timeout recorded')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleRetryHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const result = await retryStep(tenantId)
    if (result.error) {
      sendError(res, result.error, HTTP_STATUS.BAD_REQUEST, { status: result.status })
      return
    }
    sendSuccess(res, result, 'Integration step retried')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleRestartHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const nextState = await restartSignup(tenantId)
    sendSuccess(res, { status: nextState }, 'WhatsApp integration restarted')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleConfirmPaymentHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const nextState = await confirmPaymentMethod(tenantId)
    sendSuccess(res, { status: nextState }, 'WhatsApp payment method confirmed. Integration is now ACTIVE.')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}

export const handleDisconnectHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = getTenantId(req)
    const nextState = await manualDisconnect(tenantId)
    sendSuccess(res, { status: nextState }, 'WhatsApp integration disconnected')
  } catch (err: any) {
    sendError(res, err.message, err.statusCode || HTTP_STATUS.BAD_REQUEST)
  }
}
