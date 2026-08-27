import { Router } from 'express'
import {
  simulateChat,
  getCriteria,
  updateCriteria,
  getCampaigns,
  createCampaign,
  executeCampaignHandler,
  toggleCampaign,
  getSpeedMetrics,
} from './aiIsa.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  simulateChatSchema,
  createCampaignSchema,
  updateCriteriaSchema,
} from './aiIsa.validators.js'

const router = Router()

// All AI ISA routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// Interactive Chat Simulator
router.post('/simulate', validate({ body: simulateChatSchema }), simulateChat)

// Qualification Criteria CRUD
router.get('/qualification-criteria', getCriteria)
router.put('/qualification-criteria/:id', validate({ body: updateCriteriaSchema }), updateCriteria)

// Reactivation Campaigns
router.get('/campaigns', getCampaigns)
router.post('/campaigns', validate({ body: createCampaignSchema }), createCampaign)
router.post('/campaigns/:id/execute', executeCampaignHandler)
router.post('/campaigns/:id/toggle', toggleCampaign)

// Speed-to-Lead KPIs
router.get('/speed-to-lead', getSpeedMetrics)

export const aiIsaRoutes = router
