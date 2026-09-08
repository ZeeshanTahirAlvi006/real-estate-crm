import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { esignController } from './esign.controller.js'
import {
  prepareEnvelopeSchema,
  submitSignatureSchema,
  declineSigningSchema,
} from './esign.validators.js'

const router = Router()

// --- Public Standalone Signing Endpoints (No CRM Auth Cookie Required) ---
router.get('/sign/:token', esignController.getSigningSession)
router.post('/sign/:token/complete', validate(submitSignatureSchema), esignController.completeSigning)
router.post('/sign/:token/decline', validate(declineSigningSchema), esignController.declineSigning)

// --- Authenticated CRM Broker / Agent Endpoints ---
router.use(authenticate)

router.get('/templates', esignController.getTemplates)
router.get('/', esignController.list)
router.get('/:id', esignController.getById)
router.post('/prepare', validate(prepareEnvelopeSchema), esignController.prepare)
router.post('/:id/send', esignController.send)
router.post('/:id/void', esignController.voidEnvelope)

export const esignRoutes = router
