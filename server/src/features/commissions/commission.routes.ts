import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { strictOperationalScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { commissionController } from './commission.controller.js'
import {
  calculateCommissionSchema,
  createCommissionSchema,
  updateCommissionStatusSchema,
  updateBrokerageCapSchema,
  updateAgentCapSchema,
} from './commission.validators.js'

const router = Router()

// All commission endpoints require authentication and operational tenancy isolation
router.use(authenticate)
router.use(strictOperationalScope)

// Brokerage & Agent Cap Configuration
router.get('/settings/cap', commissionController.getCapSettings)
router.patch('/settings/cap', validate(updateBrokerageCapSchema), commissionController.updateBrokerageCap)
router.patch('/agents/:agentId/cap', validate(updateAgentCapSchema), commissionController.updateAgentCap)

// Calculation & Aggregations
router.post('/calculate', validate(calculateCommissionSchema), commissionController.calculate)
router.get('/report', commissionController.getReport)

// Commission Settlements CRUD
router.get('/', commissionController.list)
router.get('/:id', commissionController.getById)
router.post('/', validate(createCommissionSchema), commissionController.create)
router.patch(
  '/:id/status',
  validate(updateCommissionStatusSchema),
  commissionController.updateStatus
)

export const commissionRoutes = router
