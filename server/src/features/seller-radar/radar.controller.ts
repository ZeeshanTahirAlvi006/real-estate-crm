import { Request, Response, NextFunction } from 'express'
import { radarService } from './radar.service.js'
import { IUser } from '../../models/User.js'
import { sendSuccess, sendPaginated } from '../../utils/apiResponse.js'
import { runHomeAnniversaryJob } from '../../jobs/homeAnniversary.job.js'
import { logger } from '../../utils/logger.js'

export class RadarController {
  /**
   * GET /api/seller-radar/prospects
   * High-equity homeowners ranked by sell probability
   */
  async getProspects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await radarService.getProspects(user, req.query as any)
      sendPaginated(
        res,
        result.prospects,
        result.total,
        result.page,
        result.limit,
        'Seller prospects retrieved successfully'
      )
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/seller-radar/dashboard
   * Aggregate metrics (total prospects, avg equity, hot leads, anniversaries)
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const metrics = await radarService.getDashboardMetrics(user)
      sendSuccess(res, metrics, 'Seller Radar dashboard metrics retrieved')
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/analyze
   * Analyze property equity (calls ATTOM API with fallback)
   */
  async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await radarService.analyzeProperty(user, req.body)
      sendSuccess(res, result, 'Property equity analysis completed')
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/cma/generate
   * Generates Micro-CMA with comps, valuation range, and shareable link
   */
  async generateCma(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const result = await radarService.generateMicroCma(user, req.body)
      sendSuccess(res, result, 'Micro-CMA report generated successfully', 201)
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/seller-radar/cma/:id
   * Public CMA landing page (returns HTML for browser or JSON for API)
   */
  async getPublicCma(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idOrShareId = String(req.params.id)
      const report = await radarService.getCmaReport(idOrShareId, true)

      // Content negotiation: return HTML if requested by browser or explicit format=html
      const acceptsHtml = req.accepts('html')
      const formatQuery = req.query.format

      if (formatQuery === 'html' || (acceptsHtml && !req.xhr && formatQuery !== 'json')) {
        const html = radarService.renderCmaHtml(report)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*")
        res.status(200).send(html)
        return
      }

      sendSuccess(res, report, 'CMA report retrieved successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/anniversary/trigger
   * Admin / manual trigger for testing home anniversary scans
   */
  async triggerAnniversary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      const forceAll = Boolean(req.body?.forceAll)
      logger.info(`Manual trigger initiated for Home Anniversary scan by user: ${user.email}`)

      const summary = await runHomeAnniversaryJob({
        brokerageId: user.brokerageId.toString(),
        forceAll,
      })

      sendSuccess(res, summary, 'Home anniversary scan completed successfully')
    } catch (err) {
      next(err)
    }
  }
}

export const radarController = new RadarController()
