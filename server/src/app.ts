import express, { Express, Request, Response } from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { initRedis } from './config/redis.js'
import { corsMiddleware } from './config/cors.js'
import { sanitizeRequest } from './middleware/sanitize.js'
import { botGuard } from './middleware/botGuard.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRoutes } from './features/auth/auth.routes.js'
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

  // 7. Basic Liveness Health Check
  app.get('/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'System online')
  })
  app.get('/api/health', (_req: Request, res: Response) => {
    sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'API online')
  })

  // 7. Feature Routes Mounting
  app.use('/api/auth', authRoutes)

  // 8. 404 Catch-All Handler
  app.use((_req: Request, res: Response) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      message: 'API endpoint not found',
    })
  })

  // 9. Global Centralized Error Handler
  app.use(errorHandler)

  return app
}

// Start Server Function
export const startServer = async (): Promise<void> => {
  try {
    logger.info('🚀 Initializing PropPulse OS Backend Services...')

    // Initialize Database & Cache
    await connectDB()
    initRedis()

    const app = createApp()
    const server = app.listen(env.PORT, () => {
      logger.info(`server running on port ${env.PORT} in [${env.NODE_ENV}] mode`)
    })

    // Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down server...`)
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
