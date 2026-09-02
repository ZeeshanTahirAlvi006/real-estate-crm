import http from 'http'
import express, { Express, Request, Response } from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { initRedis } from './config/redis.js'
import { initSocketServer } from './config/socket.js'
import { corsMiddleware } from './config/cors.js'
import { sanitizeRequest } from './middleware/sanitize.js'
import { botGuard } from './middleware/botGuard.js'
import { rateLimiter } from './middleware/rateLimiter.js'
import { quotaGuard } from './middleware/quotaGuard.js'
import { httpAuditLogger } from './middleware/auditLogger.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRoutes } from './features/auth/auth.routes.js'
import { featureFlagRoutes } from './features/feature-flags/featureFlag.routes.js'
import { userRoutes } from './features/users/user.routes.js'
import { brokerageRoutes } from './features/brokerages/brokerage.routes.js'
import { contactRoutes } from './features/contacts/contact.routes.js'
import { auditRoutes } from './features/audit/audit.routes.js'
import { leadIngestionRoutes, leadSourceRoutes, routingRuleRoutes, scoringConfigRoutes } from './features/leads/lead.routes.js'
import { pipelineRoutes } from './features/pipeline/pipeline.routes.js'
import { dealRoutes } from './features/deals/deal.routes.js'
import { dataHealthRoutes } from './features/data-health/dataHealth.routes.js'
import { dialerRoutes } from './features/dialer/dialer.routes.js'
import { aiIsaRoutes } from './features/ai-isa/aiIsa.routes.js'
import { inboxRoutes } from './features/inbox/inbox.routes.js'
import { communicationRoutes } from './features/communication/communication.routes.js'
import { notificationRoutes } from './features/notifications/notification.routes.js'
import { chatbotRoutes, complianceRoutes } from './features/ai-chatbot/chatbot.routes.js'
import smartListRoutes from './features/smart-lists/smartList.routes.js'
import dashboardRoutes from './features/dashboard/dashboard.routes.js'
import { transactionRoutes } from './features/transactions/transaction.routes.js'
import { initializeDefaultFeatureFlags } from './models/FeatureFlag.js'
import { startScheduler, stopScheduler } from './jobs/scheduler.js'
import { imapListenerService } from './features/communication/imap.listener.js'
import { logger } from './utils/logger.js'
import { sendSuccess } from './utils/apiResponse.js'
import { HTTP_STATUS } from './utils/constants.js'

export const createApp = (): Express => {
  const app: Express = express()

  // 1. Security HTTP Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  )

  // 2. Cross-Origin Resource Sharing
  app.use(corsMiddleware)

  // 3. Body Parsers with limits
  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  // 4. Cookie Parser with Signing Secret
  app.use(cookieParser(env.COOKIE_SECRET))

  // 5. Input Sanitization (NoSQL injection and XSS mitigation)
  app.use(sanitizeRequest)

  // 6. Bot, Webcrawler & Anti-Cache Guard
  app.use(botGuard)

  // 7. Global Sliding-Window Rate Limiter
  app.use(rateLimiter)

  // 8. Strict Dual-Tier Quota Guard (Per-User & Cumulative Brokerage)
  app.use(quotaGuard)

  // 9. HTTP Mutation Audit Logger
  app.use(httpAuditLogger)

  // 10. Basic Liveness Health Check
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'System online')
  })
  app.get('/api/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'API online')
  })

  // 11. Feature Routes Mounting
  app.use('/api/auth', authRoutes)
  app.use('/api/feature-flags', featureFlagRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/brokerages', brokerageRoutes)
  app.use('/api/contacts', contactRoutes)
  app.use('/api/audit-logs', auditRoutes)
  app.use('/api/leads', leadIngestionRoutes)
  app.use('/api/lead-sources', leadSourceRoutes)
  app.use('/api/routing-rules', routingRuleRoutes)
  app.use('/api/scoring-config', scoringConfigRoutes)
  app.use('/api/pipelines', pipelineRoutes)
  app.use('/api/deals', dealRoutes)
  app.use('/api/data-health', dataHealthRoutes)
  app.use('/api/dialer', dialerRoutes)
  app.use('/api/ai-isa', aiIsaRoutes)
  app.use('/api/inbox', inboxRoutes)
  app.use('/api/communication', communicationRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/chatbot', chatbotRoutes)
  app.use('/api/compliance', complianceRoutes)
  app.use('/api/smart-lists', smartListRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/transactions', transactionRoutes)

  // 9. 404 Catch-All Handler
  app.use((_req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'API endpoint not found',
    })
  })

  // 10. Global Centralized Error Handler
  app.use(errorHandler)

  return app
}

// Start Server Function with Socket.io Attach
export const startServer = async (): Promise<void> => {
  try {
    logger.info('Initializing server...')

    // Initialize Database & Cache
    await connectDB()
    initRedis()

    // Initialize & Cache Default Feature Flags
    await initializeDefaultFeatureFlags()

    const app = createApp()
    const httpServer = http.createServer(app)

    // Attach Socket.io WebSocket Server
    initSocketServer(httpServer)

    const server = httpServer.listen(env.PORT, () => {
      logger.info(`🚀 Server & WebSocket running on port ${env.PORT} in [${env.NODE_ENV}] mode`)
      // Start background cron scheduler
      startScheduler()
      // Start IMAP live email listener
      imapListenerService.start()
    })

    // Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down server...`)
      await stopScheduler()
      await imapListenerService.stop()
      server.close(async () => {
        await disconnectDB()
        logger.info('👋 Server shutdown complete. Goodbye!')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))
  } catch (error) {
    logger.error('Server startup failed:', error)
    process.exit(1)
  }
}

// Auto-start if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer()
}
