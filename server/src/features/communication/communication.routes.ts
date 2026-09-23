import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { strictCommunicationScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  verifyWebhook,
  handleWebhook,
  getTemplates,
  createTemplate,
  sendMessage,
  createBroadcast,
  getBroadcasts,
  simulateInbound,
  getTenantConfigHandler,
  updateTenantConfigHandler,
  testTenantConnectionHandler,
  disconnectTenantHandler,
} from './whatsapp.controller.js'
import {
  sendWhatsAppSchema,
  createWhatsAppTemplateSchema,
  createWhatsAppBroadcastSchema,
} from './whatsapp.validators.js'
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
} from '../../integrations/whatsapp/controller.js'

import {
  sendUnifiedHandler,
  optOutHandler,
  optBackInHandler,
  getQuickTemplatesHandler,
  createQuickTemplateHandler,
} from './comm.controller.js'
import {
  sendUnifiedSchema,
  optOutSchema,
  optBackInSchema,
  createQuickTemplateSchema,
} from './comm.validators.js'

const router = Router()

// ── Public Meta Webhooks (No Cookie Auth) ───────────────
router.get('/whatsapp/webhook', verifyWebhook)
router.post('/whatsapp/webhook', handleWebhook)
router.get('/webhook', verifyWebhook)
router.post('/webhook', handleWebhook)

// ── Authenticated Communication Endpoints (Strict Tenant Scoping) ────────
router.use(authenticate, strictCommunicationScope)

// ── Unified Multi-Channel Endpoints (Email / SMS / WhatsApp / Voice) ──
router.post('/send', validate(sendUnifiedSchema), sendUnifiedHandler)
router.post('/opt-out', validate(optOutSchema), optOutHandler)
router.post('/opt-back-in', validate(optBackInSchema), optBackInHandler)
router.get('/templates', getQuickTemplatesHandler)
router.post('/templates', validate(createQuickTemplateSchema), createQuickTemplateHandler)

// ── WhatsApp Endpoints ──────────────────────────────────
router.get('/whatsapp/status', getIntegrationStatusHandler)
router.post('/whatsapp/signup-launch', launchSignupHandler)
router.post('/whatsapp/callback', handleCallbackHandler)
router.post('/whatsapp/session-event', handleSessionEventHandler)
router.post('/whatsapp/callback-timeout', handleCallbackTimeoutHandler)
router.post('/whatsapp/retry', handleRetryHandler)
router.post('/whatsapp/restart', handleRestartHandler)
router.post('/whatsapp/confirm-payment', handleConfirmPaymentHandler)
router.post('/whatsapp/disconnect-fsm', handleDisconnectHandler)
router.get('/whatsapp/config', getTenantConfigHandler)
router.patch('/whatsapp/config', updateTenantConfigHandler)
router.post('/whatsapp/test-connection', testTenantConnectionHandler)
router.post('/whatsapp/disconnect', disconnectTenantHandler)
router.get('/whatsapp/templates', getTemplates)
router.post('/whatsapp/templates', validate(createWhatsAppTemplateSchema), createTemplate)
router.post('/whatsapp/send', validate(sendWhatsAppSchema), sendMessage)
router.get('/whatsapp/broadcasts', getBroadcasts)
router.post('/whatsapp/broadcast', validate(createWhatsAppBroadcastSchema), createBroadcast)
router.post('/whatsapp/simulate-inbound', simulateInbound)

export const communicationRoutes = router
