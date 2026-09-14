---
STAGE: MANUAL_FEATURE_AUDIT_AND_REFACTOR
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: audit-steps/project.md
FEATURE_NAME: Seller Radar
FEATURE_FILES: server/src/features/seller-radar/radar.service.ts, server/src/features/seller-radar/radar.controller.ts, server/src/features/seller-radar/radar.routes.ts, server/src/features/seller-radar/radar.validators.ts, server/src/features/seller-radar/radar.types.ts, server/src/features/seller-radar/attom.provider.ts, server/src/models/Property.ts, server/src/models/CmaReport.ts
SECURITY_SENSITIVE: YES (touches multi-tenant isolation brokerageId, public unauthenticated endpoint /cma/:id, homeowner financial PII: equity, mortgage balances, estimated values, phone/email)
---

# Stage 1: Adversarial Audit & Draft Rewrite for Seller Radar Feature

## Part 1: Adversarial Architectural Audit

**Reviewer:** aidlc-architecture-reviewer-agent  
**Target:** Seller Radar Feature (`server/src/features/seller-radar/`, `server/src/models/Property.ts`, `server/src/models/CmaReport.ts`)  
**Posture:** Adversarial — assuming the current implementation violates the sub-1ms local loopback budget, creates hanging sockets, and leaks resources, until proven otherwise.

---

### Adversarial Findings Checklist

#### 1. Missing Authentication Guards & Potential Socket Hanging (`ML-001` / `project.md § Other Issues #4`)
* **Location:** `server/src/features/seller-radar/radar.controller.ts`: Lines 15, 36, 50, 64, 105
* **Violation:** In all authenticated controller handlers (`getProspects`, `getDashboard`, `analyze`, `generateCma`, `triggerAnniversary`), the code unsafely casts `const user = req.user as IUser` without verifying if `req.user` exists or has `brokerageId`. If an upstream authentication middleware error or bypass occurs, accessing `user.brokerageId` throws an unhandled `TypeError: Cannot read properties of undefined` or can leave the TCP socket hanging indefinitely without an explicit 401 response.
* **Remediation:** Add explicit guards `if (!req.user || !req.user.brokerageId) { sendError(res, 'Unauthorized access', HTTP_STATUS.UNAUTHORIZED); return; }` to immediately terminate unauthenticated requests with HTTP 401 in < 0.2ms.

#### 2. Unindexed Regex Filter & Missing Compound Indexes Leading to Collection Scans (`PERF-M-001` / `project.md § 1.1`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 124–130 (`getProspects`), `server/src/models/Property.ts`
* **Violation:** When search query is supplied in `getProspects`:
  ```typescript
  const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  query.$or = [
    { 'address.formattedAddress': searchRegex },
    { 'address.street': searchRegex },
    { 'address.city': searchRegex },
  ]
  ```
  Neither `address.street` nor `address.city` has an index. While there is a text index on `'address.formattedAddress'`, MongoDB cannot use text indexes for regex `$or` queries. This forces an unindexed `COLLSCAN` across all properties in the tenant collection. Furthermore, sorting by `estimatedValue` or `purchaseDate` lacks compound indexes `{ brokerageId: 1, isDeleted: 1, estimatedValue: -1 }` and `{ brokerageId: 1, isDeleted: 1, purchaseDate: -1 }`, triggering in-memory sort stages.
* **Remediation:** Add compound indexes to `Property.ts` for all sort/filter fields (`estimatedValue`, `purchaseDate`, `propertyType`, and ascending variants). Normalize address search using regex prefix or indexed compound paths.

#### 3. ORM Lazy Loading via Sequential Populates & Missing Field Projections (`PERF-M-001`, `PERF-M-002`, `project.md § 1.2`, `1.3`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 137–143 (`getProspects`)
* **Violation:**
  ```typescript
  Property.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('ownerContactId', 'firstName lastName email phone tags lastContactedAt')
    .populate('assignedAgentId', 'firstName lastName email')
    .lean()
  ```
  Executing two sequential `.populate()` calls behind the scenes issues two extra MongoDB queries (`Contact.find({ _id: { $in: [...] } })` and `User.find({ _id: { $in: [...] } })`) on every page load (N+1 query expansion). Additionally, `Property.find()` lacks an explicit projection (`.select(...)`), pulling bloated document fields into memory (`notes` up to 3KB, `originalLoanAmount`, `lastAnniversaryTriggeredYear`, `yearBuilt`, `lotSizeSqft`) that the client view never displays.
* **Remediation:** Define a lean projection `PROPERTY_PROSPECT_PROJECTION` selecting only necessary fields. Batch pre-fetch populated references or optimize lookup stages with explicit projections.

#### 4. Complete Absence of Caching on High-Frequency Read Paths (`project.md § 3.2`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 98–187 (`getProspects`), Lines 192–300 (`getDashboardMetrics`), Lines 546–594 (`getCmaReport`), Lines 619–1291 (`renderCmaHtml`)
* **Violation:**
  - `getDashboardMetrics`: Executes two database aggregations plus a `getProspects` query on every single page load. Zero caching.
  - `getProspects`: Re-queries MongoDB and re-computes `countDocuments` on every page click.
  - `getCmaReport`: Re-queries MongoDB on every public viewing of a CMA report.
  - `renderCmaHtml`: Re-generates 600+ lines of HTML and executes multiple regex passes on every public view.
* **Remediation:** Implement a two-tier caching architecture:
  - L1: Fast in-memory `BoundedLruCache` (30s–60s TTL, <0.05ms retrieval) for dashboard metrics, prospects lists, CMA reports, and rendered CMA HTML.
  - L2: Redis caching with tenant-scoped keys (`pp:<brokerageId>:seller-radar:*`) and safe error fallback (`DI-003`).

#### 5. Sequential Aggregation Roundtrips on Dashboard Critical Path (`project.md § Other Issues #1`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 195–281 (`getDashboardMetrics`)
* **Violation:** The dashboard runs an initial `Promise.all` containing a property metrics aggregation and `getProspects`, and then **sequentially awaits** a second aggregation for home purchase anniversaries (`Property.aggregate([... $project: { month: { $month: '$purchaseDate' } } ...])`). This sequential DB call adds 8–15ms of blocking time on localhost loopback.
* **Remediation:** Run the anniversary count aggregation concurrently within the initial `Promise.all`, and wrap the entire dashboard result in an L1/L2 cache.

#### 6. Blocking Database Write on Public CMA Read Path (`project.md § Other Issues #5`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 554–561 (`getCmaReport`)
* **Violation:** When a prospective seller or homeowner opens their public Micro-CMA link (`GET /api/seller-radar/cma/:id`), the backend performs a blocking `CmaReport.findOneAndUpdate` with `$inc: { viewCount: 1 }` directly on the request path. A database write takes 4–12ms, needlessly delaying the initial render of the landing page.
* **Remediation:** Serve the report immediately from L1/L2 cache, and offload view count increments and socket alerts (`io.emit('cma_viewed')`) to a background asynchronous microtask with error isolation.

#### 7. Unvalidated String ObjectIds in MongoDB Filters (`DI-001`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 350, 426, 437, 547–550
* **Violation:**
  - In `analyzeProperty`: `{ _id: input.propertyId, brokerageId: user.brokerageId }` passes raw strings directly to query filters without explicit `new mongoose.Types.ObjectId(...)`.
  - In `getCmaReport`:
    ```typescript
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrShareId)
    const filter = isObjectId ? { $or: [{ _id: idOrShareId }, { shareId: idOrShareId }] } : { shareId: idOrShareId }
    ```
    Raw string `idOrShareId` is passed into `{ _id: idOrShareId }` without wrapping in `new mongoose.Types.ObjectId(idOrShareId)`. Furthermore, evaluating `$or` on `_id` and `shareId` prevents MongoDB from utilizing the unique single-field index on `shareId` cleanly.
* **Remediation:** Strictly wrap all ObjectId query fields in `new mongoose.Types.ObjectId(id)` per rule `DI-001`. Route `cma_` prefixed slugs directly to `{ shareId: idOrShareId }`.

#### 8. Five Sequential Database Queries on Micro-CMA Generation (`project.md § Other Issues #1`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 424–535 (`generateMicroCma`)
* **Violation:** In `generateMicroCma`, the system sequentially executes:
  1. `Property.findOne(...)`
  2. `Contact.findOne(...)`
  3. `calculateActiveBuyerDemand` -> `Contact.countDocuments(...)`
  4. `Brokerage.findById(...)`
  5. `CmaReport.create(...)`
  This creates 5 roundtrips sequentially, compounding latency to 30ms–60ms.
* **Remediation:** Parallelize independent queries (`Property.findOne`, `Brokerage.findById`, `calculateActiveBuyerDemand`) with `Promise.all()`, apply lean projections (`.select('name')`), and cache static brokerage metadata.

#### 9. Missing Console Performance Counters Across All Functions (User Explicit Requirement & `PERF-M-004`)
* **Location:** All functions in `radar.service.ts`, `radar.controller.ts`, and `attom.provider.ts`
* **Violation:** Zero execution timing counters exist in the codebase. Functions do not measure or log their execution duration to the console, making latency regressions invisible.
* **Remediation:** Per the user's explicit instruction (*"dont forget to add counters in each function to display time taken in the console"*), instrument EVERY controller, service, and provider function with high-resolution performance timers (`process.hrtime.bigint()`) and print execution time counters to the console, while emitting `X-Response-Time` and `X-Cache` telemetry headers on HTTP responses.

#### 10. Repeated Synchronous Contact Count Calculations on Valuation Analysis (`project.md § 3.2`)
* **Location:** `server/src/features/seller-radar/radar.service.ts`: Lines 599–614 (`calculateActiveBuyerDemand`)
* **Violation:** `Contact.countDocuments({ brokerageId, status: 'active', isDeleted: false })` is called synchronously on every single valuation analysis and every CMA generation. Brokerage contact counts are largely static across second-by-second operations.
* **Remediation:** Cache active buyer demand per brokerage in L1 `BoundedLruCache` (300s TTL) to eliminate the database count query entirely on repeated lookups.

---

## Part 2: Draft Rewrite Plan & Architecture

**Implementer:** aidlc-developer-agent  
**Posture:** High-Performance Implementation — zero functional regression, strictly honoring all existing contracts, types, and business rules, while eliminating all 10 adversarial findings.

### Architectural Invariants:
1. **L1 In-Memory Caches (`BoundedLruCache`)**:
   - `dashboardL1Cache`: 60s TTL
   - `prospectsL1Cache`: 30s TTL
   - `cmaReportL1Cache`: 120s TTL
   - `cmaHtmlL1Cache`: 300s TTL
   - `propertyAnalysisL1Cache`: 300s TTL
   - `activeBuyersL1Cache`: 300s TTL
2. **L2 Redis Caching**:
   - Keys: `pp:<brokerageId>:seller-radar:<hash>`
   - Redis fallback protection wrapped in try/catch (`DI-003`).
3. **Execution Time Counters in Every Function**:
   - High-resolution `process.hrtime.bigint()` timing logged to console in format:
     `[TIMER] <Namespace>.<functionName> completed in X.XXXms`
4. **Lean Projections & Compound Indexes**:
   - `PROPERTY_PROSPECT_PROJECTION`: selects only the 14 fields used by `SellerRadarProspect`.
   - Explicit compound indexes added to `Property.ts` and `CmaReport.ts`.
5. **Decoupled Asynchronous Side Effects**:
   - View count increments and socket notification broadcasts execute in background non-blocking microtasks.
