import { Router } from 'express'
import { getAuditLogs } from './audit.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { listAuditLogsQuerySchema } from './audit.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// Audit log viewing is restricted to Super Admins and Brokerage Owners (strictly tenant-scoped)
router.get(
  '/',
  authenticate,
  tenantScope,
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER),
  validate({ query: listAuditLogsQuerySchema }),
  getAuditLogs
)

export const auditRoutes = router
