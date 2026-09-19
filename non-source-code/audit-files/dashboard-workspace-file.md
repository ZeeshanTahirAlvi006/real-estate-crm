# Developer Implementation Plan: Dashboard Sub-1ms Latency Optimization & Security Hardening

**Role:** `aidlc-developer-agent`  
**Targets Enforced:** `< 1.0ms` cached (Redis/LRU) · `< 10ms` uncached (MongoDB) · zero data loss · zero memory leaks  
**Governing Rules:** `DI-001..004`, `ML-001..004`, `PERF-M-001..004`, `PERF-R-001..004`  
**Reference Artifacts:** `audit.md` (Adversarial Audit), `delivery.md` (Risk-Sequenced Delivery Plan)

---

## 1. Architectural Summary & Scope

Following the adversarial architecture audit by `aidlc-architecture-reviewer-agent` (Verdict: **NOT-READY**) and the delivery plan by `aidlc-delivery-agent`, the `aidlc-developer-agent` is responsible for translating the architectural specifications into production-grade code.

### Primary Goals:
1. **Multi-Tenant Security Isolation:** Eliminate unscoped queries in `getLeadPortal` by strictly injecting `{ brokerageId: user.brokerageId }` and replacing case-insensitive regex (`/i`) with indexed lowercase match.
2. **Resilience & Fault Isolation (`DI-003`):** Protect all cache reads with `safeJsonParse<T>()` in `try/catch` to avoid uncaught crashes on corrupted cache keys.
3. **Query Consolidation (`PERF-M-001`):** Collapse 7 sequential/parallel queries in `getKpis` into 2 single-pass aggregations (`Contact` and `Deal`) and 2 lean queries (`User` and `DataHealthLog`).
4. **Cache Miss Optimization (`PERF-R-004`):** Eliminate redundant duplicate `cacheGet` calls.
5. **Zero-Cache Route Acceleration:** Add Redis caching and covered projections for `getActivityFeed` and `getLeadPortal`.
6. **Atomic Updates (`DI-002`):** Replace `user.save()` and `contact.save()` in `updateLeadPortalProfile` with atomic `updateOne` operations, bypassing expensive pre-save bcrypt re-hashing cycles.
7. **Covering Indexes:** Add compound covering indexes in `Contact.ts`, `User.ts`, and `Deal.ts`.
8. **High-Resolution Telemetry (`PERF-M-004`):** Wrap uncached DB queries with `process.hrtime.bigint()` timing metrics.

---

## 2. Risk-Sequenced Implementation Bolts

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                           BOLT SEQUENCING ROADMAP                       │
  │                                                                         │
  │  [Bolt 0] Resilience & Telemetry Utilities (safeJsonParse, hrtime)      │
  │      │                                                                  │
  │      ▼                                                                  │
  │  [Bolt 1] Compound Index Definitions (Contact, Deal, User)             │
  │      │                                                                  │
  │      ▼                                                                  │
  │  [Bolt 2] Single-Pass Query Refactoring in dashboard.service.ts         │
  │      │   - Eliminate duplicate cache get                                │
  │      │   - Consolidated Contact & Deal aggregations                     │
  │      │                                                                  │
  │      ▼                                                                  │
  │  [Bolt 3] Zero-Cache Route Caching & Tenant Isolation Hardening         │
  │      │   - Cache activity-feed (60s) + lean projections                 │
  │      │   - Cache lead-portal (180s) + strict brokerageId scoping        │
  │      │                                                                  │
  │      ▼                                                                  │
  │  [Bolt 4] Atomic Profile Mutations & Cache Invalidation Hook            │
  │      │   - Replace user.save() / contact.save() with updateOne          │
  │      │   - Purge leadPortal cache on write                              │
  │      │                                                                  │
  │      ▼                                                                  │
  │  [Bolt 5] Automated Test Suite, Typecheck & Performance Benchmark       │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### Bolt 0: Resilience, Cache & Telemetry Foundation
**File:** `server/src/utils/cacheHelper.ts`
- Implement `safeJsonParse<T>(raw: string | null): T | null` wrapped in `try/catch`. On error, logs a warning and returns `null`.
- Implement `recordDbMetric(operationName: string, startTime: bigint, thresholdMs?: number): number` measuring nanoseconds delta via `process.hrtime.bigint()`, logging a warning if `deltaMs > 10ms`.
- Standardize cache key generators:
  - `getDashboardCacheKey(prefix: string, tenantFilter: Record<string, any>): string`
  - `getLeadPortalCacheKey(userId: string): string`

### Bolt 1: Compound Covering Indexes
**Files:**
- `server/src/models/Contact.ts`:
  - `contactSchema.index({ brokerageId: 1, isDeleted: 1, leadScore: 1 })`
  - Verify existing `{ brokerageId: 1, isDeleted: 1, createdAt: -1 }`
- `server/src/models/User.ts`:
  - `userSchema.index({ brokerageId: 1, isActive: 1 })`
- `server/src/models/Deal.ts`:
  - `dealSchema.index({ brokerageId: 1, isDeleted: 1, dealValue: 1 })`
  - `dealSchema.index({ contactId: 1, brokerageId: 1, isDeleted: 1 })`

### Bolt 2: Single-Pass KPI & Aggregation Refactor
**File:** `server/src/features/dashboard/dashboard.service.ts`
- **Duplicate Cache Get Elimination:** Remove `if (!cached) cached = await cacheGet(cacheKey)` across all functions.
- **Consolidated Contact Aggregation:**
  ```typescript
  const [contactStats] = await Contact.aggregate([
    { $match: { ...tenantFilter, isDeleted: false } },
    {
      $group: {
        _id: null,
        totalContacts: { $sum: 1 },
        newLeadsThisWeek: {
          $sum: { $cond: [{ $gte: ['$createdAt', weekAgo] }, 1, 0] },
        },
        highPriorityLeads: {
          $sum: { $cond: [{ $gte: ['$leadScore', 80] }, 1, 0] },
        },
      },
    },
  ])
  ```
- **Consolidated Deal Aggregation:**
  ```typescript
  const [dealStats] = await Deal.aggregate([
    { $match: { ...tenantFilter, isDeleted: false } },
    {
      $group: {
        _id: null,
        activeDeals: { $sum: 1 },
        pipelineValue: { $sum: '$dealValue' },
      },
    },
  ])
  ```
- **Parallel DB Execution:** Run `contactStats`, `dealStats`, `User.countDocuments`, and `DataHealthLog.findOne` concurrently via `Promise.all`.
- **`getLeadsOverTime` Optimization:** Move `$dateToString` directly into `$group._id`, removing the intermediate `$project` stage.
- **`getPipelineSummary` Optimization:** Use `$ifNull: [{ $toString: '$_id' }, 'unassigned']` in `$project`, avoiding client-side `.map()` allocations.

### Bolt 3: Zero-Cache Route Caching & Tenant Isolation Hardening
**File:** `server/src/features/dashboard/dashboard.service.ts`
- **`getActivityFeed`:**
  - Cache under `dashboard:activityFeed:${JSON.stringify(tenantFilter)}` (`TTL = 60s`).
  - Use covered lean projection `.select('_id type description createdAt createdByName')` and `.limit(20)`.
- **`getLeadPortal`:**
  - Cache under `dashboard:leadPortal:${user._id.toString()}` (`TTL = 180s`).
  - Enforce tenant isolation: strictly require `{ brokerageId: user.brokerageId }` on all queries.
  - Cast IDs via `new mongoose.Types.ObjectId(id)` (`DI-001`).
  - Replace `/i` regex with exact normalized email lookup: `email: user.email.toLowerCase()`.
  - Parallelize assigned agent lookup and deals lookup with `.limit(20)` (`PERF-M-002`).

### Bolt 4: Atomic Mutations & Invalidation Hooks
**File:** `server/src/features/dashboard/dashboard.service.ts`
- **`updateLeadPortalProfile`:**
  - Execute atomic `User.updateOne({ _id: user._id, brokerageId: user.brokerageId }, { $set: userUpdates })` (`DI-002`).
  - Execute atomic `Contact.updateOne({ _id: contactId, brokerageId: user.brokerageId }, { $set: contactUpdates })` (`DI-002`).
  - Purge cached portal data via `cacheDelete(getLeadPortalCacheKey(user._id.toString()))`.
  - Return fresh `getLeadPortal(user)`.

### Bolt 5: Automated Test Suite & Sign-Off
**File:** `server/tests/unit/dashboardPerformance.test.ts`
- Comprehensive unit tests covering:
  - Cache corruption safety (`safeJsonParse`).
  - Multi-tenant query isolation in `getLeadPortal`.
  - Mathematical and structural parity of consolidated KPI aggregations.
  - Absence of bcrypt re-hashing during atomic profile updates.
  - Cache invalidation verification.
  - High-resolution telemetry instrumentation.

---

## 4. Quality Gate & Acceptance Criteria

| Criteria | Target | Gate Status |
| :--- | :--- | :--- |
| **Cached Loopback Latency** | `< 1.0ms` | Must achieve via single-pass LRU/Redis |
| **Uncached DB Latency** | `< 10ms` | Must achieve via consolidated aggregations & indexes |
| **Multi-Tenant Isolation** | 100% Zero Leakage | Scoped strictly to `user.brokerageId` |
| **Test Suite Pass Rate** | 100% (all existing + new tests) | `npm test` passes cleanly |
| **TypeScript Compilation** | 0 errors | `npm run typecheck` passes cleanly |
