import { Router } from 'express'
import {
  getMySettings,
  updateNotifications,
  getBrokerageConfig,
  updateBrokerageConfigSettings,
} from './settings.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  updateNotificationPrefsSchema,
  updateBrokerageConfigSchema,
} from './settings.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All settings routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// User-level endpoints
router.get('/me', getMySettings)
router.patch('/me/notifications', validate(updateNotificationPrefsSchema), updateNotifications)

// Brokerage-level endpoints
router.get('/brokerage', getBrokerageConfig)
router.patch(
  '/brokerage',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(updateBrokerageConfigSchema),
  updateBrokerageConfigSettings
)

export const settingsRoutes = router
