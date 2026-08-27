import { Router } from 'express'
import {
  list,
  kanban,
  get,
  create,
  update,
  moveStage,
  remove,
} from './deal.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  createDealSchema,
  updateDealSchema,
  moveDealStageSchema,
  listDealsQuerySchema,
} from './deal.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All deal routes require authentication + tenant scoping
router.use(
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD,
    USER_ROLES.AGENT
  )
)

// Kanban view (must be above /:id to avoid route collision)
router.get('/kanban/:pipelineId', kanban)

// List deals with filters + pagination
router.get('/', validate({ query: listDealsQuerySchema }), list)

// Create deal
router.post('/', validate(createDealSchema), create)

// Get single deal
router.get('/:id', get)

// Update deal
router.patch('/:id', validate(updateDealSchema), update)

// Move deal to a new stage (sequential transition)
router.patch('/:id/stage', validate(moveDealStageSchema), moveStage)

// Soft-delete deal (team_lead+ only)
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD),
  remove
)

export const dealRoutes = router
