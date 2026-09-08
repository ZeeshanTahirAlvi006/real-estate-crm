import { Router } from 'express'
import { exportContacts, exportDeals, exportCommissions } from './export.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'

const router = Router()

// All export routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// Export contacts as CSV or PDF
router.get('/contacts', exportContacts)

// Export deals as CSV or PDF
router.get('/deals', exportDeals)

// Export commission report as CSV or PDF
router.get('/commissions', exportCommissions)

export const exportRoutes = router
