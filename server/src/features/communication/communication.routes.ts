import { Router, Request, Response } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import {
  verifyWebhook,
  handleWebhook,
  getTemplates,
  createTemplate,
  sendMessage,
  createBroadcast,
  getBroadcasts,
  simulateInbound,
} from './whatsapp.controller.js'
import {
  sendWhatsAppSchema,
  createWhatsAppTemplateSchema,
  createWhatsAppBroadcastSchema,
} from './whatsapp.validators.js'

const router = Router()

// ── Public Meta Webhooks (No Cookie Auth) ───────────────
router.get('/whatsapp/webhook', verifyWebhook)
router.post('/whatsapp/webhook', handleWebhook)

// ── Authenticated Communication Endpoints ────────────────
router.use(authenticate, tenantScope)

export const DEFAULT_QUICK_TEMPLATES = [
  {
    id: 'tmpl-1',
    title: 'Initial Property Inquiry Greeting',
    channel: 'all',
    category: 'intro',
    body: 'Hi {{firstName}}! Thanks for reaching out regarding property listings in {{neighborhood}}. Are you looking to buy, sell, or invest in the near future?',
    variables: ['firstName', 'neighborhood'],
  },
  {
    id: 'tmpl-2',
    title: 'Schedule In-Person Viewing',
    channel: 'all',
    category: 'showing',
    body: 'Hi {{firstName}}, I would love to schedule a private tour of {{propertyAddress}} for you. Does tomorrow afternoon or this weekend work best for your schedule?',
    variables: ['firstName', 'propertyAddress'],
  },
  {
    id: 'tmpl-3',
    title: 'Instant CMA Valuation Report',
    channel: 'all',
    category: 'cma',
    body: 'Hi {{firstName}}, I prepared a customized Comparative Market Analysis (CMA) valuation for your home. You can view the live report here: {{cmaLink}}',
    variables: ['firstName', 'cmaLink'],
  },
  {
    id: 'tmpl-4',
    title: 'Follow-Up on Active Interest',
    channel: 'all',
    category: 'followup',
    body: 'Hi {{firstName}}, just following up to see if you had any questions on the latest properties we reviewed together. Let me know if you would like me to adjust any search criteria!',
    variables: ['firstName'],
  },
  {
    id: 'tmpl-5',
    title: 'Pre-Approval Verification',
    channel: 'all',
    category: 'intro',
    body: 'Hi {{firstName}}, great connecting! Have you already established pre-approval with a preferred lender, or would you like me to introduce you to one of our trusted financing partners?',
    variables: ['firstName'],
  },
]

// GET /api/communication/templates
router.get('/templates', (_req: Request, res: Response) => {
  sendSuccess(res, DEFAULT_QUICK_TEMPLATES, 'Communication templates retrieved successfully')
})

// ── WhatsApp Endpoints ──────────────────────────────────
router.get('/whatsapp/templates', getTemplates)
router.post('/whatsapp/templates', validate(createWhatsAppTemplateSchema), createTemplate)
router.post('/whatsapp/send', validate(sendWhatsAppSchema), sendMessage)
router.get('/whatsapp/broadcasts', getBroadcasts)
router.post('/whatsapp/broadcast', validate(createWhatsAppBroadcastSchema), createBroadcast)
router.post('/whatsapp/simulate-inbound', simulateInbound)

export const communicationRoutes = router
