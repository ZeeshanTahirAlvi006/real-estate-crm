import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { validate } from '../../middleware/validate.js'
import * as smartListController from './smartList.controller.js'
import {
  createSmartListSchema,
  updateSmartListSchema,
  previewSmartListSchema,
} from './smartList.validators.js'

const router = Router()

router.use(authenticate, tenantScope)

router.get('/', smartListController.getSmartLists)

router.post(
  '/',
  validate(createSmartListSchema),
  smartListController.createSmartList
)

router.patch(
  '/:id',
  validate(updateSmartListSchema),
  smartListController.updateSmartList
)

router.delete('/:id', smartListController.deleteSmartList)

router.post(
  '/preview',
  validate(previewSmartListSchema),
  smartListController.previewSmartList
)

export default router
