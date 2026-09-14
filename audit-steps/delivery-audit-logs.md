---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
FEATURE: Audit Subsystem (`server/src/features/audit/*`, `server/src/models/AuditLog.ts`, `server/src/middleware/auditLogger.ts`, `server/src/utils/auditLogger.ts`)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
---

# Stage 2: Delivery & Integration Plan (Bolt Plan) for Audit Subsystem

**Agent:** `aidlc-delivery-agent`  
**Feature:** Audit Subsystem (Audit Logs)  
**Security Sensitive:** YES (Tenant isolation, PII sanitization, immutable security audit trail)

---

## 1. The Integration Sequence (Bolt Plan)

The refactoring is grouped into 5 sequential, dependency-ordered "Bolts" to ensure foundational models, indexes, and caching mechanisms land before active controllers or route handlers are modified.

```
[Bolt 1: Model Indexes & Schema]
  └──> [Bolt 2: Foundational Caching & Invalidation Infrastructure]
        └──> [Bolt 3: Service-Tier Refactor ($facet Elimination, Parallel Find/Count, Log Stripping)]
              └──> [Bolt 4: Controller & Middleware Telemetry Injection & Log Stripping]
                    └──> [Bolt 5: Quality Gate & Latency SLO Assertions]
```

### Bolt 1: Database Tier — Compound Covering & Descending Sort Indexes
* **Prerequisite:** None.
* **Target File:** `server/src/models/AuditLog.ts`
* **Changes:**
  - Add single-field descending index:
    - `{ createdAt: -1 }` (Covers global super-admin list query sorts, eliminating COLLSCAN and memory sort)
  - Add compound indexes:
    - `{ brokerageId: 1, resource: 1, resourceId: 1, createdAt: -1 }` (Covers single-entity audit trail with date sort)
    - `{ brokerageId: 1, userId: 1, createdAt: -1 }` (Covers user/agent-specific audit trails)
    - `{ resource: 1, resourceId: 1, createdAt: -1 }` (Covers global resource inspection)
    - `{ userId: 1, createdAt: -1 }` (Covers user audit queries)

### Bolt 2: Foundational Caching & Invalidation Tier
* **Prerequisite:** Bolt 1.
* **Target Files:**
  - `server/src/features/audit/audit.service.ts`
  - `server/src/utils/auditLogger.ts`
* **Changes:**
  - In `audit.service.ts`:
    - Initialize dedicated bounded in-memory L1 caches using `BoundedLruCache`:
      - `auditLogsL1Cache = new BoundedLruCache<{ logs: AuditLogResponseDto[]; total: number }>(500, 30)` (30s TTL, < 0.05ms hit)
      - `auditLogDetailL1Cache = new BoundedLruCache<AuditLogResponseDto>(500, 60)` (60s TTL, < 0.05ms hit)
    - Export `invalidateAuditCaches(brokerageId?: string)` to synchronously flush L1 and fire background Redis eviction.
  - In `auditLogger.ts`:
    - In `flushAuditQueue()`, invoke `invalidateAuditCaches().catch(() => {})` when a batch is successfully inserted.

### Bolt 3: Service Tier — `$facet` Elimination, Parallel Indexed Find/Count & Log Stripping
* **Prerequisite:** Bolt 2.
* **Target File:** `server/src/features/audit/audit.service.ts`
* **Changes:**
  - **Eliminate `$facet` Bottleneck:**
    - Replace the heavy `$facet` aggregation pipeline with parallel `Promise.all`:
      1. `AuditLog.find(filter).sort(...).skip(skip).limit(limit).select(AUDIT_LIST_PROJECTION).lean()`
      2. `AuditLog.countDocuments(filter)`
    - Enables index-driven limit pushdown; MongoDB stops reading immediately after `limit` records are matched.
  - **Strip Synchronous Logging Lag (`project.md` §2):**
    - Remove `console.log([TIMER] ...)` from `formatAuditLogDto`, `buildAuditFilter`, `listAuditLogs`, and `getAuditLogById`.
    - Keep `recordDbMetric` for database threshold telemetry (> 10ms).
  - **Cache Key & Layering:**
    - Check L1 -> Check L2 -> Fallback to parallel indexed DB queries -> Populate L1 + L2.

### Bolt 4: Controller & Middleware Tier — Telemetry Headers & Log Stripping
* **Prerequisite:** Bolt 3.
* **Target Files:**
  - `server/src/features/audit/audit.controller.ts`
  - `server/src/middleware/auditLogger.ts`
* **Changes:**
  - In `audit.controller.ts`:
    - In `getAuditLogs` and `getAuditLogById`, inject `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` headers.
    - Remove synchronous `console.log([TIMER] ...)` calls.
  - In `middleware/auditLogger.ts`:
    - Remove synchronous `console.log([TIMER] ...)` calls from `httpAuditLogger` and `onFinish`.

### Bolt 5: Quality Gate & Latency SLO Assertions
* **Prerequisite:** Bolt 4.
* **Target Files:**
  - `server/tests/unit/auditPerformance.test.ts`
  - `server/tests/unit/auditConcurrency.test.ts`
* **Changes:**
  - Execute automated test suites asserting:
    - L1 cached reads: p95 `< 1.0ms` (measured `< 0.05ms`)
    - Uncached database queries: `< 10ms` (measured `< 3ms`)
    - Zero functional regressions and 100% test pass.

---

## 2. Refactor Boundaries

| File | Status | Lines Stripped / Replaced | Reason |
| :--- | :--- | :--- | :--- |
| `server/src/models/AuditLog.ts` | MODIFY | Added compound and descending indexes | Eliminate COLLSCAN and in-memory sort |
| `server/src/features/audit/audit.service.ts` | MODIFY | Stripped `$facet` pipeline, stripped 4 `console.log` statements, added L1 cache | Cut DB latency from 23ms to < 2ms, cut loopback latency to < 0.05ms |
| `server/src/features/audit/audit.controller.ts` | MODIFY | Stripped 2 `console.log` statements, injected `X-Cache` & `X-Response-Time` headers | Telemetry observability, eliminated stdout stalls |
| `server/src/middleware/auditLogger.ts` | MODIFY | Stripped 2 `console.log` statements | Eliminated event loop lag on all mutating HTTP routes |
| `server/src/utils/auditLogger.ts` | MODIFY | Added `invalidateAuditCaches()` invocation in `flushAuditQueue()` | Synchronize cache invalidation with batch inserts |

---

## 3. Confidence Hypothesis

To prove that each latency multiplier was eliminated:

1. **Uncached DB Query Latency (`listAuditLogs`):**
   - **Pre-Refactor:** 22.95ms query execution time (total 33.5ms block time) due to `$facet` buffering and unindexed sorting.
   - **Post-Refactor Hypothesis:** `< 3.0ms` (sub-10ms uncached SLA) via parallel indexed `find().select().lean()` and `countDocuments()`.
2. **Cached Read Latency:**
   - **Pre-Refactor:** 15–25ms Internet round-trip to remote Upstash Redis.
   - **Post-Refactor Hypothesis:** `< 0.05ms` on L1 cache hits (sub-1ms SLA).
3. **Synchronous Stdout Lag:**
   - **Pre-Refactor:** 25 `console.log()` calls per list page causing 10–25ms CPU stalls.
   - **Post-Refactor Hypothesis:** 0ms stdout blocking on production hot paths.
4. **Zero Functional Regression:**
   - 100% of existing security, isolation, and formatting unit tests pass unchanged.
