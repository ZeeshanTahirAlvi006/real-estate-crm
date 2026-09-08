import { Router } from 'express'
import {
  getNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
  deleteNotificationHandler,
} from './notification.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'

const router = Router()

router.use(authenticate, tenantScope)

// List notifications
router.get('/', getNotificationsHandler)

// Mark single notification as read
router.patch('/:id/read', markReadHandler)

// Mark all notifications as read
router.patch('/read-all', markAllReadHandler)

// Soft delete notification (with unread replacement)
router.delete('/:id', deleteNotificationHandler)
router.patch('/:id/delete', deleteNotificationHandler)

export const notificationRoutes = router

