import { Router } from 'express'
import {
  getIntegrations,
  getIntegration,
  saveIntegration,
  testIntegration,
  removeIntegration,
} from './integration.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { saveIntegrationSchema, testIntegrationSchema } from './integration.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All integration routes require authenticated session, tenant scoping, & Admin privileges
router.use(
  authenticate,
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER)
)

// List configured integrations
router.get('/', getIntegrations)

// Create or update an integration connector
router.post('/', validate(saveIntegrationSchema), saveIntegration)

// Get single integration detail
router.get('/:provider', getIntegration)

// Test integration connection
router.post('/:provider/test', validate(testIntegrationSchema), testIntegration)

// Disconnect integration
router.delete('/:provider', removeIntegration)

export const integrationRoutes = router
