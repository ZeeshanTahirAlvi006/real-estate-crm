// integrations/whatsapp/routes.ts
import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { strictCommunicationScope } from '../../middleware/tenantScope.js'
import {
  getIntegrationStatusHandler,
  launchSignupHandler,
  handleCallbackHandler,
  handleSessionEventHandler,
  handleCallbackTimeoutHandler,
  handleRetryHandler,
  handleRestartHandler,
  handleConfirmPaymentHandler,
  handleDisconnectHandler,
} from './controller.js'

const router = Router()

// All routes require authenticated session with strict communication / tenant scoping
router.use(authenticate, strictCommunicationScope)

// WhatsApp State Machine Lifecycle Endpoints
router.get('/status', getIntegrationStatusHandler)
router.post('/signup-launch', launchSignupHandler)
router.post('/callback', handleCallbackHandler)
router.post('/session-event', handleSessionEventHandler)
router.post('/callback-timeout', handleCallbackTimeoutHandler)
router.post('/retry', handleRetryHandler)
router.post('/restart', handleRestartHandler)
router.post('/confirm-payment', handleConfirmPaymentHandler)
router.post('/disconnect', handleDisconnectHandler)

export const whatsAppIntegrationRoutes = router
