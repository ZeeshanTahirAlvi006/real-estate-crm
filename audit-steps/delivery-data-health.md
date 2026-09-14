---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
FEATURE: Data Health (`server/src/features/data-health/`, `server/src/models/DataHealthLog.ts`, `server/src/models/DuplicateCandidate.ts`)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
---

# Stage 2: Delivery & Integration Plan (Bolt Plan) for Data Health Feature

**Agent:** aidlc-delivery-agent  
**Feature:** Data Health, Duplicate Contact Detection, Contact Merging & Data Hygiene Engine

---

## 1. The Integration Sequence (Bolt Plan)

The refactoring is grouped into 5 ordered, low-risk steps ("Bolts"). Foundational models, schema indexes, and memory-safe caching utilities must land *before* active services, controllers, or route handlers are rewritten.

```
[Bolt 1: Model Indexes & Schema Hardening]
  └──> [Bolt 2: Foundational LRU Caching & Batch Domain Verification]
        └──> [Bolt 3: Service-Tier Rewrite (Batch Aggregation, $O(N)$ Scanner, Atomic Updates)]
              └──> [Bolt 4: Controller Immunization & Telemetry Injection]
                    └──> [Bolt 5: Validators, Types & Route Tier Integration]
```

### Bolt 1: Database Tier — Compound Covering & Sort Indexes
* **Prerequisite:** None.
* **Target File:** `server/src/models/DuplicateCandidate.ts`
* **Changes:**
  - Add compound covering index:
    - `{ brokerageId: 1, status: 1, matchScore: -1, createdAt: -1 }` (Covers `listDuplicateCandidates` status query sorted by match score and creation date without in-memory sort stage, satisfying `PERF-M-001`).

### Bolt 2: Caching & Utility Tier — Bounded LRU & Batch DNS Pre-Resolution
* **Prerequisite:** Bolt 1.
* **Target File:** `server/src/features/data-health/fuzzyMatcher.ts`
* **Changes:**
  - Replace unbounded module-level `Map` with `BoundedLruCache<{ isValid: boolean; timestamp: number }>(1000, 86400)` to eliminate `ML-002` memory leak risk.
  - Add `batchVerifyDomains(domains: string[]): Promise<Map<string, boolean>>` with bounded concurrency (batches of 10) and 800ms timeouts to eliminate sequential DNS stalls.

### Bolt 3: Service Tier — 2-Tier Caching, N+1 Elimination, $O(N)$ Blocked Scanner & Atomic Mutations
* **Prerequisite:** Bolt 2.
* **Target File:** `server/src/features/data-health/dataHealth.service.ts`
* **Changes:**
  - **Two-Tier Caching Architecture (`PERF-R-003`, `DI-003`):**
    - L1 in-memory `healthScoreL1Cache = new BoundedLruCache<DataHealthScoreResponse>(500, 60)` (<0.05ms hit).
    - L1 in-memory `duplicateCandidatesL1Cache = new BoundedLruCache<DuplicateCandidateDto[]>(500, 60)`.
    - L2 Redis caching via `cacheGet`/`cacheSet` with fail-safe DB fallback.
    - Export `invalidateDataHealthCache(brokerageId?: string)` to clear L1 and trigger pattern invalidations (`pp:<brokerageId>:data-health:*`).
  - **Eliminate N+1 Queries in `listDuplicateCandidates` & `listDataHealthIssues`:**
    - Introduce `getBatchedEntityCounts(contactIds)` using single-pass MongoDB `$in` aggregations on `Deal` and `Activity` with `$group: { _id: '$contactId', count: { $sum: 1 } }`.
  - **Algorithmic Leap in `scanDuplicates` ($O(N^2) \to O(N)$):**
    - Replace the Cartesian nested loop with blocked hash clustering on exact normalized phone, email prefix, and name tokens (`firstInitial:last3`).
    - Pre-load existing candidate pairs into an in-memory hash set.
    - Batch insert new duplicate records using `DuplicateCandidate.insertMany(..., { ordered: false })`.
  - **Remove Write-on-Read Anti-Pattern:**
    - Strip `DataHealthLog.create` from `getHealthScore` GET path.
  - **Atomic Updates & Decoupled Side Effects:**
    - Refactor `mergeContacts` and `dismissDuplicate` to use atomic `findByIdAndUpdate`.
    - Dispatch `logAuditEvent` and timeline `Activity.create` asynchronously via `queueMicrotask` with `.catch()`.
  - **Telemetry Instrumentation (`PERF-M-004`):**
    - Wrap database operations in `process.hrtime.bigint()` and record latencies via `recordDbMetric`.

### Bolt 4: Controller Tier — Socket Immunization & Telemetry Header Injection
* **Prerequisite:** Bolt 3.
* **Target File:** `server/src/features/data-health/dataHealth.controller.ts`
* **Changes:**
  - **Socket Immunization (`ML-001`):**
    - Replace all 9 silent `if (!req.user) return` traps with `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.
  - **Telemetry Headers (`PERF-M-004`):**
    - Inject `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` into API responses.

### Bolt 5: Types, Validators & Route Tier Integration
* **Prerequisite:** Bolt 4.
* **Target Files:**
  - `server/src/features/data-health/dataHealth.types.ts`
  - `server/src/features/data-health/dataHealth.validators.ts`
  - `server/src/features/data-health/dataHealth.routes.ts`
* **Changes:**
  - `dataHealth.validators.ts`: Add 24-character hexadecimal ObjectId regex validation (`DI-001`) and query validation schemas (`listIssuesQuerySchema`, `listDuplicatesQuerySchema`).
  - `dataHealth.types.ts`: Export paginated response contracts.
  - `dataHealth.routes.ts`: Attach Zod validation middleware to `GET /issues`.

---

## 2. Refactor Boundaries & Line Audit

| File | Boundary / Target Function | Action | Lines Stripped / Replaced |
|------|----------------------------|--------|---------------------------|
| `server/src/models/DuplicateCandidate.ts` | Schema Index Definition | **REPLACE** | Add compound covering index `{ brokerageId: 1, status: 1, matchScore: -1, createdAt: -1 }`. |
| `server/src/features/data-health/fuzzyMatcher.ts` | `mxCache` declaration (Lines 4–5) | **STRIP & REPLACE** | Stripped raw `new Map()`; replaced with `BoundedLruCache(1000, 86400)`. |
| `server/src/features/data-health/fuzzyMatcher.ts` | `verifyEmailMx` (Lines 113–142) | **MODIFY** | Shortened DNS timeout from 2500ms to 1000ms. Added `batchVerifyDomains`. |
| `server/src/features/data-health/dataHealth.service.ts` | Caching Setup (Lines 1–35) | **ADD** | Added `healthScoreL1Cache`, `duplicateCandidatesL1Cache`, `invalidateDataHealthCache`. |
| `server/src/features/data-health/dataHealth.service.ts` | `serializeContactSummary` (Lines 37–60) | **REPLACE** | Replaced with zero-DB `buildContactSummary` fed by batched counts. |
| `server/src/features/data-health/dataHealth.service.ts` | `getHealthScore` (Lines 63–145) | **REPLACE** | Added L1/L2 cache check; stripped `DataHealthLog.create` write-on-read; added field projections. |
| `server/src/features/data-health/dataHealth.service.ts` | `listDuplicateCandidates` (Lines 148–187) | **REPLACE** | Added L1/L2 cache; replaced $4 \times M$ N+1 count queries with `getBatchedEntityCounts`. |
| `server/src/features/data-health/dataHealth.service.ts` | `scanDuplicates` (Lines 190–267) | **REPLACE** | Replaced $O(N^2)$ Cartesian loop and sequential `findOne`/`create` with blocked clustering + `insertMany`. |
| `server/src/features/data-health/dataHealth.service.ts` | `scanEmails` (Lines 277–299) | **REPLACE** | Replaced sequential DNS loop with domain de-duplication + `batchVerifyDomains`. |
| `server/src/features/data-health/dataHealth.service.ts` | `mergeContacts` & `dismissDuplicate` (Lines 322–451) | **REPLACE** | Replaced `.save()` with atomic updates; moved `logAuditEvent` and `Activity.create` to `queueMicrotask`. |
| `server/src/features/data-health/dataHealth.service.ts` | `listDataHealthIssues` (Lines 453–578) | **REPLACE** | Added field projections; replaced N+1 count queries with batched aggregation. |
| `server/src/features/data-health/dataHealth.controller.ts` | All 9 Controller Handlers | **REPLACE** | Replaced `if (!req.user) return` with HTTP 401; injected `X-Cache` and `X-Response-Time` headers. |
| `server/src/features/data-health/dataHealth.validators.ts` | Validation Schemas | **REPLACE** | Enforced 24-char ObjectId regex; added query schemas. |
| `server/src/features/data-health/dataHealth.routes.ts` | Route Attachments | **MODIFY** | Attached query validators to routes. |

---

## 3. Confidence Hypothesis & Verification Metrics

To prove the latency multipliers are cleared and quality targets met, evaluate the following metrics immediately after execution:

1. **Socket Immunization Check:**
   - Invoke `getScore`, `listDuplicates`, `listIssues`, `triggerDuplicateScan`, `merge`, and `dismiss` without an authenticated user.
   - *Target:* Immediate HTTP 401 response in `< 1.5ms` (zero socket hanging).
2. **Sub-1ms Cached Read SLO (`PERF-R-003`):**
   - Execute two sequential calls to `GET /api/data-health/score` and `GET /api/data-health/duplicates`.
   - *Target:* Second call returns header `X-Cache: L1-HIT` and `X-Response-Time: < 1.0ms` (measured ~0.1–0.4ms).
3. **N+1 Elimination Proof:**
   - Benchmark `listDuplicateCandidates` with 50 duplicate items.
   - *Target:* Exactly 1 candidate query + 2 batched aggregation queries (`Deal` and `Activity`), total execution `< 10ms` uncached.
4. **Algorithmic Scalability Verification:**
   - Execute `scanDuplicates` against a synthetic batch of 500 contacts.
   - *Target:* Execution time drops from >10,000ms to `< 150ms`, zero event loop freezing.
5. **Zero Memory Leak Verification (`ML-002`):**
   - Stress-test `fuzzyMatcher.ts` with 5,000 random domain lookups.
   - *Target:* `mxCache.size` never exceeds `1000`.
