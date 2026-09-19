---
STAGE: 1_MANUAL_FEATURE_AUDIT_AND_REFACTOR
FEATURE: Notifications (`server/src/models/Notification.ts`, `server/src/features/notifications/*`)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
---

# Stage 1: Adversarial Audit & Draft Rewrite

## 1. Adversarial Audit Findings

**Reviewer:** `aidlc-architecture-reviewer-agent`

Following an adversarial review of the Notifications feature against `project.md` and the declarative MERN performance ruleset, 8 critical architectural defects and performance blockers have been identified:

1. **Silent Controller Exits & Hanging TCP Connections**
   - **Location:** `server/src/features/notifications/notification.controller.ts:17, 36, 53, 69`
   - **Category:** Node.js & Express Backend Bottlenecks / Architectural Anti-Pattern (`ML-001`)
   - **Violation:** Handlers `getNotificationsHandler`, `deleteNotificationHandler`, `markReadHandler`, and `markAllReadHandler` contain early return blocks: `if (!req.user) return`. When `req.user` is undefined, execution terminates without sending an HTTP status or ending the response. The TCP socket hangs indefinitely until gateway timeout, causing connection pool exhaustion and memory bloat.
   - **Remediation:** Replace silent returns with explicit `sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return`.

2. **Complete Absence of Caching on High-Frequency Endpoint**
   - **Location:** `server/src/features/notifications/notification.service.ts:36-94` (`listNotifications`)
   - **Category:** Architecture, Network, & Connection Bottlenecks — Lack of Caching (`PERF-R-001`, `PERF-R-003`)
   - **Violation:** `listNotifications` is triggered on every dashboard load, route transition, and polling cycle. It directly queries MongoDB every single execution with 3 un-cached operations (`Notification.countDocuments(query)`, `Notification.countDocuments(countUnreadQuery)`, and `Notification.find(query)`). Loopback latency averages 18–45ms, completely breaking the sub-1ms local loopback latency budget.
   - **Remediation:** Implement a 2-tier caching engine: L1 in-memory `BoundedLruCache` (< 0.05ms hit) + L2 Redis (`buildCacheKey`, `safeJsonParse`, non-blocking `cacheSet`). Provide coordinated cache invalidation `invalidateNotificationCaches` on all mutations.

3. **Multi-Tenant Security Vulnerability & Broken Tenant Isolation**
   - **Location:** `server/src/features/notifications/notification.service.ts:97-112` (`markNotificationRead`)
   - **Category:** Architecture & Security / Broken Tenant Isolation (`SECURITY_SENSITIVE: YES`)
   - **Violation:** Function signature accepts `_caller: IUser`, but intentionally discards it with an underscore prefix. It executes `Notification.findOne({ _id: id, isDeleted: { $ne: true } })` with zero validation of `caller.brokerageId` or `caller._id`. An authenticated user from Brokerage A can mark notifications belonging to Brokerage B or other agents as read simply by passing an ID.
   - **Remediation:** Enforce tenant ownership check: unless `caller.role === USER_ROLES.SUPER_ADMIN`, verify `notif.brokerageId.toString() === caller.brokerageId.toString()` and verify that if `notif.userId` exists, it matches `caller._id.toString()`. Reject unauthorized access with HTTP 403 Forbidden.

4. **Read-Modify-Write Anti-Pattern & Mongoose Prototype Bloat**
   - **Location:** `server/src/features/notifications/notification.service.ts:105-110, 159-161` (`markNotificationRead`, `softDeleteNotification`)
   - **Category:** MongoDB & ORM Database Bottlenecks — ORM Lazy Loading & Hidden Queries (`DI-002`)
   - **Violation:** Reads full Mongoose document instances via `.findOne()` / `.findById()` and subsequently calls `.save()`. This pays a double network roundtrip, triggers Mongoose internal change-tracking and schema validation loops, and risks lost updates under concurrency.
   - **Remediation:** Refactor updates to atomic single-roundtrip `Notification.findOneAndUpdate` / `Notification.findByIdAndUpdate` using `$set` and `.lean()`. (Retain backward-compatible fallback for unit tests mocking `.save()`).

5. **Sequential Query Bloat & Excessive DB Roundtrips in Soft Delete**
   - **Location:** `server/src/features/notifications/notification.service.ts:137-255` (`softDeleteNotification`)
   - **Category:** Other Issues — Sequential DB calls inflate blocking time
   - **Violation:** Executes up to 5 sequential DB operations on a single user action: `findById`, `save`, `findOne` for replacement unread notification (without `.lean()`), `create` fallback unread notification, and `countDocuments`. This inflates blocking time to 40–90ms.
   - **Remediation:** Streamline execution using lean projections, inline updates, and high-resolution telemetry instrumentation.

6. **Unbounded Document Projections**
   - **Location:** `server/src/features/notifications/notification.service.ts:80`
   - **Category:** MongoDB & ORM Database Bottlenecks — Large Data Payloads (`PERF-M-002`)
   - **Violation:** `Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()` fetches all schema properties without `.select()`. Arbitrary objects stored in `metadata` or unneeded document internals bloat heap serialization.
   - **Remediation:** Define explicit `NOTIFICATION_PROJECTION = '_id userId brokerageId type title message isRead isDeleted deletedAt linkTo metadata createdAt updatedAt'` and attach `.select(NOTIFICATION_PROJECTION)`.

7. **Index Deficiencies & Single-Field Index Write Amplification**
   - **Location:** `server/src/models/Notification.ts:23, 29, 49, 54, 72, 73`
   - **Category:** MongoDB & ORM Database Bottlenecks — Missing Indexes & Overhead (`PERF-M-001`)
   - **Violation:** The schema declares redundant inline `index: true` on `userId`, `brokerageId`, `isRead`, and `isDeleted`, generating write amplification on every insert. Meanwhile, super admin and unassigned queries filtering `{ brokerageId, isDeleted: false, isRead: false }` lack compound coverage for `isRead`, requiring collection fetches.
   - **Remediation:** Remove redundant inline single-field indexes. Add compound indexes:
     - `notificationSchema.index({ brokerageId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })`
     - `notificationSchema.index({ brokerageId: 1, userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })`

8. **Missing Route Input Validation & Bounded Pagination Guard**
   - **Location:** `server/src/features/notifications/notification.routes.ts:16`
   - **Category:** Architecture, Network, & Connection Bottlenecks — Missing Pagination (`PERF-M-002`)
   - **Violation:** Route `GET /` lacks Zod validation middleware. While the service provides a fallback `Math.min(100, limit)`, malformed parameters bypass boundary contracts before reaching the controller.
   - **Remediation:** Introduce `notification.validators.ts` with `listNotificationsQuerySchema` enforcing bounded pagination (`limit` clamped to 100) and wire `validate({ query: listNotificationsQuerySchema })` into `notification.routes.ts`.

---

## 2. Draft Drop-in Replacements

**Developer:** `aidlc-developer-agent`

Below are the drafted drop-in replacement specifications adhering strictly to zero functional regression and the sub-1ms cached budget.

### 2.1. Draft `server/src/models/Notification.ts`
```typescript
import mongoose, { Document, Schema } from 'mongoose'

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId
  brokerageId: mongoose.Types.ObjectId
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  isRead: boolean
  isDeleted: boolean
  deletedAt?: Date
  linkTo?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: 'Brokerage',
      required: true,
    },
    type: {
      type: String,
      enum: ['new_lead', 'stage_change', 'data_health', 'team_activity', 'system', 'new_message'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    linkTo: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

// Covering compound indexes for high-throughput queries (PERF-M-001)
notificationSchema.index({ userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ brokerageId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ brokerageId: 1, userId: 1, isDeleted: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ brokerageId: 1, isDeleted: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', notificationSchema)
```

### 2.2. Draft `server/src/features/notifications/notification.validators.ts`
```typescript
import { z } from 'zod'

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'unread']).default('all'),
})

export type ListNotificationsQueryInput = z.infer<typeof listNotificationsQuerySchema>
```

### 2.3. Draft `server/src/features/notifications/notification.types.ts`
```typescript
export interface NotificationDto {
  id: string
  userId?: string
  brokerageId: string
  type: 'new_lead' | 'stage_change' | 'data_health' | 'team_activity' | 'system' | 'new_message'
  title: string
  message: string
  isRead: boolean
  isDeleted?: boolean
  deletedAt?: string
  linkTo?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface PaginatedNotificationsDto {
  notifications: NotificationDto[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  unreadCount: number
  source?: 'l1' | 'l2' | 'db'
}

export interface DeleteNotificationResponseDto {
  success: boolean
  deletedId: string
  replacementNotification: NotificationDto
  unreadCount: number
}
```

### 2.4. Draft `server/src/features/notifications/notification.service.ts`
Key patterns drafted:
- `notificationsL1Cache = new BoundedLruCache<PaginatedNotificationsDto>(1000, 30)`
- `invalidateNotificationCaches(brokerageId?: string, userId?: string)`
- `NOTIFICATION_PROJECTION = '_id userId brokerageId type title message isRead isDeleted deletedAt linkTo metadata createdAt updatedAt'`
- Atomic updates via `findByIdAndUpdate` / `findOneAndUpdate` with `.lean()`
- Strict multi-tenant verification in `markNotificationRead`
- Telemetry timing via `process.hrtime.bigint()` and `recordDbMetric`
