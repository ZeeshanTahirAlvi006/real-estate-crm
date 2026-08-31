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
  matchPresence,
  startParallel,
  summarizeCall,
} from './dialer.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  saveDispositionSchema,
  createVoicemailDropSchema,
  enqueueContactsSchema,
  matchLocalPresenceSchema,
  startParallelSessionSchema,
  summarizeCallSchema,
} from './dialer.validators.js'

const router = Router()

// All dialer routes require authentication and tenant scoping
router.use(authenticate, tenantScope)

// Smart Queue management
router.get('/queue', getQueue)
router.post('/queue/enqueue', validate(enqueueContactsSchema), enqueue)
router.post('/queue/clear', clear)

// Call logs & disposition tracking
router.get('/call-logs', getLogs)
router.post('/call-logs', validate(saveDispositionSchema), saveDisposition)

// Voicemail drop library
router.get('/voicemail-drops', getDrops)
router.post('/voicemail-drops', validate(createVoicemailDropSchema), createDrop)

// Local Presence Caller ID Matcher
router.post('/local-presence/match', validate(matchLocalPresenceSchema), matchPresence)

// Parallel Power Dialer (1, 3, 5-Line) Session Manager
router.post('/parallel/start', validate(startParallelSessionSchema), startParallel)

// AI Call Summarization
router.post('/summarize-call', validate(summarizeCallSchema), summarizeCall)

// Analytics & Telephony token
router.get('/stats', getStats)
router.get('/token', getToken)

export const dialerRoutes = router
