import { Router } from 'express'
import { getLiveness, getDetailedHealth } from './health.controller.js'
import { authenticate } from '../../middleware/authenticate.js'

const router = Router()

// Basic liveness probe (Public endpoint for Render / Docker / load balancers)
router.get('/', getLiveness)

// Detailed system health probe (Requires auth token or internal header)
router.get('/detailed', (req, res, next) => {
  if (req.headers['x-health-check-key']) {
    return getDetailedHealth(req, res, next)
  }
  return authenticate(req, res, () => getDetailedHealth(req, res, next))
})

export const healthRoutes = router
