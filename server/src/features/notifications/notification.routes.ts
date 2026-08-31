import { Router } from 'express'
import {
  getNotificationsHandler,
  markReadHandler,
  markAllReadHandler,
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

export const notificationRoutes = router
