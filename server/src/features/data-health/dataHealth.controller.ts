import { Request, Response, NextFunction } from 'express'
import {
  getHealthScore,
  listDuplicateCandidates,
  scanDuplicates,
  scanEmails,
  scanPhones,
  mergeContacts,
  dismissDuplicate,
  listDataHealthIssues,
} from './dataHealth.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

const getClientMeta = (req: Request) => ({
  clientIp: req.ip || req.socket.remoteAddress || '127.0.0.1',
  userAgent: req.headers['user-agent'] || 'browser',
})

// GET /api/data-health/score
export const getScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const score = await getHealthScore(req.tenantFilter || {})
    sendSuccess(res, score, 'Data health score retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/data-health/duplicates
export const listDuplicates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const duplicates = await listDuplicateCandidates(req.tenantFilter || {})
    sendSuccess(res, duplicates, 'Duplicate candidates retrieved successfully')
  } catch (error) { next(error) }
}

// GET /api/data-health/issues
export const listIssues = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const type = req.query.type as 'all' | 'email' | 'phone' | undefined
    const search = req.query.search as string | undefined
    const issues = await listDataHealthIssues(req.tenantFilter || {}, type, search)
    sendSuccess(res, issues, 'Data health issues retrieved successfully')
  } catch (error) { next(error) }
}

// POST /api/data-health/scan/deduplication
export const triggerDuplicateScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await scanDuplicates(req.tenantFilter || {})
    sendSuccess(res, result, result.message)
  } catch (error) { next(error) }
}

// POST /api/data-health/scan/email-validation
export const triggerEmailScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await scanEmails(req.tenantFilter || {})
    sendSuccess(res, result, result.message)
  } catch (error) { next(error) }
}

// POST /api/data-health/scan/phone-verification
export const triggerPhoneScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const result = await scanPhones(req.tenantFilter || {})
    sendSuccess(res, result, result.message)
  } catch (error) { next(error) }
}

// POST /api/data-health/scan/all
export const triggerFullScan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const tenantFilter = req.tenantFilter || {}
    await Promise.all([
      scanDuplicates(tenantFilter),
      scanEmails(tenantFilter),
      scanPhones(tenantFilter),
    ])
    const updatedScore = await getHealthScore(tenantFilter)
    sendSuccess(res, updatedScore, 'Comprehensive database scan completed successfully')
  } catch (error) { next(error) }
}

// POST /api/data-health/duplicates/:id/merge
export const merge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const candidateId = req.params.id as string
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await mergeContacts(candidateId, req.body, req.user, clientIp, userAgent)
    sendSuccess(res, result, 'Contacts merged successfully', HTTP_STATUS.OK)
  } catch (error) { next(error) }
}

// POST /api/data-health/duplicates/:id/dismiss
export const dismiss = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const candidateId = req.params.id as string
    const { clientIp, userAgent } = getClientMeta(req)
    const result = await dismissDuplicate(candidateId, req.user, clientIp, userAgent)
    sendSuccess(res, result, 'Duplicate candidate dismissed')
  } catch (error) { next(error) }
}
