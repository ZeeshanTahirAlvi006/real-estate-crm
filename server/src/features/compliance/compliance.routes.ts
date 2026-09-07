import { Router } from 'express'
import {
  getDashboardHandler,
  dncCheckHandler,
  recordConsentHandler,
  processOptOutHandler,
  sendOptInVerificationHandler,
  confirmOptInHandler,
  scanFairHousingHandler,
} from './compliance.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  dncCheckSchema,
  recordConsentSchema,
  processOptOutSchema,
  verifyOptInSchema,
  confirmOptInSchema,
  fairHousingScanSchema,
} from './compliance.validators.js'

const router = Router()

// All compliance routes require authentication & multi-tenant scoping
router.use(authenticate, tenantScope)

// 1. Compliance Dashboard
router.get('/dashboard', getDashboardHandler)

// 2. TCPA & DNC Registry Checks
router.post('/tcpa/dnc-check', validate(dncCheckSchema), dncCheckHandler)
router.post('/dnc-check', validate(dncCheckSchema), dncCheckHandler) // Alias

// 3. Multi-Channel Consent Recording
router.post('/tcpa/consent/:contactId', validate(recordConsentSchema), recordConsentHandler)

// 4. Universal 1-Click Opt-Out (STOP handler)
router.post('/tcpa/opt-out', validate(processOptOutSchema), processOptOutHandler)

// 5. Double Opt-In Verification
router.post('/tcpa/verify-opt-in', validate(verifyOptInSchema), sendOptInVerificationHandler)
router.post('/tcpa/confirm-opt-in', validate(confirmOptInSchema), confirmOptInHandler)

// 6. Fair Housing Scanner
router.post('/fair-housing/scan', validate(fairHousingScanSchema), scanFairHousingHandler)
router.post('/fair-housing-check', validate(fairHousingScanSchema), scanFairHousingHandler) // Alias

export const complianceRoutes = router
