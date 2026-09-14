import { Router } from 'express'
import {
  getNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
  deleteNotificationHandler,
} from './notification.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { listNotificationsQuerySchema } from './notification.validators.js'

const router = Router()

router.use(authenticate, tenantScope)

// List notifications with bounded pagination and query validation
router.get('/', validate({ query: listNotificationsQuerySchema }), getNotificationsHandler)

// Mark single notification as read
router.patch('/:id/read', markReadHandler)

// Mark all notifications as read
router.patch('/read-all', markAllReadHandler)

// Soft delete notification (with unread replacement)
router.delete('/:id', deleteNotificationHandler)
router.patch('/:id/delete', deleteNotificationHandler)

export const notificationRoutes = router
