import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import * as dashboardController from './dashboard.controller.js'

const router = Router()

router.use(authenticate, tenantScope)

router.get('/kpis', dashboardController.getKpis)
router.get('/lead-sources', dashboardController.getLeadSources)
router.get('/leads-over-time', dashboardController.getLeadsOverTime)
router.get('/pipeline-summary', dashboardController.getPipelineSummary)
router.get('/activity-feed', dashboardController.getActivityFeed)
router.get('/lead-portal', dashboardController.getLeadPortal)

export default router
