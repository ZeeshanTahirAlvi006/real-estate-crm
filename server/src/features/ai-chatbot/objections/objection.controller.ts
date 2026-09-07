import { Request, Response } from 'express'
import { objectionService } from './objection.service.js'
import { sendSuccess, sendError } from '../../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../../utils/constants.js'

export const classifyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body
    const result = objectionService.classifyObjection(text)
    sendSuccess(res, result, 'Objection classified successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to classify objection', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const generateRebuttalHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || (req as any).user?.brokerageId
    const result = await objectionService.generateRebuttals(req.body, brokerageId)
    sendSuccess(res, result, 'Multi-angle rebuttals generated successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate rebuttals', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const getPlaybooksHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || (req as any).user?.brokerageId
    const category = req.query.category as any
    const playbooks = await objectionService.getPlaybooks(brokerageId, category)
    sendSuccess(res, playbooks, 'Objection playbooks retrieved successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve playbooks', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const savePlaybookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || (req as any).user?.brokerageId
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const userId = (req as any).user?.id || (req as any).user?._id
    const saved = await objectionService.savePlaybook(brokerageId, req.body, userId)
    sendSuccess(res, saved, 'Objection playbook saved successfully', HTTP_STATUS.CREATED)
  } catch (error: any) {
    sendError(res, error.message || 'Failed to save objection playbook', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

export const deletePlaybookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const brokerageId = (req as any).effectiveBrokerageId || (req as any).user?.brokerageId
    if (!brokerageId) {
      sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
      return
    }

    const id = String(req.params.id)
    const deleted = await objectionService.deletePlaybook(brokerageId, id)
    if (!deleted) {
      sendError(res, 'Playbook script not found or could not be deleted', HTTP_STATUS.NOT_FOUND)
      return
    }

    sendSuccess(res, { deleted: true }, 'Objection playbook deleted successfully')
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete objection playbook', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
