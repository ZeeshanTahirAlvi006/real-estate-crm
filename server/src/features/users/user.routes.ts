import { Router } from 'express'
import {
  listUsers,
  getUser,
  invite,
  updateProfile,
  changeRole,
  removeUser,
} from './user.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  inviteUserSchema,
  updateUserSchema,
  changeUserRoleSchema,
  listUsersQuerySchema,
} from './user.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All user routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// List users (Admins & Team Leads)
router.get(
  '/',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD),
  validate({ query: listUsersQuerySchema }),
  listUsers
)

// Invite user (Admins & Team Leads)
router.post(
  '/invite',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD),
  validate(inviteUserSchema),
  invite
)

// Get single user detail
router.get('/:id', getUser)

// Update user profile
router.patch('/:id', validate(updateUserSchema), updateProfile)

// Change user role (Super Admin & Brokerage Owner only)
router.patch(
  '/:id/role',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate(changeUserRoleSchema),
  changeRole
)

// Deactivate user (Super Admin & Brokerage Owner only)
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  removeUser
)

export const userRoutes = router
