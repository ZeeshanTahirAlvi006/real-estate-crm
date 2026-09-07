import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { commissionController } from './commission.controller.js'
import {
  calculateCommissionSchema,
  createCommissionSchema,
  updateCommissionStatusSchema,
} from './commission.validators.js'

const router = Router()

// All commission endpoints require authentication
router.use(authenticate)

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
