import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { strictOperationalScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { transactionController } from './transaction.controller.js'
import {
  createTransactionSchema,
  convertDealSchema,
  updateMilestoneSchema,
  uploadDocumentSchema,
} from './transaction.validators.js'

const router = Router()

// All routes require authentication and strict operational multi-tenant scoping
router.use(authenticate)
router.use(strictOperationalScope)

// Client VIP Portal
router.get('/portal', transactionController.getPortalTransaction)

// Transactions CRUD & Conversion
router.get('/', transactionController.list)
router.get('/:id', transactionController.getById)
router.post('/', validate(createTransactionSchema), transactionController.create)
router.post('/from-deal/:dealId', validate(convertDealSchema), transactionController.convertDeal)

// Milestone progression
router.patch(
  '/:id/milestones/:milestoneId',
  validate(updateMilestoneSchema),
  transactionController.updateMilestone
)

// Document Management
router.post(
  '/:id/documents',
  validate(uploadDocumentSchema),
  transactionController.uploadDocument
)
router.delete('/:id/documents/:docId', transactionController.removeDocument)

export const transactionRoutes = router
