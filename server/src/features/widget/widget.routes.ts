import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const widgetRoutes = Router()

// Resolve the bundle file path
const findWidgetBundlePath = (): string => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'dist/widget/lead-capture.js'),
    path.resolve(process.cwd(), 'server/dist/widget/lead-capture.js'),
    path.resolve(__dirname, '../../../dist/widget/lead-capture.js'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  return possiblePaths[0]
}

// In-memory cache for ultra-fast serving (< 1ms)
let cachedScriptTemplate: string | null = null

const getScriptTemplate = (): string => {
  if (cachedScriptTemplate) {
    return cachedScriptTemplate
  }

  const bundlePath = findWidgetBundlePath()
  try {
    if (fs.existsSync(bundlePath)) {
      cachedScriptTemplate = fs.readFileSync(bundlePath, 'utf8')
      return cachedScriptTemplate
    }
  } catch (err: any) {
    logger.error(`[WidgetRoutes] Error reading widget bundle from ${bundlePath}:`, err)
  }

  return '/* PropPulse OS Lead Capture Widget Bundle Not Found */'
}

/**
 * GET /api/widget/lead-capture.js
 * Serves the bundled standalone JavaScript widget with environment injection.
 */
widgetRoutes.get('/lead-capture.js', (_req: Request, res: Response) => {
  res.removeHeader('X-Frame-Options')
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache')

  const siteKey = env.RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || ''
  const template = getScriptTemplate()
  const scriptContent = template.replace('__RECAPTCHA_SITE_KEY__', siteKey)

  res.send(scriptContent)
})

/**
 * GET /api/widget/embed
 * Serves a lightweight HTML page for <iframe> embeds.
 */
widgetRoutes.get('/embed', (req: Request, res: Response) => {
  res.removeHeader('X-Frame-Options')
  res.setHeader('Content-Security-Policy', "frame-ancestors *")
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const key = typeof req.query.key === 'string' ? req.query.key : ''
  const title = typeof req.query.title === 'string' ? req.query.title : 'Schedule a Showing'
  const subtitle = typeof req.query.subtitle === 'string' ? req.query.subtitle : 'Connect with a local property specialist.'
  const buttonText = typeof req.query.buttonText === 'string' ? req.query.buttonText : 'Request Tour'
  const accent = typeof req.query.accent === 'string' ? req.query.accent : '#9CB080'

  const safeKey = escapeHtml(key)
  const safeTitle = escapeHtml(title)
  const safeSubtitle = escapeHtml(subtitle)
  const safeButtonText = escapeHtml(buttonText)
  const safeAccent = escapeHtml(accent)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 12px;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      box-sizing: border-box;
    }
    #proppulse-lead-widget {
      width: 100%;
      max-width: 440px;
    }
  </style>
</head>
<body>
  <div id="proppulse-lead-widget"
    data-capture-key="${safeKey}"
    data-title="${safeTitle}"
    data-subtitle="${safeSubtitle}"
    data-button-text="${safeButtonText}"
    data-accent="${safeAccent}"
    data-mode="inline"
  ></div>
  <script src="/api/widget/lead-capture.js" async defer></script>
</body>
</html>`

  res.send(html)
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
