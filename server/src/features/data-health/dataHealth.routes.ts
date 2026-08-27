import { Router } from 'express'
import {
  getScore,
  listDuplicates,
  triggerDuplicateScan,
  triggerEmailScan,
  triggerPhoneScan,
  triggerFullScan,
  merge,
  dismiss,
} from './dataHealth.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { mergeCandidateSchema, candidateIdParamSchema } from './dataHealth.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All data-health routes require authenticated session & tenant scoping
router.use(
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD
  )
)

// Retrieve aggregate data health score & grade
router.get('/score', getScore)

// List duplicate candidates
router.get('/duplicates', listDuplicates)

// Trigger on-demand scans
router.post('/scan/deduplication', triggerDuplicateScan)
router.post('/scan/email-validation', triggerEmailScan)
router.post('/scan/phone-verification', triggerPhoneScan)
router.post('/scan/all', triggerFullScan)

// Merge contacts
router.post(
  '/duplicates/:id/merge',
  validate({ params: candidateIdParamSchema, body: mergeCandidateSchema }),
  merge
)

// Dismiss duplicate candidate
router.post(
  '/duplicates/:id/dismiss',
  validate({ params: candidateIdParamSchema }),
  dismiss
)

export const dataHealthRoutes = router
