import { Router } from 'express'
import {
  createLeadSourceHandler,
  listLeadSourcesHandler,
  getLeadSourceHandler,
  updateLeadSourceHandler,
  deleteLeadSourceHandler,
  rotateSecretHandler,
  createRoutingRuleHandler,
  listRoutingRulesHandler,
  getRoutingRuleHandler,
  updateRoutingRuleHandler,
  deleteRoutingRuleHandler,
  getScoringConfigHandler,
  updateScoringConfigHandler,
  webhookIngestHandler,
  captureWidgetHandler,
  manualLeadEntryHandler,
  acknowledgeLeadsHandler,
} from './lead.controller.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { tenantScope } from '../../middleware/tenantScope.js'
import { requireFeature } from '../../middleware/featureFlag.js'
import { validate } from '../../middleware/validate.js'
import {
  createLeadSourceSchema,
  updateLeadSourceSchema,
  listLeadSourcesQuerySchema,
  createRoutingRuleSchema,
  updateRoutingRuleSchema,
  listRoutingRulesQuerySchema,
  leadIngestSchema,
  leadCaptureSchema,
  manualLeadEntrySchema,
  leadAcknowledgeSchema,
  updateScoringConfigSchema,
} from './lead.validators.js'
import { USER_ROLES } from '../../utils/constants.js'

// ═══════════════════════════════════════════
//  Lead Ingestion Routes (public + webhook)
// ═══════════════════════════════════════════

export const leadIngestionRoutes = Router()

// Public endpoint — embeddable widget (no auth, rate-limited externally, feature-gated)
leadIngestionRoutes.post(
  '/capture',
  requireFeature('lead_ingestion'),
  validate(leadCaptureSchema),
  captureWidgetHandler
)

// Webhook endpoint — HMAC-authenticated (no user auth, feature-gated)
leadIngestionRoutes.post(
  '/ingest',
  requireFeature('lead_ingestion'),
  validate(leadIngestSchema),
  webhookIngestHandler
)

// Manual lead entry — authenticated users
leadIngestionRoutes.post(
  '/manual',
  requireFeature('lead_ingestion'),
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD,
    USER_ROLES.AGENT
  ),
  validate(manualLeadEntrySchema),
  manualLeadEntryHandler
)

// Acknowledge leads — agents and above
leadIngestionRoutes.patch(
  '/acknowledge',
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD,
    USER_ROLES.AGENT
  ),
  validate(leadAcknowledgeSchema),
  acknowledgeLeadsHandler
)

// ═══════════════════════════════════════════
//  Lead Source CRUD Routes (brokerage_owner+)
// ═══════════════════════════════════════════

export const leadSourceRoutes = Router()

// All lead source routes require auth + tenant scoping + owner+ role
leadSourceRoutes.use(
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD
  )
)

leadSourceRoutes.get(
  '/',
  validate({ query: listLeadSourcesQuerySchema }),
  listLeadSourcesHandler
)

leadSourceRoutes.post(
  '/',
  validate(createLeadSourceSchema),
  createLeadSourceHandler
)

leadSourceRoutes.get('/:id', getLeadSourceHandler)

leadSourceRoutes.patch(
  '/:id',
  validate(updateLeadSourceSchema),
  updateLeadSourceHandler
)

leadSourceRoutes.delete('/:id', deleteLeadSourceHandler)

// One-click secret rotation
leadSourceRoutes.post('/:id/rotate-secret', rotateSecretHandler)

// ═══════════════════════════════════════════
//  Routing Rule CRUD Routes (brokerage_owner+)
// ═══════════════════════════════════════════

export const routingRuleRoutes = Router()

// All routing rule routes require auth + tenant scoping + owner+ role
routingRuleRoutes.use(
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER,
    USER_ROLES.TEAM_LEAD
  )
)

routingRuleRoutes.get(
  '/',
  validate({ query: listRoutingRulesQuerySchema }),
  listRoutingRulesHandler
)

routingRuleRoutes.post(
  '/',
  validate(createRoutingRuleSchema),
  createRoutingRuleHandler
)

routingRuleRoutes.get('/:id', getRoutingRuleHandler)

routingRuleRoutes.patch(
  '/:id',
  validate(updateRoutingRuleSchema),
  updateRoutingRuleHandler
)

routingRuleRoutes.delete('/:id', deleteRoutingRuleHandler)

// ═══════════════════════════════════════════
//  Scoring Config Routes (brokerage_owner+)
// ═══════════════════════════════════════════

export const scoringConfigRoutes = Router()

scoringConfigRoutes.use(
  authenticate,
  tenantScope,
  authorize(
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.BROKERAGE_OWNER
  )
)

scoringConfigRoutes.get('/', getScoringConfigHandler)

scoringConfigRoutes.put(
  '/',
  validate(updateScoringConfigSchema),
  updateScoringConfigHandler
)
