import { Router } from 'express'
import {
  list,
  get,
  create,
  update,
  remove,
  createStage,
  patchStage,
  patchReorder,
  removeStage,
} from './pipeline.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  createPipelineSchema,
  updatePipelineSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
} from './pipeline.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All pipeline routes require authentication + tenant scoping
router.use(authenticate, tenantScope)

// ── Pipeline CRUD ────────────────────────────────────

// List pipelines — all roles can view
router.get(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD, USER_ROLES.AGENT),
  list
)

// Get single pipeline
router.get(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD, USER_ROLES.AGENT),
  get
)

// Create pipeline — brokerage_owner+ only
router.post(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(createPipelineSchema),
  create
)

// Update pipeline — brokerage_owner+ only
router.patch(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(updatePipelineSchema),
  update
)

// Delete pipeline — brokerage_owner+ only
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  remove
)

// ── Stage CRUD ───────────────────────────────────────

// Reorder stages (must be above /:stageId to avoid route collision)
router.patch(
  '/:id/stages/reorder',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(reorderStagesSchema),
  patchReorder
)

// Add stage
router.post(
  '/:id/stages',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(createStageSchema),
  createStage
)

// Update stage
router.patch(
  '/:id/stages/:stageId',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate({ body: updateStageSchema }),
  patchStage
)

// Delete stage
router.delete(
  '/:id/stages/:stageId',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  removeStage
)

export const pipelineRoutes = router
