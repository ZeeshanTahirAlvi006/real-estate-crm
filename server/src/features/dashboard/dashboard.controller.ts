import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import * as dashboardService from './dashboard.service.js'
import { IUser } from '../../models/User.js'

export const getKpis = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const data = await dashboardService.getKpis(tenantFilter)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const getLeadSources = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const data = await dashboardService.getLeadSources(tenantFilter)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const getLeadsOverTime = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const data = await dashboardService.getLeadsOverTime(tenantFilter)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const getPipelineSummary = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const data = await dashboardService.getPipelineSummary(tenantFilter)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const getActivityFeed = async (req: Request, res: Response) => {
  try {
    const tenantFilter = req.tenantFilter || {}
    const data = await dashboardService.getActivityFeed(tenantFilter)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const getLeadPortal = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser
    const data = await dashboardService.getLeadPortal(user)
    sendSuccess(res, data)
  } catch (error: any) {
    sendError(res, error.message)
  }
}

export const updateLeadPortalProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user as IUser
    const data = await dashboardService.updateLeadPortalProfile(user, req.body)
    sendSuccess(res, data, 'Client profile updated successfully')
  } catch (error: any) {
    sendError(res, error.message)
  }
}

