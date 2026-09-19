import { Router } from 'express'
import multer from 'multer'
import { whisperController } from './whisper.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { requireFeature } from '../../middleware/featureFlag.js'

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 },
})

const router = Router()

// All transcription routes require authentication, tenant scoping, and transcription feature flag
router.use(authenticate, tenantScope, requireFeature('transcription'))

router.post('/voice-note', upload.single('audio'), (req, res, next) =>
  whisperController.uploadVoiceNote(req, res, next)
)
router.post('/extract-text', (req, res, next) =>
  whisperController.extractFromText(req, res, next)
)
router.get('/contact/:contactId', (req, res, next) =>
  whisperController.getContactVoiceNotes(req, res, next)
)

export const whisperRoutes = router
