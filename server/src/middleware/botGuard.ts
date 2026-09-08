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

// Cloud Metadata Probe URL patterns (OWASP A05 / CWE-1230 mitigation)
const CLOUD_METADATA_PROBE_PATTERNS = [
  /^\/opc\//i,
  /^\/latest\/meta-data/i,
  /^\/computeMetadata\/v1/i,
  /^\/metadata\/instance/i,
]

// Bot & Webcrawler Guard Middleware
export const botGuard = (req: Request, res: Response, next: NextFunction): void | Response => {
  // 1. Prohibit search engine bots and AI crawlers from indexing API endpoints
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')

  // 2. Prevent sensitive CRM data from being cached on shared proxies or browser history
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  // 3. Cloud Metadata SSRF & Host Header Spoofing Protection
  const hostHeader = (req.headers.host || '').toLowerCase()
  if (hostHeader.includes('169.254.169.254')) {
    logger.warn(`Blocked Host header cloud metadata spoofing attempt from IP: ${req.ip}`)
    return sendError(res, 'Access forbidden. Host header invalid.', HTTP_STATUS.FORBIDDEN)
  }

  const isMetadataProbe = CLOUD_METADATA_PROBE_PATTERNS.some((pattern) => pattern.test(req.path || req.originalUrl))
  if (isMetadataProbe) {
    logger.warn(`Blocked Cloud Metadata probe path '${req.path}' from IP: ${req.ip}`)
    return sendError(res, 'Access forbidden. Metadata endpoint unavailable.', HTTP_STATUS.FORBIDDEN)
  }

  // 4. User-Agent Bot Screening for automated scraping attempts
  const userAgent = req.headers['user-agent'] || ''

  // Allow webhooks, health checks, or requests with proper API keys
  const isHealthCheck = req.path === '/health' || req.path === '/api/health'
  if (isHealthCheck) {
    return next()
  }

  // Check if User-Agent matches malicious/unauthorized scraper patterns
  const isScraper = BLOCKED_SCRAPER_PATTERNS.some((pattern) => pattern.test(userAgent))
  if (isScraper && !req.headers['x-api-key']) {
    logger.warn(`Blocked automated crawler/scraper access from IP: ${req.ip} (UA: ${userAgent})`)
    return sendError(res, 'Access forbidden. Automated crawling is prohibited.', HTTP_STATUS.FORBIDDEN)
  }

  next()
}
