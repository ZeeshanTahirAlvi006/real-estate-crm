---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
FEATURE: Leads (`server/src/features/leads/`, `server/src/models/LeadSource.ts`, `server/src/models/RoutingRule.ts`, `server/src/models/ScoringConfig.ts`)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
---

# Stage 2: Delivery & Integration Plan (Bolt Plan) for Leads Feature

**Agent:** `aidlc-delivery-agent`  
**Feature:** Leads Ingestion, Routing Engine, Scoring, and Source Management

---

## 1. The Integration Sequence (Bolt Plan)

The refactoring is decomposed into 5 sequential, dependency-ordered "Bolts" to guarantee that foundational models, indexes, and caching mechanisms land before active controllers or route handlers are modified.

```
[Bolt 1: Model Indexes]
  └──> [Bolt 2: Foundational Caching & Invalidation Infrastructure]
        └──> [Bolt 3: Service-Tier Refactor (Hot Path, Pipeline & Atomic Updates)]
              └──> [Bolt 4: Controller Immunization & Telemetry Injection]
                    └──> [Bolt 5: Types & Verification]
```

### Bolt 1: Database Tier — Compound Covering & Sort Indexes
* **Prerequisite:** None.
* **Target Files:**
  - `server/src/models/LeadSource.ts`
  - `server/src/models/RoutingRule.ts`
* **Changes:**
  - `LeadSource`: Add compound indexes:
    - `{ brokerageId: 1, createdAt: -1 }` (Covers `listLeadSources` default sort)
    - `{ brokerageId: 1, isActive: 1, createdAt: -1 }` (Covers active status filtering with sort)
    - `{ brokerageId: 1, type: 1, createdAt: -1 }` (Covers type filtering with sort)
    - `{ captureKey: 1, isActive: 1 }` (Covers public capture key resolution)
  - `RoutingRule`: Add compound indexes:
    - `{ brokerageId: 1, priority: 1 }` (Covers unconstrained priority sorts)
    - `{ brokerageId: 1, createdAt: -1 }` (Covers listing sorts)

### Bolt 2: Caching & Invalidation Tier — Two-Tier L1/L2 Cache Engine
* **Prerequisite:** Bolt 1.
* **Target File:** `server/src/features/leads/lead.service.ts`
* **Changes:**
  - Initialize dedicated bounded in-memory L1 caches:
    - `scoringConfigL1Cache = new BoundedLruCache<ScoringConfigResponseDto>(500, 300)` (300s TTL, <0.05ms read)
    - `activeRoutingRulesL1Cache = new BoundedLruCache<IRoutingRule[]>(500, 60)` (60s TTL, <0.05ms read)
    - `leadSourceL1Cache = new BoundedLruCache<LeadSourceResponseDto>(500, 60)` (60s TTL)
    - `captureKeyL1Cache = new BoundedLruCache<{ id: string; brokerageId: string; type: string }>(1000, 300)` (300s TTL)
  - Export unified invalidator: `invalidateLeadCaches(brokerageId?: string, leadSourceId?: string, captureKey?: string)`:
    - Synchronously clears L1 caches.
    - Fires non-blocking L2 Redis key invalidation (`pp:tenant:<brokerageId>:leads:*`, `pp:*:leads*`).
  - Introduce bounded safety map for escalation timers with teardown helper (`clearAllEscalations()`).

### Bolt 3: Service Tier — Ingestion Pipeline Decoupling, Atomic Updates & Fallback Guards
* **Prerequisite:** Bolt 2.
* **Target File:** `server/src/features/leads/lead.service.ts`
* **Changes:**
  - **Single-Pass Ingestion Pipeline (`ingestLead`):**
    - Execute lead scoring and rule routing *in memory* (using L1 cached configs/rules) before initial database write.
    - Insert or update the contact in **one single write operation** with assigned agent and status already set.
    - Offload non-essential side-effects to detached background microtasks (`logAuditEvent`, `Activity.create`, `pushNotification`, `provisionLeadPortalUser`).
  - **Atomic Updates (`DI-002`):**
    - `updateLeadSource`: Replace `.save()` with `LeadSource.findByIdAndUpdate(..., { $set: input }, { new: true }).lean()`.
    - `updateRoutingRule`: Replace `.save()` with `RoutingRule.findByIdAndUpdate(..., { $set: updateFields }, { new: true }).lean()`.
    - `updateScoringConfig`: Replace `.save()` with `ScoringConfig.findOneAndUpdate(..., { $set: input }, { new: true, upsert: true }).lean()`.
    - `rotateWebhookSecret`: Replace `.save()` with atomic update.
  - **Fault-Tolerant Round Robin (`DI-003`):**
    - Enclose `cacheGet` and `cacheSet` in try/catch with fallback to MongoDB `rule.lastAssignedIndex`.
  - **Lean Projections (`PERF-M-001`):**
    - Apply `.select()` and `.lean()` across all read queries (`listLeadSources`, `listRoutingRules`, `getLeadSourceById`, `getRoutingRuleById`).

### Bolt 4: Controller Tier — Socket Immunization & Telemetry Injection
* **Prerequisite:** Bolt 3.
* **Target File:** `server/src/features/leads/lead.controller.ts`
* **Changes:**
  - **Socket Immunization (`ML-001`):**
    - Replace all 14 `if (!req.user) return` silent returns with `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.
  - **Strip Synchronous Console Statements (`project.md § 2.1`):**
    - Remove `logger.info(...)` with `%o` object expansions from `listLeadSourcesHandler`.
  - **Telemetry Instrumentation (`PERF-M-004`):**
    - Wrap execution with `process.hrtime.bigint()` start/end.
    - Set response headers `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` (`<ms>`).

### Bolt 5: Types & Route Integration Verification
* **Prerequisite:** Bolt 4.
* **Target Files:**
  - `server/src/features/leads/lead.types.ts`
  - `server/src/features/leads/lead.routes.ts`
* **Changes:**
  - Ensure exported DTOs match return signatures.
  - Verify query validator clamping (`limit <= 100`).

---

## 2. Refactor Boundaries

| File | Tier | Modifications | Lines Stripped / Replaced |
| :--- | :--- | :--- | :--- |
| `server/src/models/LeadSource.ts` | Model | Add compound indexes for tenant sort and active filter | Added 4 compound index declarations |
| `server/src/models/RoutingRule.ts` | Model | Add compound indexes for priority and sort | Added 3 compound index declarations |
| `server/src/features/leads/lead.controller.ts` | Controller | Immunize 14 unhandled auth exits; strip sync logs; inject telemetry headers (`X-Cache`, `X-Response-Time`) | Stripped lines 35, 47, 51, 53, 65, 77, 88, 99, 112, 123, 134, 144, 156, 169, 179, 244, 260; injected 401 handlers & hrtime |
| `server/src/features/leads/lead.service.ts` | Service | Add L1/L2 caches; single-pass lead ingestion; background side-effects; atomic updates; Redis try/catch fallback; lean projections | Replaced read-modify-write loops, replaced blocking audit awaits, wrapped Redis in try/catch, added L1 caches |
| `server/src/features/leads/lead.types.ts` | Types | Export cache and pagination types | Added cache metadata types |

---

## 3. Confidence Hypothesis & Verification Metrics

| Check | Target Metric | Verification Method |
| :--- | :--- | :--- |
| **Hanging Socket Elimination** | < 1.0ms response (HTTP 401) | Send request with `req.user = undefined` to all 14 controller handlers. Expect immediate 401 with `success: false`. |
| **L1 In-Memory Cache Read** | **< 0.1ms** loopback latency | Repeated `getScoringConfig` and `getRoutingRuleById` requests return `X-Cache: L1-HIT` with response time < 0.1ms. |
| **L2 Redis Cache Read** | **< 1.0ms** loopback latency | Cache hit on Redis returns `X-Cache: L2-HIT` with response time < 1.0ms. |
| **Uncached DB Operations** | **< 10.0ms** query time | Lead listing with compound covering index completes in < 5ms without `COLLSCAN`. |
| **Ingestion Critical Path** | **< 10.0ms** total latency | Ingest lead executes scoring + routing in memory, does 1 DB write, dispatches activities in background, returns 201 in < 10ms. |
| **Redis Fault Isolation (DI-003)** | Zero unhandled crashes | Simulate Redis failure during round-robin routing; handler cleanly falls back to DB and completes successfully. |
| **Zero Memory Leaks (ML-002)** | Bounded heap | Verify L1 caches enforce 500/1000 item capacity; escalation timer store cleans up on acknowledge/timeout. |

---

## 4. Execution Checklist

- [ ] Step 1: Update `server/src/models/LeadSource.ts` with compound indexes.
- [ ] Step 2: Update `server/src/models/RoutingRule.ts` with compound indexes.
- [ ] Step 3: Refactor `server/src/features/leads/lead.service.ts` with 2-tier caching, atomic operations, decoupled side effects, and safe round robin.
- [ ] Step 4: Refactor `server/src/features/leads/lead.controller.ts` with explicit 401 returns, stripped synchronous logs, and telemetry headers.
- [ ] Step 5: Update `server/src/features/leads/lead.types.ts` if needed for cache metadata.
- [ ] Step 6: Execute TypeScript typecheck (`npm run typecheck`).
- [ ] Step 7: Create and run comprehensive unit, regression, and concurrency test suite (`server/tests/unit/leadPerformance.test.ts`).
- [ ] Step 8: Document Stage 3 Developer Specification (`audit-steps/developer-leads.md`).
- [ ] Step 9: Adversarial Stage 3.5 Regression Gate audit.
- [ ] Step 10: Document Stage 4 Quality Validation report (`audit-steps/quality-leads.md`).
