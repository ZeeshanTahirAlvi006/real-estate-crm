import { Router } from 'express'
import {
  list,
  getDetail,
  create,
  update,
  remove,
} from './brokerage.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  createBrokerageSchema,
  updateBrokerageSchema,
} from './brokerage.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All brokerage routes require authentication
router.use(authenticate)

// List all brokerages (Super Admin only)
router.get('/', authorize(USER_ROLES.SUPER_ADMIN), list)

// Create new brokerage (Super Admin only)
router.post(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN),
  validate(createBrokerageSchema),
  create
)

// Get single brokerage detail (Super Admin or Brokerage Owner of that brokerage)
router.get(
  '/:id',
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  getDetail
)

// Update brokerage settings/plan (Super Admin or Brokerage Owner)
router.patch(
  '/:id',
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(updateBrokerageSchema),
  update
)

// Deactivate brokerage (Super Admin only)
router.delete('/:id', authorize(USER_ROLES.SUPER_ADMIN), remove)

export const brokerageRoutes = router
