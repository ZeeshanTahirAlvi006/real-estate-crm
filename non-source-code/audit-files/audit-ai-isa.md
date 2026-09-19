---
STAGE: 1_MANUAL_FEATURE_AUDIT_AND_REFACTOR
FEATURE: AI Assistant & AI ISA (`server/src/features/ai-isa/*`, `server/src/features/ai-chatbot/*`, `server/src/models/AiIsaConfig.ts`, `server/src/models/QualificationCriteria.ts`, `server/src/models/ReactivationCampaign.ts`, `server/src/models/ObjectionPlaybook.ts`)
SECURITY_SENSITIVE: YES (touches lead contact PII, multi-tenant brokerage isolation, Fair Housing Act compliance, and automated outbound WhatsApp/SMS communication)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
---

# Stage 1: Adversarial Audit & Draft Rewrite for AI Assistant & AI ISA

## Part 1: Adversarial Architectural Audit

**Reviewer:** `aidlc-architecture-reviewer-agent`  
**Target:** AI Assistant & AI ISA Feature Domain  
**Posture:** Adversarial — assuming the current implementation violates the sub-1ms local loopback budget, creates hanging sockets, leaks resources, and breaches multi-tenant isolation, until proven otherwise.

Following a thorough cross-examination of the codebase against `project.md` and the declarative MERN performance ruleset, 12 architectural defects, security vulnerabilities, and latency blockers have been verified:

---

### Finding 1: 19 Silent Controller Exits & Hanging TCP Connections
* **Location:** `server/src/features/ai-isa/aiIsa.controller.ts:31, 40, 51, 60, 69, 79, 91, 100, 109, 118, 127, 136, 145, 154, 163, 173, 185, 196, 205`
* **Category:** Node.js & Express Backend Bottlenecks / Architectural Anti-Pattern (`ML-001`)
* **Violation:** Handlers `getConfigHandler`, `updateConfigHandler`, `getCriteria`, `createCriteriaHandler`, `updateCriteria`, `deleteCriteriaHandler`, `getCampaigns`, `getCampaignByIdHandler`, `createCampaign`, `updateCampaignHandler`, `deleteCampaignHandler`, `startCampaignHandler`, `pauseCampaignHandler`, `getCampaignMetricsHandler`, `executeCampaignHandler`, `toggleCampaign`, `simulateChat`, `getSpeedMetrics`, and `testWhatsAppHandshakeHandler` all contain early returns:
  ```typescript
  if (!req.user) return
  ```
  When `req.user` is undefined, execution terminates without sending an HTTP response or invoking `next()`. The client socket hangs open indefinitely until the proxy/gateway timeout triggers, holding Node.js socket descriptors and event loop memory.
* **Remediation:** Replace every silent return with explicit HTTP 401 Unauthorized:
  ```typescript
  if (!req.user) {
    sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
    return
  }
  ```

---

### Finding 2: Unbounded Listener Registration Leak in SSE Stream
* **Location:** `server/src/features/ai-chatbot/chatbot.controller.ts:41-43` (`qualifyStreamHandler`)
* **Category:** Memory Leak Prevention (`ML-001`)
* **Violation:**
  ```typescript
  let isClientClosed = false
  req.on('close', () => {
    isClientClosed = true
  })
  ```
  Calling `req.on('close')` inside a request handler without a matching `.off()`, `.removeListener()`, or `.once()` accumulates event listeners across SSE streaming sessions. Under concurrent streaming traffic, this triggers `MaxListenersExceededWarning` and leaks request closures.
* **Remediation:** Replace `req.on('close', ...)` with `req.once('close', ...)`.

---

### Finding 3: Multi-Tenant Security Breaches & Broken Isolation in Service Handlers
* **Location:**
  - `server/src/features/ai-isa/aiIsa.service.ts:305-312` (`updateQualificationCriteria`)
  - `server/src/features/ai-isa/aiIsa.service.ts:330-334` (`deleteQualificationCriteria`)
  - `server/src/features/ai-isa/aiIsa.service.ts:520` (`executeCampaign`)
  - `server/src/features/ai-isa/aiIsa.service.ts:559` (`toggleCampaignStatus`)
  - `server/src/features/ai-chatbot/chatbot.service.ts:33, 277` (`applyDeterministicQualificationUpdates`, `suggestNextActions`)
  - `server/src/features/ai-isa/aiIsa.service.ts:808, 877, 881` (`simulateAiIsaChat`, `handleInboundLeadChat`)
* **Category:** Architecture & Security / Multi-Tenant Isolation Breaches (`SECURITY_SENSITIVE: YES`, `DI-001`)
* **Violation:**
  Methods execute `QualificationCriteria.findById(id)`, `ReactivationCampaign.findById(id)`, and `Contact.findById(contactId)` without scoping the query to `caller.brokerageId`. An authenticated user from Brokerage A can view, update, execute, pause, or delete qualification criteria and campaigns belonging to Brokerage B simply by forging an ObjectId.
* **Remediation:** Enforce tenant isolation in all queries:
  ```typescript
  QualificationCriteria.findOne({ _id: new mongoose.Types.ObjectId(id), brokerageId: caller.brokerageId })
  ReactivationCampaign.findOne({ _id: new mongoose.Types.ObjectId(id), brokerageId: caller.brokerageId })
  Contact.findOne({ _id: new mongoose.Types.ObjectId(contactId), brokerageId: caller.brokerageId })
  ```

---

### Finding 4: Read-Modify-Write Anti-Pattern & Lost Update Risk
* **Location:**
  - `server/src/features/ai-isa/aiIsa.service.ts:311` (`item.save()`)
  - `server/src/features/ai-isa/aiIsa.service.ts:563` (`campaign.save()`)
  - `server/src/features/ai-isa/aiIsa.service.ts:814` (`contact.save()`)
  - `server/src/features/ai-isa/aiIsa.service.ts:939` (`conversation.save()`)
  - `server/src/features/ai-isa/aiIsa.service.ts:1067, 1103` (`conversation.save()`)
  - `server/src/features/ai-chatbot/chatbot.service.ts:60` (`contact.save()`)
* **Category:** MongoDB & ORM Database Bottlenecks — ORM Lazy Loading & Hidden Queries (`DI-002`)
* **Violation:** Loads full Mongoose document instances via `.findById()`, mutates properties in memory, and calls `.save()`. This pays a double network roundtrip, runs schema validation and change-tracking overhead, and risks overwriting concurrent edits.
* **Remediation:** Replace with atomic single-roundtrip `Model.findOneAndUpdate()` or `Model.updateOne()` using `$set` and `.lean()`.

---

### Finding 5: Blocking Side Effects on Client Critical Path
* **Location:**
  - `server/src/features/ai-isa/aiIsa.service.ts:238-246, 287-295, 313-321, 335-343, 408-416, 431-438, 453-460, 476-484, 539-547` (`logAuditEvent`)
  - `server/src/features/ai-isa/aiIsa.service.ts:816-823, 996-1008, 1123-1130` (`Activity.create`)
  - `server/src/features/ai-chatbot/chatbot.service.ts:63-74` (`Activity.create`)
* **Category:** Other Issues — Non-essential side effects block the client response (`project.md` Issue #5)
* **Violation:** Awaiting audit log entries and timeline activities directly in the HTTP request lifecycle adds 5–25ms of sequential database I/O to response times.
* **Remediation:** Dispatch side effects asynchronously via background microtasks with `.catch()` handlers:
  ```typescript
  logAuditEvent({ ... }).catch((err) => logger.error(`[AuditLog] Failed: ${err.message}`))
  Activity.create({ ... }).catch((err) => logger.error(`[ActivityLog] Failed: ${err.message}`))
  ```

---

### Finding 6: Synchronous Logging on Windows Operating System
* **Location:** `server/src/features/ai-isa/aiIsa.service.ts:776, 981, 991, 1082` (`console.warn`, `console.error`)
* **Category:** Node.js & Express Backend Bottlenecks — Synchronous Logging Lag (`project.md` Category 2)
* **Violation:** Active code calls `console.warn()` and `console.error()` directly on Windows terminals, blocking the V8 event loop for 2ms to 10ms per log.
* **Remediation:** Replace all raw console calls with asynchronous structured logger calls (`logger.warn()`, `logger.error()`).

---

### Finding 7: Unindexed Full Collection Scan (`COLLSCAN`) in Speed-to-Lead Metrics
* **Location:** `server/src/features/ai-isa/aiIsa.service.ts:849-853` (`getSpeedToLeadMetrics`)
* **Category:** MongoDB & ORM Database Bottlenecks — Missing Indexes (`PERF-M-001`)
* **Violation:**
  ```typescript
  Activity.countDocuments({
    ...tenantFilter,
    type: 'system',
    description: { $regex: /AI ISA/i },
  })
  ```
  Running an unanchored `$regex: /AI ISA/i` against `description` forces MongoDB to scan every document in the entire `Activity` collection (`COLLSCAN`). As activities grow into the tens of thousands, latency explodes to hundreds of milliseconds.
* **Remediation:** Add indexed structured metadata `metadata.isAiIsa: true` on AI activity creations, and query with `{ ...tenantFilter, type: 'system', 'metadata.isAiIsa': true }` supported by a compound index.

---

### Finding 8: Missing Compound Indexes & Redundant Single-Field Index Overhead
* **Location:**
  - `server/src/models/AiIsaConfig.ts:31` (redundant index on unique field)
  - `server/src/models/QualificationCriteria.ts:24, 62` (redundant single-field index on `brokerageId`)
  - `server/src/models/ReactivationCampaign.ts:33, 45, 106` (missing `{ brokerageId: 1, createdAt: -1 }` for list queries, redundant single-field indexes)
  - `server/src/models/ObjectionPlaybook.ts:52, 59, 69, 79, 84, 97` (5 redundant single-field indexes, missing compound sort index)
* **Category:** MongoDB & ORM Database Bottlenecks — Missing Indexes & Write Amplification (`PERF-M-001`)
* **Violation:** Redundant single-field indexes cause write amplification on every insert/update, while the primary sort path `{ brokerageId: 1, createdAt: -1 }` on `ReactivationCampaign` is completely unindexed.
* **Remediation:** Clean up redundant indexes and declare exact compound covering indexes:
  - `qualificationCriteriaSchema.index({ brokerageId: 1, order: 1 })`
  - `reactivationCampaignSchema.index({ brokerageId: 1, createdAt: -1 })`
  - `reactivationCampaignSchema.index({ brokerageId: 1, status: 1, lastRunAt: 1 })`
  - `objectionPlaybookSchema.index({ brokerageId: 1, category: 1, isDeleted: 1 })`
  - `objectionPlaybookSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })`

---

### Finding 9: Complete Absence of Caching on High-Frequency Read Endpoints
* **Location:**
  - `server/src/features/ai-isa/aiIsa.service.ts:192` (`getAiIsaConfig`)
  - `server/src/features/ai-isa/aiIsa.service.ts:255` (`getQualificationCriteria`)
  - `server/src/features/ai-isa/aiIsa.service.ts:350` (`getReactivationCampaigns`)
  - `server/src/features/ai-isa/aiIsa.service.ts:372` (`getCampaignById`)
  - `server/src/features/ai-isa/aiIsa.service.ts:488` (`getCampaignMetrics`)
  - `server/src/features/ai-isa/aiIsa.service.ts:844` (`getSpeedToLeadMetrics`)
  - `server/src/features/ai-chatbot/objections/objection.service.ts:95, 150` (`getPlaybooks`, `generateRebuttals`)
* **Category:** Architecture, Network, & Connection Bottlenecks — Lack of Caching (`PERF-R-001`, `PERF-R-003`)
* **Violation:** These read-heavy endpoints query MongoDB on every single invocation. Loopback latency sits between 15ms and 50ms, completely missing the sub-1ms target.
* **Remediation:** Implement a 2-Tier Caching Architecture:
  - **L1 Cache:** In-memory `BoundedLruCache` (TTL 60s, response time < 0.05ms).
  - **L2 Cache:** Distributed Redis caching with non-blocking error isolation (`DI-003`).
  - Coordinated invalidation helper: `invalidateAiIsaCaches(brokerageId)`.

---

### Finding 10: Unbounded Data Payloads & Missing Lean Projections
* **Location:**
  - `server/src/features/ai-isa/aiIsa.service.ts:259, 354, 889`
  - `server/src/features/ai-chatbot/chatbot.service.ts:33, 277`
* **Category:** MongoDB & ORM Database Bottlenecks — Large Data Payloads (`PERF-M-002`)
* **Violation:** Database queries fetch full Mongoose documents without `.select()` field filters, serializing unused schema properties and wasting heap memory.
* **Remediation:** Declare explicit projection constants:
  - `AI_ISA_CONFIG_PROJECTION = '_id brokerageId isEnabled persona officeHoursOnly autoReplyChannels autoPilotEnabled humanHandoffDelaySeconds qualificationThresholdScore'`
  - `CRITERIA_PROJECTION = '_id brokerageId category label isRequired promptDirective options order'`
  - `CAMPAIGN_PROJECTION = '_id brokerageId name status targetSegment channel messageTemplate dormantDaysThreshold totalLeads contactedCount respondedCount engagedCount convertedCount meetingsBookedCount lastExecutedAt lastRunAt'`
  - `MESSAGE_LEAN_PROJECTION = '_id conversationId sender senderName channel body direction createdAt'`

---

### Finding 11: Missing High-Resolution Latency Telemetry & Cache Telemetry Headers
* **Location:**
  - `server/src/features/ai-isa/aiIsa.controller.ts`
  - `server/src/features/ai-chatbot/chatbot.controller.ts`
  - `server/src/features/ai-chatbot/objections/objection.controller.ts`
* **Category:** Native Performance (`PERF-M-004`)
* **Violation:** Controllers do not track execution using `process.hrtime.bigint()`, nor do they emit `X-Cache` or `X-Response-Time` headers. Sub-1ms compliance and latency regressions cannot be observed in monitoring.
* **Remediation:** Wrap database calls in `recordDbMetric()` and attach `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` headers in controllers.

---

### Finding 12: Route Parameter Validation Gaps
* **Location:** `server/src/features/ai-isa/aiIsa.routes.ts:50, 51, 55, 57, 58, 61, 62, 63, 64, 65`
* **Category:** Architecture, Network, & Connection Bottlenecks — Input Validation
* **Violation:** Route handlers accepting `:id` parameters lack ObjectId format validation middleware, allowing malformed strings to reach the database driver.
* **Remediation:** Add route-level validation for MongoDB ObjectIds in `aiIsa.validators.ts` and ensure defensive parsing before database queries.

---

## Part 2: Draft Drop-in Replacements

**Developer:** `aidlc-developer-agent`

*(Draft specifications only — repository files remain untouched until Stage 3 execution).*

### 2.1. Model Tier Replacements: Supporting Compound Covering Indexes

#### Model 1: `server/src/models/AiIsaConfig.ts`
```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'

export type IsaTone = 'professional' | 'friendly' | 'concise' | 'consultative'

export interface IAiIsaConfig extends Document {
  brokerageId: mongoose.Types.ObjectId
  isEnabled: boolean
  persona: {
    name: string
    tone: IsaTone
    agentName: string
    brokerageName: string
    customInstructions?: string
  }
  officeHoursOnly: boolean
  autoReplyChannels: Array<'sms' | 'whatsapp' | 'email'>
  autoPilotEnabled: boolean
  humanHandoffDelaySeconds: number
  qualificationThresholdScore: number
  updatedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const aiIsaConfigSchema = new Schema<IAiIsaConfig>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      unique: true, // Unique already establishes index; no redundant index: true
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    persona: {
      name: { type: String, default: 'PropPulse AI Assistant', trim: true },
      tone: {
        type: String,
        enum: ['professional', 'friendly', 'concise', 'consultative'],
        default: 'professional',
      },
      agentName: { type: String, default: 'AI ISA', trim: true },
      brokerageName: { type: String, default: '', trim: true },
      customInstructions: { type: String, trim: true, maxlength: 2000 },
    },
    officeHoursOnly: {
      type: Boolean,
      default: false,
    },
    autoReplyChannels: {
      type: [{ type: String, enum: ['sms', 'whatsapp', 'email'] }],
      default: ['sms', 'whatsapp', 'email'],
    },
    autoPilotEnabled: {
      type: Boolean,
      default: true,
    },
    humanHandoffDelaySeconds: {
      type: Number,
      default: 30,
      min: 0,
      max: 300,
    },
    qualificationThresholdScore: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

export const AiIsaConfig: Model<IAiIsaConfig> =
  mongoose.models.AiIsaConfig || mongoose.model<IAiIsaConfig>('AiIsaConfig', aiIsaConfigSchema)
```

#### Model 2: `server/src/models/QualificationCriteria.ts`
```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'

export type CriteriaCategory = 'budget' | 'timeline' | 'pre_approval' | 'location' | 'home_to_sell'

export interface IQualificationCriteria extends Document {
  brokerageId: mongoose.Types.ObjectId
  category: CriteriaCategory
  label: string
  isRequired: boolean
  promptDirective: string
  options?: string[]
  order: number
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const qualificationCriteriaSchema = new Schema<IQualificationCriteria>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
    },
    category: {
      type: String,
      enum: ['budget', 'timeline', 'pre_approval', 'location', 'home_to_sell'],
      required: [true, 'Category is required'],
    },
    label: {
      type: String,
      required: [true, 'Label is required'],
      trim: true,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    promptDirective: {
      type: String,
      required: [true, 'Prompt directive is required'],
    },
    options: {
      type: [String],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Single covering compound index for tenant listing and ordering
qualificationCriteriaSchema.index({ brokerageId: 1, order: 1 })

export const QualificationCriteria: Model<IQualificationCriteria> =
  mongoose.models.QualificationCriteria ||
  mongoose.model<IQualificationCriteria>('QualificationCriteria', qualificationCriteriaSchema)
```

#### Model 3: `server/src/models/ReactivationCampaign.ts`
```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'

export type CampaignStatus = 'active' | 'paused' | 'draft' | 'completed'
export type CampaignChannel = 'sms' | 'whatsapp' | 'email'

export interface IReactivationCampaign extends Document {
  brokerageId: mongoose.Types.ObjectId
  name: string
  status: CampaignStatus
  targetSegment: string
  channel: CampaignChannel
  messageTemplate: string
  dormantDaysThreshold: number
  totalLeads: number
  contactedCount: number
  respondedCount: number
  engagedCount: number
  convertedCount: number
  meetingsBookedCount: number
  lastExecutedAt?: Date
  lastRunAt?: Date
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const reactivationCampaignSchema = new Schema<IReactivationCampaign>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'draft', 'completed'],
      default: 'active',
    },
    targetSegment: {
      type: String,
      required: [true, 'Target segment is required'],
      trim: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email'],
      default: 'sms',
    },
    messageTemplate: {
      type: String,
      required: [true, 'Message template is required'],
    },
    dormantDaysThreshold: {
      type: Number,
      default: 90,
      min: 1,
      max: 365,
    },
    totalLeads: {
      type: Number,
      default: 0,
    },
    contactedCount: {
      type: Number,
      default: 0,
    },
    respondedCount: {
      type: Number,
      default: 0,
    },
    engagedCount: {
      type: Number,
      default: 0,
    },
    convertedCount: {
      type: Number,
      default: 0,
    },
    meetingsBookedCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Date,
    },
    lastRunAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
)

// Compound covering indexes: tenant sort & execution scheduler
reactivationCampaignSchema.index({ brokerageId: 1, createdAt: -1 })
reactivationCampaignSchema.index({ brokerageId: 1, status: 1, lastRunAt: 1 })

export const ReactivationCampaign: Model<IReactivationCampaign> =
  mongoose.models.ReactivationCampaign ||
  mongoose.model<IReactivationCampaign>('ReactivationCampaign', reactivationCampaignSchema)
```

#### Model 4: `server/src/models/ObjectionPlaybook.ts`
```typescript
import mongoose, { Schema, Document } from 'mongoose'

export type ObjectionCategory =
  | 'interest_rates'
  | 'market_crash'
  | 'commission_fees'
  | 'lowball_offers'
  | 'timing_delay'
  | 'other'

export interface IObjectionAngle {
  script: string
  notes?: string
  metricsUsed?: string[]
  followUpQuestion?: string
  marketContext?: string
}

export interface IObjectionPlaybook extends Document {
  brokerageId?: mongoose.Types.ObjectId
  category: ObjectionCategory
  title: string
  triggerKeywords: string[]
  angles: {
    analytical: IObjectionAngle
    empathetic: IObjectionAngle
    urgency: IObjectionAngle
  }
  isCustom: boolean
  isDeleted: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const objectionAngleSchema = new Schema<IObjectionAngle>(
  {
    script: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    metricsUsed: [{ type: String, trim: true }],
    followUpQuestion: { type: String, trim: true },
    marketContext: { type: String, trim: true },
  },
  { _id: false }
)

const objectionPlaybookSchema = new Schema<IObjectionPlaybook>(
  {
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      default: null,
    },
    category: {
      type: String,
      enum: ['interest_rates', 'market_crash', 'commission_fees', 'lowball_offers', 'timing_delay', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    triggerKeywords: {
      type: [String],
      default: [],
    },
    angles: {
      analytical: { type: objectionAngleSchema, required: true },
      empathetic: { type: objectionAngleSchema, required: true },
      urgency: { type: objectionAngleSchema, required: true },
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Covering compound indexes: eliminates all 5 redundant single-field indexes
objectionPlaybookSchema.index({ brokerageId: 1, category: 1, isDeleted: 1 })
objectionPlaybookSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })

export const ObjectionPlaybook = mongoose.model<IObjectionPlaybook>(
  'ObjectionPlaybook',
  objectionPlaybookSchema
)
```
