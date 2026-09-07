import { Router } from 'express'
import { uploadFile, getFiles, removeFile } from './file.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { uploadMiddleware } from '../../middleware/upload.js'

const router = Router()

// All file routes require authenticated session & tenant scoping
router.use(authenticate, tenantScope)

// Upload file(s)
router.post('/upload', uploadMiddleware.array('files', 10), uploadFile)

// List brokerage files
router.get('/', getFiles)

// Delete file by ID
router.delete('/:id', removeFile)

export const fileRoutes = router
