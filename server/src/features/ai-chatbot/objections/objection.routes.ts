import { Router } from 'express'
import {
  classifyHandler,
  generateRebuttalHandler,
  getPlaybooksHandler,
  savePlaybookHandler,
  deletePlaybookHandler,
} from './objection.controller.js'
import { validate } from '../../../middleware/validate.js'
import {
  classifyObjectionSchema,
  generateRebuttalSchema,
  savePlaybookSchema,
} from './objection.validators.js'

const router = Router()

// 1. Objection Classifier
router.post('/classify', validate(classifyObjectionSchema), classifyHandler)

// 2. Multi-Angle Rebuttal Generator
router.post('/rebuttal', validate(generateRebuttalSchema), generateRebuttalHandler)

// 3. Objection Playbook Management
router.get('/playbook', getPlaybooksHandler)
router.post('/playbook', validate(savePlaybookSchema), savePlaybookHandler)
router.delete('/playbook/:id', deletePlaybookHandler)

export const objectionRoutes = router
