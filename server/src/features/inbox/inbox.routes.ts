import { Router } from 'express'
import {
  getConversationsHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
  toggleAiIsaHandler,
  startConversationHandler,
} from './inbox.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { strictCommunicationScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  sendMessageSchema,
  startConversationSchema,
  toggleAiIsaSchema,
} from './inbox.validators.js'

const router = Router()

// All inbox routes require authenticated session & strict communication tenant scoping
router.use(authenticate, strictCommunicationScope)

// Conversations list
router.get('/conversations', getConversationsHandler)

// Start or retrieve conversation with a contact
router.post('/conversations/start', validate(startConversationSchema), startConversationHandler)

// Get paginated messages for a conversation
router.get('/conversations/:id/messages', getMessagesHandler)

// Send a message
router.post('/conversations/:id/messages', validate(sendMessageSchema), sendMessageHandler)

// Mark conversation messages as read
router.patch('/conversations/:id/read', markReadHandler)

// Toggle AI ISA autonomous qualification mode
router.patch('/conversations/:id/ai-isa', validate(toggleAiIsaSchema), toggleAiIsaHandler)

export const inboxRoutes = router
