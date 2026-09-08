import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { radarController } from './radar.controller.js'
import {
  analyzePropertySchema,
  prospectsQuerySchema,
  generateCmaSchema,
  cmaParamSchema,
  triggerAnniversarySchema,
} from './radar.validators.js'
import { cmaStoryRoutes } from './cma-ai/cmaStory.routes.js'

const router = Router()

// 1. Public Unauthenticated Endpoint for Micro-CMA Landing Pages
// Must be mounted before authenticate middleware so homeowners can view without login
router.get('/cma/:id', validate(cmaParamSchema), radarController.getPublicCma)

// 2. Authenticated Endpoints
router.use(authenticate)

// Dashboard KPIs
router.get('/dashboard', radarController.getDashboard)

// High-Equity Ranked Prospects
router.get('/prospects', validate(prospectsQuerySchema), radarController.getProspects)

// Property Equity & Comps Analysis (ATTOM / Fallback Engine)
router.post('/analyze', validate(analyzePropertySchema), radarController.analyze)

// Generate Micro-CMA Landing Page
router.post('/cma/generate', validate(generateCmaSchema), radarController.generateCma)

// AI Micro-CMA Storytelling & Equity Narrative Engine (Sprint 24)
router.use('/cma', cmaStoryRoutes)

// Manual Anniversary Scan Trigger (For verification & testing)
router.post('/anniversary/trigger', validate(triggerAnniversarySchema), radarController.triggerAnniversary)

export const radarRoutes = router
