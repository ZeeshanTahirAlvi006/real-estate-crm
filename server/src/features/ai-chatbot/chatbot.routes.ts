import { Router } from 'express'
import {
  qualifyHandler,
  qualifyStreamHandler,
  draftResponseHandler,
  summarizeHandler,
  suggestNextActionHandler,
  fairHousingCheckHandler,
  dncCheckHandler,
} from './chatbot.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import {
  qualifyLeadSchema,
  draftResponseSchema,
  summarizeSchema,
  suggestNextActionSchema,
  fairHousingCheckSchema,
  dncCheckSchema,
} from './chatbot.validators.js'

const chatbotRouter = Router()
const complianceRouter = Router()

chatbotRouter.use(authenticate, tenantScope)
complianceRouter.use(authenticate, tenantScope)

// 1. Lead Qualification Bot (Standard JSON & SSE Token Stream)
chatbotRouter.post('/qualify', validate(qualifyLeadSchema), qualifyHandler)
chatbotRouter.post('/qualify/stream', validate(qualifyLeadSchema), qualifyStreamHandler)

// 2. Agent Copilot Drafts
chatbotRouter.post('/draft-response', validate(draftResponseSchema), draftResponseHandler)

// 3. Conversation & Call Summarizer
chatbotRouter.post('/summarize', validate(summarizeSchema), summarizeHandler)

// 4. Next Best Actions
chatbotRouter.post('/suggest-next-action', validate(suggestNextActionSchema), suggestNextActionHandler)

// 5. Fair Housing Compliance Scan
complianceRouter.post('/fair-housing-check', validate(fairHousingCheckSchema), fairHousingCheckHandler)

// 6. TCPA & Do Not Call (DNC) Registry Check
complianceRouter.post('/dnc-check', validate(dncCheckSchema), dncCheckHandler)

export const chatbotRoutes = chatbotRouter
export const complianceRoutes = complianceRouter
