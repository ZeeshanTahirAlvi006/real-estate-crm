import { Router } from 'express'
import {
  simulateChat,
  getConfigHandler,
  updateConfigHandler,
  getCriteria,
  createCriteriaHandler,
  updateCriteria,
  deleteCriteriaHandler,
  getCampaigns,
  getCampaignByIdHandler,
  createCampaign,
  updateCampaignHandler,
  deleteCampaignHandler,
  startCampaignHandler,
  pauseCampaignHandler,
  getCampaignMetricsHandler,
  executeCampaignHandler,
  toggleCampaign,
  getSpeedMetrics,
  testWhatsAppHandshakeHandler,
} from './aiIsa.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  simulateChatSchema,
  updateAiIsaConfigSchema,
  createCriteriaSchema,
  updateCriteriaSchema,
  createCampaignSchema,
  updateCampaignSchema,
} from './aiIsa.validators.js'

const router = Router()

// All AI ISA routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// ── AI ISA Config ───────────────────────────────────────
router.get('/config', getConfigHandler)
router.patch('/config', validate({ body: updateAiIsaConfigSchema }), updateConfigHandler)

// ── Interactive Chat Simulator ──────────────────────────
router.post('/simulate', validate({ body: simulateChatSchema }), simulateChat)

// ── Qualification Criteria CRUD ─────────────────────────
router.get('/qualification-criteria', getCriteria)
router.post('/qualification-criteria', validate({ body: createCriteriaSchema }), createCriteriaHandler)
router.put('/qualification-criteria/:id', validate({ body: updateCriteriaSchema }), updateCriteria)
router.delete('/qualification-criteria/:id', deleteCriteriaHandler)

// ── Reactivation Campaigns ──────────────────────────────
router.get('/campaigns', getCampaigns)
router.get('/campaigns/:id', getCampaignByIdHandler)
router.post('/campaigns', validate({ body: createCampaignSchema }), createCampaign)
router.patch('/campaigns/:id', validate({ body: updateCampaignSchema }), updateCampaignHandler)
router.delete('/campaigns/:id', deleteCampaignHandler)

// ── Campaign Actions ────────────────────────────────────
router.post('/campaigns/:id/start', startCampaignHandler)
router.post('/campaigns/:id/pause', pauseCampaignHandler)
router.post('/campaigns/:id/execute', executeCampaignHandler)
router.post('/campaigns/:id/toggle', toggleCampaign)
router.get('/campaigns/:id/metrics', getCampaignMetricsHandler)

// ── Speed-to-Lead KPIs ──────────────────────────────────
router.get('/speed-to-lead', getSpeedMetrics)

// ── Live WhatsApp Interactive Testing ───────────────────
router.post('/test-whatsapp-handshake', testWhatsAppHandshakeHandler)

export const aiIsaRoutes = router
