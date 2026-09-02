import { Router } from 'express'
import {
  getContacts,
  getContact,
  create,
  update,
  remove,
  addNote,
  getActivities,
  bulkAction,
  getPortalInvite,
} from './contact.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  createContactSchema,
  updateContactSchema,
  addNoteSchema,
  bulkContactActionSchema,
  listContactsQuerySchema,
} from './contact.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

const router = Router()

// All contact routes require authenticated session & tenant scoping
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

// List contacts with search, dynamic filters & pagination
router.get('/', validate({ query: listContactsQuerySchema }), getContacts)

// Create a new contact
router.post('/', validate(createContactSchema), create)

// Bulk actions on multiple contacts (bulk tags, bulk status, bulk assign)
router.patch('/bulk', validate(bulkContactActionSchema), bulkAction)

// Get single contact detail with recent timeline
router.get('/:id', getContact)

// Update contact profile & details
router.patch('/:id', validate(updateContactSchema), update)

// Delete / archive contact (Admins and Team Leads only)
router.delete(
  '/:id',
  authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD),
  remove
)

// Add note to contact (generates immutable activity log)
router.post('/:id/notes', validate(addNoteSchema), addNote)

// Get paginated activity timeline for contact
router.get('/:id/activities', getActivities)

// VIP Lead Portal invitation generation and WhatsApp details
router.get('/:id/portal-invite', getPortalInvite)
router.post('/:id/portal-invite', getPortalInvite)

export const contactRoutes = router
