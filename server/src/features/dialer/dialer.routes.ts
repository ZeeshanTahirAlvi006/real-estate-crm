import { Router } from 'express'
import {
  getQueue,
  enqueue,
  clear,
  getLogs,
  saveDisposition,
  getDrops,
  createDrop,
  getStats,
  getToken,
} from './dialer.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  saveDispositionSchema,
  createVoicemailDropSchema,
  enqueueContactsSchema,
} from './dialer.validators.js'

const router = Router()

// All dialer routes require authentication and tenant scoping
router.use(authenticate, tenantScope)

// Smart Queue management
router.get('/queue', getQueue)
router.post('/queue/enqueue', validate({ body: enqueueContactsSchema }), enqueue)
router.post('/queue/clear', clear)

// Call logs & disposition tracking
router.get('/call-logs', getLogs)
router.post('/call-logs', validate({ body: saveDispositionSchema }), saveDisposition)

// Voicemail drop library
router.get('/voicemail-drops', getDrops)
router.post('/voicemail-drops', validate({ body: createVoicemailDropSchema }), createDrop)

// Analytics & Telephony token
router.get('/stats', getStats)
router.get('/token', getToken)

export const dialerRoutes = router
