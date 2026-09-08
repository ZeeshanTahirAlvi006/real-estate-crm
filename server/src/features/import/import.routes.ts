import { Router } from 'express'
import { previewImport, confirmImport } from './import.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { uploadMiddleware } from '../../middleware/upload.js'

const router = Router()

// All CSV import routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// Upload CSV and get header mapping preview
router.post('/preview', uploadMiddleware.single('file'), previewImport)

// Confirm column mapping and execute batch import into DB
router.post('/confirm', uploadMiddleware.single('file'), confirmImport)

export const importRoutes = router
