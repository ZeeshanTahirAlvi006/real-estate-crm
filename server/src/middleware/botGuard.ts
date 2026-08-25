import { Request, Response, NextFunction } from 'express'
import { HTTP_STATUS } from '../utils/constants.js'
import { sendError } from '../utils/apiResponse.js'
import { logger } from '../utils/logger.js'

// Known automated scraper user-agent signatures targeting private endpoints
const BLOCKED_SCRAPER_PATTERNS = [
  /scrapy/i,
  /python-requests/i,
  /aiohttp/i,
  /httpclient/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /mechanize/i,
  /urllib/i,
]

// Bot & Webcrawler Guard Middleware
export const botGuard = (req: Request, res: Response, next: NextFunction): void | Response => {
  // 1. Prohibit search engine bots and AI crawlers from indexing API endpoints
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')

  // 2. Prevent sensitive CRM data from being cached on shared proxies or browser history
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  // 3. User-Agent Bot Screening for automated scraping attempts
  const userAgent = req.headers['user-agent'] || ''

  // Allow webhooks, health checks, or requests with proper API keys
  const isHealthCheck = req.path === '/health' || req.path === '/api/health'
  if (isHealthCheck) {
    return next()
  }

  // Check if User-Agent matches malicious/unauthorized scraper patterns
  const isScraper = BLOCKED_SCRAPER_PATTERNS.some((pattern) => pattern.test(userAgent))
  if (isScraper && !req.headers['x-api-key']) {
    logger.warn(`🛑 Blocked automated crawler/scraper access from IP: ${req.ip} (UA: ${userAgent})`)
    return sendError(res, 'Access forbidden. Automated crawling is prohibited.', HTTP_STATUS.FORBIDDEN)
  }

  next()
}
