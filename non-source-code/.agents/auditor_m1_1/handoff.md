# Forensic Audit Report: Milestone 1 — Backend Communication & Mutation Multi-Tenant Security Guards

**Work Product**: Milestone 1 Implementation  
**Profile**: General Project (MERN Performance Ruleset & Anti-Cheating Policy)  
**Verdict**: INTEGRITY VIOLATION  
**Date**: 2026-09-17T16:32:00Z  
**Auditor**: Forensic Auditor (`.agents/auditor_m1_1`)  
**Target Milestone**: Milestone 1  

---

## 1. Observation

Direct, empirical observations across all Milestone 1 files and database schema:

### 1.1 Rule PERF-M-001 Violation: Unindexed & Uncovered Queries in `commGuard.ts` (Lines 78–102)
- In `server/src/features/communication/commGuard.ts`:
  ```ts
  78:     if (isEmail) {
  79:       matchedContact = await Contact.findOne({
  80:         email: rawTarget.toLowerCase(),
  81:         isDeleted: false,
  82:       })
  83:         .select('brokerageId')
  84:         .lean()
  85:     } else {
  86:       const cleanPhone = rawTarget.replace(/\D/g, '')
  87:       const searchDigits = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone
  88:       if (searchDigits.length >= 7) {
  89:         matchedContact = await Contact.findOne({
  90:           phone: { $regex: searchDigits },
  91:           isDeleted: false,
  92:         })
  93:           .select('brokerageId')
  94:           .lean()
  95:       } else {
  96:         matchedContact = await Contact.findOne({
  97:           phone: rawTarget,
  98:           isDeleted: false,
  99:         })
  100:           .select('brokerageId')
  101:           .lean()
  102:       }
  103:     }
  ```
- In `server/src/models/Contact.ts` (lines 239–252), the compound indexes defined are:
  ```ts
  239: contactSchema.index({ brokerageId: 1, email: 1, isDeleted: 1 })
  240: contactSchema.index({ brokerageId: 1, phone: 1, isDeleted: 1 })
  ...
  250: contactSchema.index({ isDeleted: 1, createdAt: -1 })
  251: contactSchema.index({ isDeleted: 1, status: 1, createdAt: -1 })
  ```
- **Finding**: The query filter `{ email: rawTarget.toLowerCase(), isDeleted: false }` and `{ phone: ..., isDeleted: false }` omits `brokerageId` (by design, to check cross-brokerage). However, there is NO index starting with `email` or `phone`. In MongoDB, an index on `{ brokerageId: 1, email: 1, isDeleted: 1 }` **cannot** be used when `brokerageId` is missing from the query. Consequently, MongoDB falls back to scanning `{ isDeleted: 1, createdAt: -1 }` (evaluating every non-deleted document in the collection) or performs a `COLLSCAN`. Furthermore, line 90 uses an unanchored regex `{ $regex: searchDigits }`, which cannot use a B-tree index. This violates Rule PERF-M-001 (BLOCKER), despite Worker M1's claim that lines 20–21 and handoff line 21 "ensure sub-millisecond execution and zero COLLSCAN".

---

### 1.2 Functional & Contract Violation in `comm.controller.ts` (Lines 21–32)
- In `server/src/features/communication/comm.controller.ts`:
  ```ts
  18:     const brokerageId = caller?.brokerageId?.toString()
  19:     const senderName = `${caller?.firstName || 'Agent'} ${caller?.lastName || ''}`.trim()
  20: 
  21:     if (!brokerageId) {
  22:       sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
  23:       return
  24:     }
  25: 
  26:     if (caller) {
  27:       await assertSuperAdminCanContact(caller as IUser, {
  28:         contactId: req.body.contactId,
  29:         to: req.body.to,
  30:         conversationId: req.body.conversationId,
  31:       })
  32:     }
  ```
- In `ORIGINAL_REQUEST.md` (R1 & Acceptance Criteria):
  > "If Super Admin has no assigned brokerage (brokerageId is null/undefined), all contacts across all brokerages are non-contactable. Any attempt by a Super Admin to send messages, trigger calls, or initiate communication to a contact outside their assigned brokerage must be rejected at the API level with 403 Forbidden."
- In `commGuard.ts` (lines 32–37):
  ```ts
  if (!caller.brokerageId) {
    throw new AppError(
      'Access denied: Super Admin has no assigned brokerage and cannot initiate communications.',
      HTTP_STATUS.FORBIDDEN
    )
  }
  ```
- **Finding**: In `sendUnifiedHandler`, line 21 checks `if (!brokerageId)` BEFORE line 27 calls `assertSuperAdminCanContact`. When an unassigned Super Admin (`brokerageId == null`) calls `/api/communication/send`, line 22 intercepts execution and responds with HTTP 400 Bad Request (`'Brokerage ID is required'`), rather than HTTP 403 Forbidden. The guard in `commGuard.ts` is rendered unreachable for this endpoint.

---

### 1.3 Unvalidated Request Parameter in Mongoose Query in `comm.controller.ts` (Line 35)
- In `server/src/features/communication/comm.controller.ts`:
  ```ts
  34:     if (caller?.role === USER_ROLES.SUPER_ADMIN && req.body.conversationId) {
  35:       const existingConv = await Conversation.findById(req.body.conversationId)
  ```
- **Finding**: `req.body.conversationId` is passed directly into `Conversation.findById(...)` without verifying `mongoose.Types.ObjectId.isValid(req.body.conversationId)` or wrapping in `new mongoose.Types.ObjectId(...)`. A malformed string causes Mongoose to throw a CastError rather than handled API validation.

---

### 1.4 Positive Observations & Compliant Rules
1. **Rule ML-002 (Remediated)**:
   In `comm.controller.ts` line 12 & 99, `BoundedLruCache<QuickTemplateDto>(200, 3600)` replaced the unbounded `QUICK_TEMPLATES.push()`. `server/src/utils/lruCache.ts` implements capacity bounding, TTL eviction, and unreferenced timer cleanup.
2. **Rule DI-002 (Compliant)**:
   In `contact.service.ts`, all mutations (`updateContact`, `deleteContact`, `addContactNote`, `getOrGeneratePortalInvite`, `bulkUpdateContacts`) use atomic `updateOne` / `findOneAndUpdate` / `updateMany`. Zero `.save()` calls on `.lean()` documents.
3. **Rule DI-003 (Compliant)**:
   In `redis.ts` and `contact.service.ts`, Redis calls are wrapped in try/catch and fall through to MongoDB / in-memory cache.
4. **Rule ML-001 (Compliant)**:
   Zero request-scoped event listeners created in Milestone 1 files.
5. **Rule ML-003 (Compliant)**:
   Payload stringification in `contact.service.ts` line 741 is inlined at the call site.
6. **Rule PERF-M-003 (Compliant)**:
   In `server/src/config/db.ts` line 8, `maxPoolSize: 100` is explicitly configured.
7. **Read-Only Guards in `contact.service.ts` (Compliant)**:
   `verifyContactMutationAccess` cleanly throws HTTP 403 Forbidden on update, delete, add note, portal invite, and bulk update for Super Admins targeting contacts outside their assigned brokerage.
8. **Inbox Guard in `inbox.service.ts` (Compliant)**:
   `startConversation` (lines 414–420) cleanly checks `caller.brokerageId` and throws HTTP 403 Forbidden for cross-brokerage attempts.
9. **Broadcast Guard in `whatsapp.service.ts` (Compliant)**:
   `createAndExecuteBroadcast` (lines 627–632) checks unassigned Super Admin and throws HTTP 403 Forbidden.

---

## 2. Logic Chain

1. **Premise 1**: Under the MERN Performance Ruleset, Rule PERF-M-001 is a **BLOCKER**: *"Any query tagged @hotpath (or matched via an allowlist of latency-critical routes)... winningPlan contains no COLLSCAN stage, AND the index's field list is a superset of both the filter fields and the projection fields (a true covered query — no fetch stage required)."*
2. **Premise 2**: Under `ORIGINAL_REQUEST.md` R1 and Acceptance Criteria: *"Any attempt by a Super Admin to send messages, trigger calls, or initiate communication to a contact outside their assigned brokerage must be rejected at the API level with 403 Forbidden. If Super Admin has no assigned brokerage (brokerageId is null/undefined), all contacts across all brokerages are non-contactable."*
3. **Observation 1.1**: `commGuard.ts` (lines 78–102) performs `Contact.findOne({ email: ..., isDeleted: false })` and `Contact.findOne({ phone: ..., isDeleted: false })`. In `Contact.ts`, the only indexes containing `email` or `phone` have `brokerageId` as their first field (`{ brokerageId: 1, email: 1, isDeleted: 1 }`). Without `brokerageId` in the query, MongoDB cannot use these indexes as an index prefix. This forces an unindexed scan or `COLLSCAN` across contacts on every outbound communication check.
4. **Observation 1.2**: In `comm.controller.ts:sendUnifiedHandler` (lines 21–24), an unassigned Super Admin triggers `if (!brokerageId)` and receives HTTP 400 Bad Request instead of reaching line 27 and receiving HTTP 403 Forbidden.
5. **Conclusion**: Because a BLOCKER performance rule (PERF-M-001) is violated, and an explicit Acceptance Criterion contract (403 on unassigned Super Admin communication) is bypassed, the work product cannot be certified as CLEAN.

---

## 3. Caveats

- In the local execution environment, terminal execution commands via `run_command` trigger interactive permission prompts that time out. As specified in the subagent instructions, exhaustive static analysis, AST pattern tracing, schema verification, and index inspection were conducted in lieu of live `explain()` output.
- Non-super-admin communication and mutation paths remain safe and unaffected.

---

## 4. Conclusion & Required Remediation

Milestone 1 contains solid foundations, but suffers from two critical flaws:
1. **PERF-M-001 Violation**: Missing compound index for cross-brokerage email/phone lookups in `Contact.ts`.
2. **Contract Defect**: In `comm.controller.ts:sendUnifiedHandler`, `assertSuperAdminCanContact` must be evaluated **before** `if (!brokerageId)`.

### Remediation Plan
1. **`server/src/models/Contact.ts`**:
   Add compound indexes to cover global lookups:
   ```ts
   contactSchema.index({ email: 1, isDeleted: 1, brokerageId: 1 })
   contactSchema.index({ phone: 1, isDeleted: 1, brokerageId: 1 })
   ```
2. **`server/src/features/communication/comm.controller.ts`**:
   Move `assertSuperAdminCanContact` above the `if (!brokerageId)` check:
   ```ts
   if (caller) {
     await assertSuperAdminCanContact(caller as IUser, {
       contactId: req.body.contactId,
       to: req.body.to,
       conversationId: req.body.conversationId,
     })
   }

   if (!brokerageId) {
     sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
     return
   }
   ```
3. **`server/src/features/communication/comm.controller.ts`**:
   Validate `conversationId`:
   ```ts
   if (caller?.role === USER_ROLES.SUPER_ADMIN && req.body.conversationId && mongoose.Types.ObjectId.isValid(req.body.conversationId)) {
     const convId = new mongoose.Types.ObjectId(req.body.conversationId)
     const existingConv = await Conversation.findById(convId)
     ...
   ```

---

## 5. Verification Method

To verify these findings:
1. **Inspect `server/src/models/Contact.ts` (lines 239–252)**:
   Confirm there are no indexes with `{ email: 1 }` or `{ phone: 1 }` as the leading key.
2. **Inspect `server/src/features/communication/commGuard.ts` (lines 78–102)**:
   Observe `Contact.findOne({ email: rawTarget.toLowerCase(), isDeleted: false })` which cannot use the compound index `{ brokerageId: 1, email: 1, isDeleted: 1 }`.
3. **Inspect `server/src/features/communication/comm.controller.ts` (lines 21–32)**:
   Trace execution when `caller.brokerageId` is null/undefined: line 21 returns 400 Bad Request before line 27 can execute.

---

VERDICT: INTEGRITY VIOLATION
