import { Router } from 'express'
import { getFeatureFlags, toggleFeature } from './featureFlag.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { toggleFeatureFlagSchema } from './featureFlag.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// Read feature flags (Available to any authenticated role for UI adaptability)
router.get('/', authenticate, getFeatureFlags)

// Toggle feature flag (Strictly Super Admin only)
router.patch(
  '/:key',
  authenticate,
  authorize(USER_ROLES.SUPER_ADMIN),
  validate(toggleFeatureFlagSchema),
  toggleFeature
)

export const featureFlagRoutes = router
