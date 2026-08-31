import { Request, Response } from 'express'
import { sendError, sendSuccess } from '../../utils/apiResponse.js'
import * as smartListService from './smartList.service.js'

export const getSmartLists = async (req: Request, res: Response) => {
  try {
    const brokerageId = req.user!.brokerageId.toString()
    const userId = req.user!._id.toString()
    if (!brokerageId || !userId) {
      return sendError(res, 'BrokerageId or UserId not found')
    }
    const lists = await smartListService.getSmartLists(brokerageId, userId)
    sendSuccess(res, lists)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const createSmartList = async (req: Request, res: Response) => {
  try {
    const brokerageId = req.user!.brokerageId.toString()
    const userId = req.user!._id.toString()
    if (!brokerageId || !userId) {
      return sendError(res, 'BrokerageId or UserId not found')
    }
    const list = await smartListService.createSmartList(brokerageId, userId, req.body)
    sendSuccess(res, list, 'Smart list created', 201)
  } catch (error: any) {
    sendError(res, error.message)
  }

}

export const updateSmartList = async (req: Request, res: Response) => {
  try {
    const brokerageId = req.user!.brokerageId.toString()
    const userId = req.user!._id.toString()
    if (!brokerageId || !userId) {
      return sendError(res, 'BrokerageId or UserId not found')
    }
    const list = await smartListService.updateSmartList(req.params.id as string, brokerageId, userId, req.body)
    sendSuccess(res, list, 'Smart list updated')
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const deleteSmartList = async (req: Request, res: Response) => {
  try {
    const brokerageId = req.user!.brokerageId.toString()
    const userId = req.user!._id.toString()
    if (!brokerageId || !userId) {
      return sendError(res, 'BrokerageId or UserId not found')
    }
    await smartListService.deleteSmartList(req.params.id as string, brokerageId, userId)
    sendSuccess(res, null, 'Smart list deleted')
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const previewSmartList = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    if (!req.tenantFilter) {
      return sendError(res, 'tenantFilter not found')
    }
    if (!req.body.filters) {
      return sendError(res, 'Filters not found')
    }
    if (!page || !limit) {
      return sendError(res, 'Page or Limit not found')
    }
    const result = await smartListService.previewSmartList(tenantFilter, req.body.filters, page, limit)
    sendSuccess(res, result)
  } catch (error: any) {
    sendError(res, error.message)
  }
}
