import { Request, Response, NextFunction } from 'express'
import { radarService } from './radar.service.js'
import { IUser } from '../../models/User.js'
import { sendSuccess, sendPaginated, sendError } from '../../utils/apiResponse.js'
import { runHomeAnniversaryJob } from '../../jobs/homeAnniversary.job.js'
import { logger } from '../../utils/logger.js'
import { HTTP_STATUS } from '../../utils/constants.js'

export class RadarController {
  /**
   * GET /api/seller-radar/prospects
   * High-equity homeowners ranked by sell probability
   */
  async getProspects(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED)
        return
      }

      if (!req.user.brokerageId) {
        sendPaginated(res, [], 0, 1, 50, 'Seller prospects retrieved successfully')
        return
      }

      const user = req.user as IUser
      const result = await radarService.getProspects(user, req.query as any)

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getProspects took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      sendPaginated(
        res,
        result.prospects,
        result.total,
        result.page,
        result.limit,
        'Seller prospects retrieved successfully'
      )
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getProspects (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }

  /**
   * GET /api/seller-radar/dashboard
   * Aggregate metrics (total prospects, avg equity, hot leads, anniversaries)
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED)
        return
      }

      if (!req.user.brokerageId) {
        sendSuccess(res, {
          totalProspects: 0,
          totalEquity: 0,
          avgEquity: 0,
          avgSellProbability: 0,
          hotProspectsCount: 0,
          warmProspectsCount: 0,
          anniversariesThisMonth: 0,
          equityDistribution: { under200k: 0, between200kAnd500k: 0, above500k: 0 },
          topProspects: [],
        }, 'Seller Radar dashboard metrics retrieved')
        return
      }

      const user = req.user as IUser
      const metrics = await radarService.getDashboardMetrics(user)

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getDashboard took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      sendSuccess(res, metrics, 'Seller Radar dashboard metrics retrieved')
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getDashboard (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/analyze
   * Analyze property equity (calls ATTOM API with fallback)
   */
  async analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED)
        return
      }

      if (!req.user.brokerageId) {
        sendError(res, 'An assigned brokerage is required to analyze properties', HTTP_STATUS.FORBIDDEN)
        return
      }

      const user = req.user as IUser
      const result = await radarService.analyzeProperty(user, req.body)

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.analyze took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      sendSuccess(res, result, 'Property equity analysis completed')
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.analyze (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/cma/generate
   * Generates Micro-CMA with comps, valuation range, and shareable link
   */
  async generateCma(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED)
        return
      }

      if (!req.user.brokerageId) {
        sendError(res, 'An assigned brokerage is required to generate Micro-CMAs', HTTP_STATUS.FORBIDDEN)
        return
      }

      const user = req.user as IUser
      const result = await radarService.generateMicroCma(user, req.body)

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.generateCma took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      sendSuccess(res, result, 'Micro-CMA report generated successfully', 201)
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.generateCma (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }

  /**
   * GET /api/seller-radar/cma/:id
   * Public CMA landing page (returns HTML for browser or JSON for API)
   */
  async getPublicCma(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      const idOrShareId = String(req.params.id)
      const report = await radarService.getCmaReport(idOrShareId, true)

      // Content negotiation: return HTML if requested by browser or explicit format=html
      const acceptsHtml = req.accepts('html')
      const formatQuery = req.query.format

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getPublicCma took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      if (formatQuery === 'html' || (acceptsHtml && !req.xhr && formatQuery !== 'json')) {
        const html = radarService.renderCmaHtml(report)
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*"
        )
        res.status(200).send(html)
        return
      }

      sendSuccess(res, report, 'CMA report retrieved successfully')
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.getPublicCma (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }

  /**
   * POST /api/seller-radar/anniversary/trigger
   * Admin / manual trigger for testing home anniversary scans
   */
  async triggerAnniversary(req: Request, res: Response, next: NextFunction): Promise<void> {
    const t0 = process.hrtime.bigint()
    try {
      if (!req.user) {
        sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED)
        return
      }

      if (!req.user.brokerageId) {
        sendError(res, 'An assigned brokerage is required to trigger anniversary scans', HTTP_STATUS.FORBIDDEN)
        return
      }

      const user = req.user as IUser
      const forceAll = Boolean(req.body?.forceAll)
      logger.info(`Manual trigger initiated for Home Anniversary scan by user: ${user.email}`)

      const summary = await runHomeAnniversaryJob({
        brokerageId: user.brokerageId.toString(),
        forceAll,
      })

      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.triggerAnniversary took ${deltaMs.toFixed(3)}ms`)
      res.setHeader('X-Response-Time', `${deltaMs.toFixed(2)}ms`)

      sendSuccess(res, summary, 'Home anniversary scan completed successfully')
    } catch (err) {
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
      console.log(`[TIMER] RadarController.triggerAnniversary (error) took ${deltaMs.toFixed(3)}ms`)
      next(err)
    }
  }
}

export const radarController = new RadarController()
