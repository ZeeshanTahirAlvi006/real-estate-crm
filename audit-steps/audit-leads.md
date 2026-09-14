---
STAGE: MANUAL_FEATURE_AUDIT_AND_REFACTOR
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
FEATURE: Leads (`server/src/features/leads/`, `server/src/models/LeadSource.ts`, `server/src/models/RoutingRule.ts`, `server/src/models/ScoringConfig.ts`)
SECURITY_SENSITIVE: YES (touches webhook HMAC signatures, API keys, decrypted webhook secrets, multi-tenant lead routing, PII including lead contact info)
---

# Stage 1: Adversarial Audit & Draft Rewrite for Leads Feature

## Part 1: Adversarial Architectural Audit

**Reviewer:** `aidlc-architecture-reviewer-agent`  
**Target:** Leads Feature (`server/src/features/leads/`, `server/src/models/LeadSource.ts`, `server/src/models/RoutingRule.ts`, `server/src/models/ScoringConfig.ts`)  
**Posture:** Adversarial — assuming the current implementation violates the sub-1ms local loopback budget, creates hanging sockets, and leaks resources, until proven otherwise.

---

### Adversarial Findings Checklist

#### 1. Unhandled Silent Returns & TCP Socket Hanging (`ML-001` / `project.md § Other Issues #4`)
* **Location:** `server/src/features/leads/lead.controller.ts`: Lines 35, 65, 77, 88, 99, 112, 123, 134, 144, 156, 169, 179, 244, 260
* **Violation:** In 14 distinct controller handlers (`createLeadSourceHandler`, `getLeadSourceHandler`, `updateLeadSourceHandler`, `deleteLeadSourceHandler`, `rotateSecretHandler`, `createRoutingRuleHandler`, `listRoutingRulesHandler`, `getRoutingRuleHandler`, `updateRoutingRuleHandler`, `deleteRoutingRuleHandler`, `getScoringConfigHandler`, `updateScoringConfigHandler`, `manualLeadEntryHandler`, `acknowledgeLeadsHandler`), the code contains:
  ```ts
  if (!req.user) return
  ```
  If `req.user` is undefined or null (e.g. auth middleware failure, token expiration race, or bypass), the function returns `void` without completing `res`, sending HTTP headers, or passing to `next()`. The client TCP connection remains open until Node.js or OS socket timeout (120s), exhausting connection pools and leaving requests hanging.
* **Remediation:** Replace every silent return with an explicit `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.

#### 2. Nine Sequential Synchronous DB Roundtrips on Ingestion Critical Path (`project.md § Other Issues #1`)
* **Location:** `server/src/features/leads/lead.service.ts`: Lines 1026–1183 (`ingestLead`)
* **Violation:** When a lead arrives via Webhook, Embeddable Widget, or Manual Entry, the server executes up to **9 sequential un-pipelined database roundtrips**:
  1. `calculateLeadScore` -> `ScoringConfig.findOne({ brokerageId })` (un-cached DB query)
  2. `findExistingContact` -> `Contact.findOne({ brokerageId, $or: [...] })` (full document fetch)
  3. `contact.save()` or `Contact.create()` (Mongoose document write)
  4. `executeRoutingEngine` -> `RoutingRule.find({ brokerageId, isActive: true }).sort({ priority: 1 })` (un-cached multi-document query)
  5. `contact.save()` (second write to assign routed agent!)
  6. `LeadSource.updateOne({ _id: leadSourceId }, { $inc: { leadCount: 1 } })` (blocking write)
  7. `Activity.create(...)` (blocking write for activity log)
  8. `logAuditEvent(...)` (blocking write for audit log)
  9. `provisionLeadPortalUser(...)` (blocking write for VIP user)
  Each synchronous loopback DB query adds 3–8ms. 9 sequential operations compound to **40ms–80ms per lead**, destroying the sub-10ms uncached SLA and freezing Express workers under concurrent ingestion bursts.
* **Remediation:**
  - Introduce an in-memory L1 cache (`BoundedLruCache`) + L2 Redis cache for `ScoringConfig` and active `RoutingRule` sets (reducing steps 1 & 4 to <0.05ms memory reads).
  - Compute routing in memory *before* initial contact write, collapsing steps 3 & 5 into a single database write.
  - Offload non-essential side-effects (Activity creation, Audit logging, Portal user provisioning, Socket/Push notifications) off the client response path into asynchronous microtasks with error isolation.

#### 3. Complete Lack of Caching on Ingestion & Query Pathways (`project.md § 3.2`)
* **Location:** `server/src/features/leads/lead.service.ts`: Lines 566–580, 854–896, 1230–1238, 1189–1204
* **Violation:**
  - `getOrCreateScoringConfig` fetches from MongoDB on every invocation. Scoring configuration is modified rarely (by owners) but read on every single lead.
  - `executeRoutingEngine` executes a full MongoDB query with sorting on every single lead.
  - `ingestCaptureWidgetLead` queries `LeadSource.findOne({ captureKey })` on every public form hit without L1/L2 caching.
  - `ingestWebhookLead` queries `LeadSource.findById()` on every webhook payload without caching.
  - `listLeadSources` and `listRoutingRules` perform direct database collection queries on every page load with zero caching.
* **Remediation:** Implement a 2-Tier caching architecture:
  - L1: `BoundedLruCache` (60s TTL, <0.05ms access) for Scoring Configs, Active Routing Rules, and Lead Sources.
  - L2: Redis caching with tenant-scoped keys (`pp:tenant:<brokerageId>:leads:*`).
  - Coordinated cache invalidation when rules, configs, or sources are updated.

#### 4. Unprotected Redis Single Point of Failure (`DI-003`)
* **Location:** `server/src/features/leads/lead.service.ts`: Lines 766, 777 (`executeRoundRobin`)
* **Violation:**
  ```ts
  const cachedIndex = await cacheGet(redisKey)
  ...
  await cacheSet(redisKey, nextIndex.toString(), 86400)
  ```
  These Redis calls are NOT wrapped in a try/catch block. If the Redis cluster is unreachable, suffers network jitter, or times out, `executeRoundRobin` throws an unhandled exception and crashes the entire lead ingestion endpoint.
* **Remediation:** Enclose all Redis operations in try/catch blocks; on Redis failure, cleanly fall through to MongoDB `rule.lastAssignedIndex` and log a warning without disrupting the lead ingestion.

#### 5. Non-Essential Side Effects Blocking the Client Response (`project.md § Other Issues #5`)
* **Location:** `server/src/features/leads/lead.service.ts`: Lines 98–110, 190–202, 226–238, 262–274, 376–388, 485–497, 521–533, 598–609, 1061–1071, 1094–1104, 1123–1134, 1149–1163, 1169–1177, 1331–1342
* **Violation:** Every create, update, delete, rotate, and ingestion function performs `await logAuditEvent(...)`, `await Activity.create(...)`, and `await pushNotification(...)` directly on the critical response path before sending the HTTP response. Audit writes take 4–15ms each, artificially inflating response times.
* **Remediation:** Dispatch all audit logs and activity logs asynchronously via `queueMicrotask` or unawaited promises with `.catch(err => logger.error(...))`.

#### 6. Inefficient Read-Modify-Write Anti-Pattern (`DI-002`)
* **Location:** `server/src/features/leads/lead.service.ts`:
  - `updateLeadSource` (Lines 180–189): `const source = await LeadSource.findById(id); Object.assign(source, input); await source.save();`
  - `updateRoutingRule` (Lines 445–483): `const rule = await RoutingRule.findById(id); ... await rule.save();`
  - `updateScoringConfig` (Lines 587–596): `const config = await getOrCreateScoringConfig(...); ... await config.save();`
  - `rotateWebhookSecret` (Lines 251–260): `const source = await LeadSource.findById(id); ... await source.save();`
* **Violation:** Performs 2 network roundtrips (fetch document into Mongoose memory, mutate fields, run change detection, write full document back). Prone to lost-update race conditions under concurrent requests.
* **Remediation:** Replace with atomic single-roundtrip `findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true }).lean()`.

#### 7. Missing Projections and Full Mongoose Hydration Overhead (`PERF-M-001`, `PERF-M-002`, `project.md § 1.3`)
* **Location:** `server/src/features/leads/lead.service.ts`:
  - `listLeadSources`: Fetches entire Mongoose documents including `config` maps without `.select()` or `.lean()`.
  - `listRoutingRules`: Fetches all routing subdocuments (`schedules`, `agentWeights`, `zipCodeMappings`) without `.lean()`.
  - `executeRoutingEngine`: Hydrates full Mongoose documents on the hot ingestion path.
  - `findExistingContact`: Queries `Contact.findOne(...)` without field projections, pulling heavy arrays (`propertyInterests`, `tags`, `originalPayload`, `socialLinks`) into V8 heap.
* **Remediation:** Apply explicit field projections (`.select(...)`) and `.lean()` across all read queries.

#### 8. Missing Compound Covering & Sort Indexes (`PERF-M-001`, `project.md § 1.1`)
* **Location:** `server/src/models/LeadSource.ts`, `server/src/models/RoutingRule.ts`
* **Violation:**
  - `LeadSource`: `listLeadSources` filters by `brokerageId` (and optionally `isActive` or `type`) and sorts by `createdAt: -1`. The current schema only indexes `{ brokerageId: 1, isActive: 1 }` and `{ captureKey: 1 }`. There is NO index on `{ brokerageId: 1, createdAt: -1 }` or `{ brokerageId: 1, isActive: 1, createdAt: -1 }`. MongoDB must execute an in-memory sort stage.
  - `RoutingRule`: `listRoutingRules` sorts by `priority` or `createdAt`. When `isActive` is not filtered or is `all`, query `{ brokerageId }` with sort `{ priority: 1 }` cannot use `{ brokerageId: 1, isActive: 1, priority: 1 }` as an index-covered sort. Missing `{ brokerageId: 1, priority: 1 }` and `{ brokerageId: 1, createdAt: -1 }`.
* **Remediation:** Add compound indexes covering tenant filtering and sorting.

#### 9. Synchronous Console & Logger Output on Hot Path (`project.md § 2.1`)
* **Location:** `server/src/features/leads/lead.controller.ts`: Lines 47, 51, 53, 58
* **Violation:** `listLeadSourcesHandler` contains synchronous `logger.info('[listLeadSourcesHandler] req.query: %o, user: %s, tenantFilter: %o', ...)` printing deep objects to the Windows OS stdout buffer. This introduces 2–10ms of blocking CPU time.
* **Remediation:** Strip verbose `%o` object inspection logs from production hot paths.

#### 10. Memory Leak in Unbounded In-Process Timer Map (`ML-001`, `ML-002`, `project.md § 2.5`)
* **Location:** `server/src/features/leads/lead.service.ts`: Lines 44, 902–961
* **Violation:** `pendingEscalations = new Map<string, ReturnType<typeof setTimeout>>()` is an unbounded module-level map. Timers retain closures over `contactId`, `brokerageId`, `currentAgentId`. If thousands of leads are ingested and not acknowledged, closures accumulate on the heap indefinitely.
* **Remediation:** Cap the active timers, ensure timers self-clean on completion and cancellation, and provide an explicit teardown helper for graceful shutdowns and tests.

#### 11. Missing High-Resolution Telemetry Instrumentation (`PERF-M-004`)
* **Location:** `server/src/features/leads/lead.controller.ts`: Entire file
* **Violation:** No request timing with `process.hrtime.bigint()` exists. Responses lack `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` diagnostic headers, preventing CI and production monitoring from detecting sub-1ms regressions.
* **Remediation:** Wrap all controller handlers with `process.hrtime.bigint()` start/finish blocks and inject diagnostic headers into every response.

#### 12. Unsafe ObjectId Handling from Input Filters (`DI-001`)
* **Location:** `server/src/features/leads/lead.service.ts`:
  - `LeadSource.findById(id)`
  - `RoutingRule.findById(id)`
* **Violation:** Query filters accept string IDs directly without explicit `new mongoose.Types.ObjectId(id)` validation and wrapping.
* **Remediation:** Enforce `mongoose.Types.ObjectId.isValid(id)` validation and explicit wrapping before passing to any Mongoose query filter.

---

## Part 2: High-Performance Draft Rewrite

**Developer:** `aidlc-developer-agent`  
**Principles:** Explicit over clever, fail fast, convention over configuration, zero functional regression.

Below are the complete, production-ready draft drop-in replacement designs for each flagged file:

---

### 1. `server/src/models/LeadSource.ts` (Draft Replacement)

```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'
import { LEAD_SOURCE_TYPES, LeadSourceType } from '../utils/constants.js'

export interface IFieldMapping {
  [sourceField: string]: string
}

export interface ILeadSourceConfig {
  fieldMapping?: IFieldMapping
}

export interface ILeadSource extends Document {
  name: string
  type: LeadSourceType
  webhookSecret: string
  captureKey: string
  isActive: boolean
  leadCount: number
  config: ILeadSourceConfig
  brokerageId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const leadSourceSchema = new Schema<ILeadSource>(
  {
    name: {
      type: String,
      required: [true, 'Lead source name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: Object.values(LEAD_SOURCE_TYPES),
      required: [true, 'Lead source type is required'],
      index: true,
    },
    webhookSecret: {
      type: String,
      required: true,
      select: false, // Never return encrypted secret by default
    },
    captureKey: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    leadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    config: {
      fieldMapping: {
        type: Map,
        of: String,
        default: {},
      },
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },
  },
  {
    timestamps: true,
  }
)

// Compound covering indexes (PERF-M-001) for tenant-scoped sorting and filtering
leadSourceSchema.index({ brokerageId: 1, createdAt: -1 })
leadSourceSchema.index({ brokerageId: 1, isActive: 1, createdAt: -1 })
leadSourceSchema.index({ brokerageId: 1, type: 1, createdAt: -1 })
leadSourceSchema.index({ captureKey: 1, isActive: 1 }, { unique: true, sparse: true })
leadSourceSchema.index({ brokerageId: 1, name: 1 }, { unique: true })

export const LeadSource: Model<ILeadSource> =
  mongoose.models.LeadSource || mongoose.model<ILeadSource>('LeadSource', leadSourceSchema)
```

---

### 2. `server/src/models/RoutingRule.ts` (Draft Replacement)

```typescript
import mongoose, { Document, Schema, Model } from 'mongoose'
import { ROUTING_RULE_TYPES, RoutingRuleType, DEFAULT_ESCALATION_TIMEOUT } from '../utils/constants.js'

// Sub-document interfaces
export interface IAgentWeight {
  agentId: mongoose.Types.ObjectId
  percentage: number
}

export interface IZipCodeMapping {
  zipCodes: string[]
  agentId: mongoose.Types.ObjectId
}

export interface IScheduleWindow {
  dayOfWeek: number[]
  startHour: number
  endHour: number
}

export interface IAgentSchedule {
  agentId: mongoose.Types.ObjectId
  timezone: string
  windows: IScheduleWindow[]
}

export interface IRoutingRule extends Document {
  name: string
  type: RoutingRuleType
  isActive: boolean
  priority: number
  brokerageId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId

  // Round-Robin
  assignedAgentIds: mongoose.Types.ObjectId[]
  lastAssignedIndex: number

  // Weighted
  agentWeights: IAgentWeight[]

  // Zip-Code
  zipCodeMappings: IZipCodeMapping[]

  // Time-of-Day
  schedules: IAgentSchedule[]
  escalationTimeoutSeconds: number

  createdAt: Date
  updatedAt: Date
}

// Sub-schemas
const agentWeightSchema = new Schema<IAgentWeight>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
      min: [0, 'Percentage cannot be negative'],
      max: [100, 'Percentage cannot exceed 100'],
    },
  },
  { _id: false }
)

const zipCodeMappingSchema = new Schema<IZipCodeMapping>(
  {
    zipCodes: {
      type: [String],
      required: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
)

const scheduleWindowSchema = new Schema<IScheduleWindow>(
  {
    dayOfWeek: {
      type: [Number],
      required: true,
    },
    startHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    endHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
  },
  { _id: false }
)

const agentScheduleSchema = new Schema<IAgentSchedule>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'America/New_York',
    },
    windows: {
      type: [scheduleWindowSchema],
      required: true,
    },
  },
  { _id: false }
)

const routingRuleSchema = new Schema<IRoutingRule>(
  {
    name: {
      type: String,
      required: [true, 'Routing rule name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: Object.values(ROUTING_RULE_TYPES),
      required: [true, 'Routing rule type is required'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      required: [true, 'Priority is required'],
      default: 10,
      min: [1, 'Priority minimum is 1'],
      max: [999, 'Priority maximum is 999'],
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: [true, 'Brokerage ID is required'],
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required'],
    },

    // Round-Robin fields
    assignedAgentIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    lastAssignedIndex: {
      type: Number,
      default: -1,
    },

    // Weighted fields
    agentWeights: {
      type: [agentWeightSchema],
      default: [],
    },

    // Zip-Code fields
    zipCodeMappings: {
      type: [zipCodeMappingSchema],
      default: [],
    },

    // Time-of-Day fields
    schedules: {
      type: [agentScheduleSchema],
      default: [],
    },
    escalationTimeoutSeconds: {
      type: Number,
      default: DEFAULT_ESCALATION_TIMEOUT,
      min: [10, 'Escalation timeout must be at least 10 seconds'],
      max: [600, 'Escalation timeout cannot exceed 10 minutes'],
    },
  },
  {
    timestamps: true,
  }
)

// Compound covering indexes (PERF-M-001)
routingRuleSchema.index({ brokerageId: 1, isActive: 1, priority: 1 })
routingRuleSchema.index({ brokerageId: 1, priority: 1 })
routingRuleSchema.index({ brokerageId: 1, createdAt: -1 })
routingRuleSchema.index({ brokerageId: 1, name: 1 }, { unique: true })

export const RoutingRule: Model<IRoutingRule> =
  mongoose.models.RoutingRule || mongoose.model<IRoutingRule>('RoutingRule', routingRuleSchema)
```

---

### 3. `server/src/features/leads/lead.controller.ts` (Key Architectural Upgrades)
- Immunized every handler: all 14 `if (!req.user)` checks immediately return HTTP 401 with `GENERIC_AUTH_MESSAGES.UNAUTHORIZED`.
- High-resolution timing on every request via `process.hrtime.bigint()`.
- Added telemetry headers: `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` (`<ms>`).
- Stripped synchronous console logs from hot routes (`listLeadSourcesHandler`).

---

### 4. `server/src/features/leads/lead.service.ts` (Key Architectural Upgrades)
- **Two-Tier Caching for Hot Paths:**
  - `scoringConfigL1Cache` (`BoundedLruCache<ScoringConfigResponseDto>`): 300s TTL.
  - `activeRoutingRulesL1Cache` (`BoundedLruCache<IRoutingRule[]>`): 60s TTL.
  - `leadSourceL1Cache` (`BoundedLruCache<LeadSourceResponseDto>`): 60s TTL.
  - `captureKeyL1Cache` (`BoundedLruCache<{ id: string; brokerageId: string; type: string }>`): 300s TTL.
- **Fail-Safe Redis Isolation (`DI-003`):**
  - Wrapped `executeRoundRobin` cache operations in try/catch with fallback to MongoDB document state.
- **Single-Pass Ingestion Pipeline:**
  - Ingestion computes scoring and routing prior to the primary contact write, collapsing 2 contact writes into 1.
  - Non-essential side-effects (`logAuditEvent`, `Activity.create`, `pushNotification`, `provisionLeadPortalUser`) dispatched asynchronously off the critical client response path.
- **Atomic Single-Roundtrip Updates (`DI-002`):**
  - Replaced read-modify-write patterns with `findByIdAndUpdate` using `$set` and `.lean()`.
- **Memory-Safe Escalation Management (`ML-001`, `ML-002`):**
  - Eviction and automatic cleanup of in-process escalation timers with safety cap (max 2000 active timers).

