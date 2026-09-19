---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
FEATURE: Notifications (`server/src/models/Notification.ts`, `server/src/features/notifications/*`)
TARGET_BENCHMARKS: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
---

# Stage 2: Delivery & Integration Plan: Notifications Sub-1ms Architecture

**Agent:** `aidlc-delivery-agent`  
**Feature:** Notifications Engine  
**Review Status:** Approved by Architecture Reviewer (Stage 1 Audit Complete)  

---

## 1. The Integration Sequence (Bolt Plan)

The refactoring process is sequenced into 5 ordered Bolts. Foundational schema indexes and DTO/validation schemas land first before service, controller, and route layers are wired.

```
[Bolt 1: Model & Indexes] 
       │
       ▼
[Bolt 2: Types & Validators]
       │
       ▼
[Bolt 3: Service Layer (L1/L2 Caching, Atomic Updates, Tenant RBAC)]
       │
       ▼
[Bolt 4: Controller Immunization & Telemetry]
       │
       ▼
[Bolt 5: Routes & Socket Hardening]
```

### Bolt 1: Database Model & Compound Index Optimization
- **Target File:** `server/src/models/Notification.ts`
- **Actions:**
  1. Remove redundant inline single-field index declarations on `userId`, `brokerageId`, `isRead`, and `isDeleted` to eliminate write amplification on notification creation.
  2. Add compound covering index `{ brokerageId: 1, isDeleted: 1, isRead: 1, createdAt: -1 }` for tenant-scoped unread queries.
  3. Add compound covering index `{ brokerageId: 1, userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 }` for unassigned tenant notification fallback queries.
  4. Preserve existing `{ userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 }` and `{ brokerageId: 1, isDeleted: 1, createdAt: -1 }`.

### Bolt 2: Types & Validators Tier
- **Target Files:**
  - `server/src/features/notifications/notification.types.ts`
  - `server/src/features/notifications/notification.validators.ts` (NEW)
- **Actions:**
  1. Update `PaginatedNotificationsDto` in `notification.types.ts` to include optional `source?: 'l1' | 'l2' | 'db'`.
  2. Create `notification.validators.ts` defining `listNotificationsQuerySchema` with bounded pagination (`page >= 1`, `limit <= 100`, `status: 'all' | 'unread'`).

### Bolt 3: Service Tier Caching, Atomic Updates & Tenant Isolation
- **Target File:** `server/src/features/notifications/notification.service.ts`
- **Actions:**
  1. Initialize L1 in-memory LRU cache: `notificationsL1Cache = new BoundedLruCache<PaginatedNotificationsDto>(1000, 30)` (30s sliding TTL, < 0.05ms hit).
  2. Implement `invalidateNotificationCaches(brokerageId?: string, userId?: string)` clearing L1 memory entries and firing non-blocking Redis pattern evictions (`pp:${brokerageId}:notifications:*`).
  3. Wire L2 Redis caching in `listNotifications` using `buildCacheKey` with 60s TTL, wrapped in `safeJsonParse` for fail-safe DB fallback (DI-003).
  4. Enforce `NOTIFICATION_PROJECTION = '_id userId brokerageId type title message isRead isDeleted deletedAt linkTo metadata createdAt updatedAt'` across all read queries.
  5. Refactor `markNotificationRead` to enforce strict tenant verification (`caller.brokerageId` / `caller._id`), preventing unauthorized cross-brokerage access (Security Fix).
  6. Refactor updates to atomic updates with `.lean()` while maintaining backward compatibility with mocks that inspect `.save()`.
  7. Wrap uncached MongoDB operations in `process.hrtime.bigint()` telemetry and record with `recordDbMetric` (PERF-M-004).
  8. Call `invalidateNotificationCaches` synchronously in `markNotificationRead`, `markAllNotificationsRead`, `softDeleteNotification`, and `pushNotification`.

### Bolt 4: Controller Immunization & Telemetry Injection
- **Target File:** `server/src/features/notifications/notification.controller.ts`
- **Actions:**
  1. Replace all silent returns `if (!req.user) return` with explicit `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.
  2. In `getNotificationsHandler`, pass validated pagination parameters, record start time, and inject `X-Cache` (`L1-HIT`, `L2-HIT`, `MISS`) and `X-Response-Time` headers.

### Bolt 5: Route Middleware Wiring & Socket Hardening
- **Target Files:**
  - `server/src/features/notifications/notification.routes.ts`
  - `server/src/features/notifications/notification.socket.ts`
- **Actions:**
  1. Attach `validate({ query: listNotificationsQuerySchema })` to `GET /` in `notification.routes.ts`.
  2. Ensure socket emission in `notification.socket.ts` has error boundary wrapping and non-blocking delivery.

---

## 2. Refactor Boundaries

| File | Tier | Modifications | Lines Stripped |
| :--- | :--- | :--- | :--- |
| `server/src/models/Notification.ts` | Model | Remove redundant single-field `index: true`; add 2 compound indexes | Stripped inline `index: true` on fields |
| `server/src/features/notifications/notification.validators.ts` | Validator | New file defining `listNotificationsQuerySchema` | None (new file) |
| `server/src/features/notifications/notification.types.ts` | Types | Add `source` to `PaginatedNotificationsDto` | None |
| `server/src/features/notifications/notification.service.ts` | Service | Add L1/L2 caching, invalidation, tenant checks, atomic updates, telemetry | Stripped un-cached queries, full doc `.save()` calls, unused `_caller` |
| `server/src/features/notifications/notification.controller.ts` | Controller | Add socket immunization HTTP 401s, telemetry headers | Stripped `if (!req.user) return` silent exits |
| `server/src/features/notifications/notification.routes.ts` | Routes | Wire `validate({ query: listNotificationsQuerySchema })` | None |

---

## 3. Confidence Hypothesis & Verification Metrics

| Checkpoint | Target Metric | Verification Method |
| :--- | :--- | :--- |
| **L1 Memory Cache Hit** | `< 0.05ms` | Response header `X-Cache: L1-HIT` & test benchmark |
| **L2 Redis Cache Hit** | `< 0.50ms` | Response header `X-Cache: L2-HIT` & test benchmark |
| **Uncached DB Query** | `< 10.0ms` | `recordDbMetric` log & `process.hrtime.bigint()` delta |
| **Unauthenticated Call** | `< 1.0ms` | Immediate HTTP 401 Unauthorized (no hanging socket) |
| **Cross-Tenant Access** | HTTP 403 | `markNotificationRead` rejects cross-brokerage caller |
| **Cache Invalidation** | Immediate | Mutation drops L1 and triggers background L2 invalidation |
| **Anti-Regression** | 100% Pass | Existing `server/tests/unit/notification.test.ts` (8/8 passed) |
| **Full Suite** | 100% Pass | `npm test` (all 180+ tests pass) |
| **Typecheck** | 0 errors | `npm run typecheck` passes cleanly |
