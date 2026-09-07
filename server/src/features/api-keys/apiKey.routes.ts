import { Router } from 'express'
import { getApiKeys, createApiKey, removeApiKey } from './apiKey.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { createApiKeySchema } from './apiKey.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All API key management routes require authenticate, tenant scope, and Admin privileges
router.use(
  authenticate,
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER)
)

// List API keys
router.get('/', getApiKeys)

// Generate API key
router.post('/', validate(createApiKeySchema), createApiKey)

// Revoke API key
router.delete('/:id', removeApiKey)

export const apiKeyRoutes = router
