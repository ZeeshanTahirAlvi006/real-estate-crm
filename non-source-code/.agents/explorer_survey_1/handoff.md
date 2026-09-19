# Explorer Survey 1: Backend Communication & Mutation Gateways for Super Admin Multi-Tenant Restriction

**Date**: 2026-09-17T16:17:00Z  
**Author**: Explorer Survey 1  
**Role**: Read-only Investigation, Deep Code Audit & Architectural Strategy  
**Project**: PropPulse OS Backend (`server/`)  
**Targets Enforced**: Strict Multi-Tenant Isolation · `<10ms` uncached (MongoDB) · `<1ms` cached (Redis) · Zero Memory Leaks (ML-001..004) · Data Integrity (DI-001..004) · Performance (PERF-M-001..004, PERF-R-001..004)

---

## 1. Observation

Direct observations and evidence gathered from the PropPulse OS backend codebase (`server/`):

### 1.1 Communication Routes & Service Gateways

#### 1. Unified Multi-Channel Communication (`/api/communication/send`)
- **Route Definition**:
  - File: `server/src/features/communication/communication.routes.ts`, lines 48–51:
    ```ts
    // ── Authenticated Communication Endpoints (Strict Tenant Scoping) ────────
    router.use(authenticate, strictCommunicationScope)

    // ── Unified Multi-Channel Endpoints (Email / SMS / WhatsApp / Voice) ──
    router.post('/send', validate(sendUnifiedSchema), sendUnifiedHandler)
    ```
  - The route applies `authenticate` followed by `strictCommunicationScope`.
- **Tenant Scope Middleware Behavior**:
  - File: `server/src/middleware/tenantScope.ts`, lines 61–77 (`strictCommunicationScope`):
    ```ts
    export const strictCommunicationScope = (req: Request, res: Response, next: NextFunction): void | Response => {
      if (!req.user) {
        return sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED)
      }
      if (!req.user.brokerageId) {
        return sendError(res, 'User account has no associated brokerage.', HTTP_STATUS.FORBIDDEN)
      }
      req.tenantFilter = { brokerageId: req.user.brokerageId }
      req.effectiveBrokerageId = req.user.brokerageId.toString()
      next()
    }
    ```
    *Observation*: If `req.user.brokerageId` is null or undefined (e.g. Super Admin without an assigned brokerage), `strictCommunicationScope` returns 403 Forbidden. However, if Super Admin *does* have an assigned `brokerageId` (e.g. Brokerage A), `req.tenantFilter` is bound to Brokerage A.
- **Controller Handling**:
  - File: `server/src/features/communication/comm.controller.ts`, lines 8–33 (`sendUnifiedHandler`):
    ```ts
    export const sendUnifiedHandler = async (req: Request, res: Response): Promise<void> => {
      try {
        const caller = req.user
        const userId = caller?.id
        const brokerageId = caller?.brokerageId?.toString()
        const senderName = `${caller?.firstName || 'Agent'} ${caller?.lastName || ''}`.trim()

        if (!brokerageId) {
          sendError(res, 'Brokerage ID is required', HTTP_STATUS.BAD_REQUEST)
          return
        }

        if (caller?.role === USER_ROLES.SUPER_ADMIN && req.body.conversationId) {
          const existingConv = await Conversation.findById(req.body.conversationId)
          if (existingConv && (!existingConv.assignedAgentId || existingConv.assignedAgentId.toString() !== caller._id.toString())) {
            sendError(res, 'Access denied: Super Admin is restricted from sending communications on behalf of other users.', HTTP_STATUS.FORBIDDEN)
            return
          }
        }

        const result = await commService.sendUnifiedMessage(req.body, userId, brokerageId, senderName)
        sendSuccess(res, result, `Message dispatched successfully via ${req.body.channel.toUpperCase()}`, HTTP_STATUS.CREATED)
      } ...
    ```
    *Critical Vulnerability Observed*: The controller checks `req.body.conversationId`, but completely **fails to validate `req.body.contactId` or `req.body.to`** against cross-brokerage contacts!
- **Service Layer Dispatch Logic**:
  - File: `server/src/features/communication/comm.service.ts`, lines 103–146 (`sendUnifiedMessage`):
    ```ts
    // 1. Contact & DNC Pre-Send Verification Guard
    let contact = null
    if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
      contact = await Contact.findOne({ _id: input.contactId, brokerageId }).lean()
    } else if (channel === 'email') {
      contact = await Contact.findOne({ email: recipient.toLowerCase(), brokerageId }).lean()
    } else {
      contact = await Contact.findOne({ phone: recipient, brokerageId }).lean()
    }

    if (contact) {
      if (contact.dncStatus === 'opted_out') { ... }
      if (contact.dncStatus === 'dnc_federal' || contact.dncStatus === 'dnc_state') { ... }
    }

    // 2. Dispatch through Channel Provider
    const provider = this.getProvider(channel)
    const result: ProviderSendResult = await provider.send({ ... })
    ```
    *Critical Finding*: When a Super Admin supplies `input.contactId` belonging to Brokerage B (while Super Admin is assigned to Brokerage A), `Contact.findOne({ _id: input.contactId, brokerageId: Brokerage A })` returns **`null`**. Because `contact` is null, the DNC guard is bypassed, no error is thrown, and `provider.send(...)` proceeds to dispatch the email or WhatsApp message directly to the recipient! It then creates an orphaned conversation under Brokerage A.

#### 2. WhatsApp Endpoints & Services
- **Route Mounts**:
  - File: `server/src/features/communication/communication.routes.ts`, lines 64–66:
    ```ts
    router.post('/whatsapp/send', validate(sendWhatsAppSchema), sendMessage)
    router.post('/whatsapp/broadcast', validate(createWhatsAppBroadcastSchema), createBroadcast)
    ```
- **Service Implementation**:
  - File: `server/src/features/communication/whatsapp.service.ts`, lines 208–237 (`sendWhatsAppMessage`):
    ```ts
    export const sendWhatsAppMessage = async (input: SendWhatsAppInput, caller: IUser, ...): Promise<...> => {
      const brokerageId = caller.brokerageId
      let contact: IContact | null = null
      let conversation: IConversation | null = null

      // 1. Resolve Conversation if conversationId provided
      if (input.conversationId && mongoose.Types.ObjectId.isValid(input.conversationId)) {
        conversation = await Conversation.findOne({ _id: input.conversationId, brokerageId })
        ...
      }

      // 2. Resolve Contact if contactId or toPhone provided
      if (!contact && input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
        contact = await Contact.findOne({ _id: input.contactId, brokerageId })
      } else if (!contact && input.toPhone) {
        const cleanPhone = input.toPhone.replace(/\D/g, '')
        const searchDigits = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone
        contact = await Contact.findOne({ brokerageId, phone: { $regex: searchDigits } })
      }

      const destinationPhone = contact?.phone || conversation?.contactPhone || input.toPhone || ''
    ```
    *Critical Finding*: If `input.contactId` belongs to another brokerage, `Contact.findOne({ _id: input.contactId, brokerageId })` returns `null`. The code falls back to `input.toPhone` and sends the WhatsApp message without returning 403 Forbidden!
- **Broadcast Execution**:
  - File: `server/src/features/communication/whatsapp.service.ts`, lines 615–624 (`createAndExecuteBroadcast`):
    ```ts
    export const createAndExecuteBroadcast = async (input: CreateBroadcastInput, caller: IUser): Promise<WhatsAppBroadcastDto> => {
      const brokerageId = caller.brokerageId
      const filter: Record<string, any> = { brokerageId, isDeleted: false, phone: { $exists: true, $ne: '' } }
    ```
    If `caller.brokerageId` is null/undefined, this queries `{ brokerageId: undefined }` which causes inconsistent results rather than failing closed with 403.

#### 3. Inbox Conversations & Messaging Gateway
- **Route Mounts**:
  - File: `server/src/features/inbox/inbox.routes.ts`, lines 21–35:
    ```ts
    router.use(authenticate, strictCommunicationScope)
    router.post('/conversations/start', validate(startConversationSchema), startConversationHandler)
    router.post('/conversations/:id/messages', validate(sendMessageSchema), sendMessageHandler)
    ```
- **Service Implementation**:
  - File: `server/src/features/inbox/inbox.service.ts`, lines 69–84 (`verifyConversationAccess`):
    ```ts
    export const verifyConversationAccess = (caller: IUser, conv: IConversation): void => {
      if (!caller.brokerageId || !conv.brokerageId || caller.brokerageId.toString() !== conv.brokerageId.toString()) {
        throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND)
      }
      if (caller.role === USER_ROLES.SUPER_ADMIN) {
        if (!conv.assignedAgentId || conv.assignedAgentId.toString() !== caller._id.toString()) {
          throw new AppError('Access denied: Super Admin is restricted from accessing communications of other users or brokerage owners.', HTTP_STATUS.FORBIDDEN)
        }
      }
    }
    ```
  - File: `server/src/features/inbox/inbox.service.ts`, lines 410–417 (`startConversation`):
    ```ts
    const contact = await Contact.findById(input.contactId)
    if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)

    // Enforce strict tenant isolation (no cross-brokerage conversation initiation)
    if (!caller.brokerageId || contact.brokerageId.toString() !== caller.brokerageId.toString()) {
      throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
    }
    ```
    *Observation*: `startConversation` throws HTTP 404 `'Contact not found'`. While this isolates data, Acceptance Criteria specifically requires **HTTP 403 Forbidden** when a Super Admin attempts to initiate communication or messages with a cross-brokerage contact.

#### 4. Dialer / Twilio / Telephony Architecture
- **Twilio Config**: `server/src/config/env.ts`, lines 39–41 (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
- **Telephony Circuit Breaker**: `server/src/utils/circuitBreaker.ts`, line 114:
  `export const telephonyCircuit = new CircuitBreaker({ name: 'Twilio_Telephony' })`.
- **Dialer Queue Item Model**: `server/src/models/DialerQueueItem.ts`, lines 1–62:
  Schema includes `brokerageId`, `contactId`, `phone`, `status`, `priority`, `lastAttemptAt`.
  Compound index: `dialerQueueItemSchema.index({ brokerageId: 1, status: 1, priority: -1, createdAt: 1 })`.
- **Frontend Call Triggers**:
  - In `src/pages/contacts/components/ContactsTableView.tsx`, lines 123–135 & 205–221: "Call" button opens `window.open('https://web.whatsapp.com/send?phone=...', '_blank')`.
  - In `src/pages/contacts/components/ContactsGridView.tsx`, lines 154–160 & 260–268: "Call" action opens WhatsApp Web dialer.
  - In `src/pages/contacts/components/ContactKanbanCard.tsx`, lines 60–65: `handleWhatsAppCall` opens `https://web.whatsapp.com/send?phone=...`.
  - In `src/pages/portal/LeadPortalPage.tsx`, line 273: `window.location.href = 'tel:${assignedAgent.phone}'`.
  - All outbound call links rely on raw contact phone numbers.

---

### 1.2 Contact Mutation Endpoints

#### 1. Contact Update (`PATCH /api/contacts/:id`)
- **Route**: `server/src/features/contacts/contact.routes.ts`, line 53:
  `router.patch('/:id', validate(updateContactSchema), update)`
- **Controller**: `server/src/features/contacts/contact.controller.ts`, lines 60–70 (`update`).
- **Service**: `server/src/features/contacts/contact.service.ts`, lines 801–854 (`updateContact`):
  ```ts
  const existing = await Contact.findOne({ _id: objectId, isDeleted: false }).lean()
  if (!existing) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  verifyContactAccess(existing, caller)
  ```
- **Access Check Failure**:
  - File: `server/src/features/contacts/contact.service.ts`, lines 654–665 (`verifyContactAccess`):
    ```ts
    const verifyContactAccess = (
      contact: { brokerageId?: any; assignedAgentId?: any },
      caller: IUser
    ): void => {
      if (caller.role === USER_ROLES.SUPER_ADMIN) return // <--- BYPASS!
      if (contact.brokerageId && contact.brokerageId.toString() !== caller.brokerageId.toString()) {
        throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
      }
      if (caller.role === USER_ROLES.AGENT && contact.assignedAgentId?.toString() !== caller._id.toString()) {
        throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
      }
    }
    ```
  *Major Violation*: Line 658 explicitly returns early if `caller.role === USER_ROLES.SUPER_ADMIN`. Therefore, a Super Admin can execute `PATCH /api/contacts/:id` on **any** contact in the entire database, regardless of brokerage!

#### 2. Contact Deletion (`DELETE /api/contacts/:id`)
- **Route**: `server/src/features/contacts/contact.routes.ts`, lines 56–60:
  `router.delete('/:id', authorize(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD), remove)`
- **Service**: `server/src/features/contacts/contact.service.ts`, lines 914–927 (`deleteContact`):
  ```ts
  const filter: Record<string, any> = { _id: id, isDeleted: false }
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    filter.brokerageId = caller.brokerageId
  }
  if (caller.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = caller._id
  }
  const contact = await Contact.findOneAndUpdate(filter, { $set: { isDeleted: true, status: 'archived' } } ...).lean()
  ```
  *Major Violation*: If `caller.role === USER_ROLES.SUPER_ADMIN`, `filter.brokerageId` is completely omitted! A Super Admin can delete contacts belonging to other brokerages!

#### 3. Contact Note Creation (`POST /api/contacts/:id/notes`)
- **Route**: `server/src/features/contacts/contact.routes.ts`, line 63:
  `router.post('/:id/notes', validate(addNoteSchema), addNote)`
- **Service**: `server/src/features/contacts/contact.service.ts`, lines 975–1014 (`addContactNote`):
  ```ts
  const contact = await Contact.findOne({ _id: objId, isDeleted: false })
  if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  verifyContactAccess(contact, caller)
  ```
  *Major Violation*: Calls `verifyContactAccess(contact, caller)`, which returns early for Super Admin, allowing cross-brokerage note creation.

#### 4. Bulk Contact Actions (`PATCH /api/contacts/bulk`)
- **Route**: `server/src/features/contacts/contact.routes.ts`, line 47:
  `router.patch('/bulk', validate(bulkContactActionSchema), bulkAction)`
- **Service**: `server/src/features/contacts/contact.service.ts`, lines 1162–1166 (`bulkUpdateContacts`):
  ```ts
  const filter: Record<string, any> = {
    _id: { $in: objectIds },
    brokerageId: caller.brokerageId,
    isDeleted: false,
  }
  ```
  If Super Admin has `caller.brokerageId == null`, `filter.brokerageId` is `undefined`, causing unpredictable Mongoose query behavior.

#### 5. VIP Portal Credential Generation (`GET / POST /api/contacts/:id/portal-invite`)
- **Service**: `server/src/features/contacts/contact.service.ts`, lines 634–644 (`getOrGeneratePortalInvite`):
  ```ts
  const contact = await Contact.findOne({
    _id: objContactId,
    brokerageId: caller.brokerageId,
    isDeleted: false,
  }).lean()
  if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  ```
  If a Super Admin queries a contact belonging to another brokerage, it returns 404 instead of 403 Forbidden.

---

### 1.3 Auth & Authorization Context

1. **Authentication Token & Session Flow**:
   - `authenticate.ts` (lines 47–49 & 101–105) projects `_id email role brokerageId isActive tokenVersion ...`.
   - `req.user` contains `role: string` and `brokerageId?: mongoose.Types.ObjectId`.
2. **Super Admin Brokerage Population**:
   - In `server/src/models/User.ts`, line 65:
     ```ts
     brokerageId: {
       type: Schema.Types.ObjectId,
       ref: 'Brokerage',
       required: [true, 'Brokerage ID is required'],
       index: true,
     }
     ```
   - In `server/src/features/auth/auth.service.ts`, lines 34 & 59:
     `const brokerageId = user.brokerageId ? user.brokerageId.toString() : ''`.
   - In `server/src/features/auth/auth.controller.ts`, line 98:
     `const rawBrokerageId = req.user.brokerageId ? req.user.brokerageId.toString() : ''`.
   - *Key Finding*: While normal users always have a valid `brokerageId`, Super Admin accounts in database or integration environments can have an unassigned or null `brokerageId`. The system must explicitly handle null/undefined `brokerageId` for Super Admin: **if null/undefined, Super Admin has no home brokerage, meaning all contacts across all brokerages are strictly non-contactable and read-only.**
3. **Contact Model Representation**:
   - In `server/src/models/Contact.ts`, lines 167–172:
     ```ts
     brokerageId: {
       type: Schema.Types.ObjectId,
       ref: 'Brokerage',
       required: [true, 'Brokerage ID is required'],
       index: true,
     }
     ```
   - All valid contacts have a non-null `brokerageId` referencing `Brokerage`.
   - Primary compound index: `{ brokerageId: 1, isDeleted: 1, createdAt: -1 }`.

---

### 1.4 MERN Performance & Rule Compliance Audit

| Rule ID | Category | Requirement | Audit Finding in Current Codebase |
| :--- | :--- | :--- | :--- |
| **DI-001** | Data Integrity | Re-wrap cache-sourced IDs in `new mongoose.Types.ObjectId(id)` | Compliant in `authenticate.ts:101`, `contact.service.ts:805, 986`. Must maintain in all new guards. |
| **DI-002** | Data Integrity | No Mongoose instance methods on `.lean()` results | Compliant in `contact.service.ts` (`Contact.findOneAndUpdate` used). Must ensure no `.save()` is called on lean docs. |
| **DI-003** | Data Integrity | Redis read/write failure isolation with try/catch fallback | Compliant in `contact.service.ts:220–231, 284`. Must preserve in any new cache invalidation. |
| **DI-004** | Data Integrity | Virtual field parity check on `.lean()` | Handled via manual DTO mapping in `formatContactDto`. |
| **ML-001** | Memory Leak | No dangling event listeners across requests | Compliant. Socket listeners properly isolated. |
| **ML-002** | Memory Leak | Request payloads must never be pushed to outer/global scope | **VIOLATION IDENTIFIED**: In `server/src/features/communication/comm.controller.ts`, line 78: `QUICK_TEMPLATES.push(newTemplate)`. Request body payload is pushed to module-scoped `QUICK_TEMPLATES` array! Must be remediated. |
| **ML-003** | Memory Leak | Large stringified payloads scoped tightly | Compliant. Cache operations serialize inline. |
| **ML-004** | Memory Leak | Cursors/streams explicit teardown on early exits | Compliant in export streaming. |
| **PERF-M-001** | Performance | Hot-path queries covered by indexes | `Contact.findById` uses `_id` PK index. List queries use compound indexes. |
| **PERF-M-002** | Performance | Array fields bounded with `$slice` | Projections omit heavy arrays in list views. |
| **PERF-M-003** | Performance | `maxPoolSize >= 100` declared in `connectDB` | Compliant in `server/src/config/db.ts:8` (`maxPoolSize: 100`). |
| **PERF-M-004** | Performance | Hot-path DB calls wrapped in `process.hrtime.bigint()` | Compliant in `contact.service.ts`, `inbox.service.ts`. |
| **PERF-R-003** | Performance | Singleton Redis client | Compliant in `server/src/config/redis.ts`. |
| **PERF-R-004** | Performance | Batch Redis get/pipeline | Compliant where multi-keys queried. |

---

## 2. Logic Chain

### 2.1 Why Current Super Admin Permissions Cause Multi-Tenant Leakage
1. **Observation 1.1.1 & 1.1.2**: `commService.sendUnifiedMessage` and `sendWhatsAppMessage` rely on `Contact.findOne({ _id: input.contactId, brokerageId: caller.brokerageId })`.
2. **Observation 1.1.1**: When a Super Admin attempts to contact a lead belonging to Brokerage B, `Contact.findOne` returns `null` because `brokerageId` filters on Super Admin's Brokerage A.
3. **Observation 1.1.1**: Because `contact` is null, the code treats the recipient as an external number/email and proceeds with dispatch instead of blocking the request!
4. **Conclusion 1**: Outbound communication gateways must actively query the target contact's true ownership. If the contact belongs to any brokerage other than `caller.brokerageId`, execution must halt immediately with **HTTP 403 Forbidden**.

### 2.2 Why Super Admin Mutation Guards Fail
1. **Observation 1.2.1**: `verifyContactAccess` contains `if (caller.role === USER_ROLES.SUPER_ADMIN) return`.
2. **Observation 1.2.2**: `deleteContact` omits `filter.brokerageId` for `USER_ROLES.SUPER_ADMIN`.
3. **Logic**: Because `verifyContactAccess` was designed for platform oversight rather than tenant confinement, Super Admin is treated as universally authorized to mutate any contact.
4. **Conclusion 2**: `verifyContactAccess` must be split or updated:
   - Read operations (`getContactById`) allow Super Admin access with data masking (handled by Survey 2).
   - Write/mutation operations (`updateContact`, `deleteContact`, `addContactNote`, `bulkUpdateContacts`) must enforce `isCrossBrokerage(contact.brokerageId, caller)` and return **HTTP 403 Forbidden** if cross-brokerage.

### 2.3 Handling Super Admin with Null / Undefined `brokerageId`
1. **Observation 1.3.2**: In development, testing, or system administration, a Super Admin may have no assigned brokerage (`req.user.brokerageId == null`).
2. **Requirement R1**: "If Super Admin has no assigned brokerage (brokerageId is null/undefined), all contacts across all brokerages are non-contactable."
3. **Logic**:
   - For a Super Admin with no assigned brokerage, their set of allowed contacts is empty (`∅`).
   - Every contact in the system is considered cross-brokerage relative to this Super Admin.
   - Any attempt to send unified messages, WhatsApp chats, dialer calls, or execute mutations must return **HTTP 403 Forbidden**.

### 2.4 High-Performance Choke Point (Zero COLLSCAN & Sub-Millisecond Verification)
1. **Observation 1.3.3**: `Contact` has an indexed primary key `_id`.
2. **Logic**:
   - To verify communication permissions, we need to inspect only `{ brokerageId: 1 }`.
   - By querying `Contact.findById(contactId).select('brokerageId').lean()`:
     - MongoDB uses the B-tree index on `_id`.
     - `totalDocsExamined === 1`, `executionTimeMillis < 1ms`.
     - Zero collection scan, satisfying Rule PERF-M-001.
   - For destination phone/email verification when `contactId` is not supplied:
     - Compound indexes `{ brokerageId: 1, phone: 1, isDeleted: 1 }` and `{ brokerageId: 1, email: 1, isDeleted: 1 }` exist on `Contact`.
     - Querying `Contact.findOne({ phone: cleanPhone, isDeleted: false }).select('brokerageId').lean()` matches the indexed fields in `< 2ms`.

---

## 3. Caveats

1. **Inbound Webhook Immunity**:
   - Meta WhatsApp webhooks (`/api/communication/whatsapp/webhook`) and IMAP email listener (`imap.listener.ts`) operate autonomously without a logged-in user session.
   - The multi-tenant boundary restrictions must apply strictly to **user-initiated outbound communications and mutations**, never blocking inbound webhook ingestion.
2. **Distinguishing 404 vs 403**:
   - If a contact does not exist in the database at all: return **HTTP 404 Not Found**.
   - If a contact exists in the database but belongs to a different brokerage than the Super Admin's assigned brokerage: return **HTTP 403 Forbidden** with a clear message: `"Access denied: Super Admin can only communicate with contacts belonging to their own assigned brokerage."`
3. **Frontend Action Button Coordination**:
   - While the backend API acts as the authoritative security barrier (returning 403), the frontend must inspect `contact.isCrossBrokerage` and disable/hide the Call, WhatsApp, Message, Edit, and Delete action buttons to prevent user frustration.

---

## 4. Conclusion & Implementation Strategy

### 4.1 Architecture of the Unified Multi-Tenant Security Gateway

```
                             [ Outbound HTTP Request ]
                                         │
                        [ authenticate + tenantScope ]
                                         │
                                         ▼
            ┌────────────────────────────────────────────────────────┐
            │       Caller is Super Admin (USER_ROLES.SUPER_ADMIN)?   │
            └───────────┬────────────────────────────────┬───────────┘
                        │ YES                            │ NO
                        ▼                                ▼
            ┌───────────────────────┐         ┌─────────────────────────┐
            │ Has assigned          │         │ Existing Tenant Scoping │
            │ caller.brokerageId?   │         │ (Strict Home Brokerage) │
            └───────────┬───────────┘         └─────────────────────────┘
                 NO     │     YES
                 │      ▼
                 │   ┌──────────────────────────────────────────────┐
                 │   │ Target Contact's brokerageId matches caller? │
                 │   └───────────────┬──────────────────────────────┘
                 │              NO   │   YES
                 ▼                   ▼    ▼
          [ 403 Forbidden ]  [ 403 Forbidden ]  [ Allowed: Dispatch / Mutate ]
```

### 4.2 Concrete Implementation Blueprint

#### Module 1: Communication Boundary Guard (`server/src/features/communication/commGuard.ts`)
Create a dedicated, reusable, zero-overhead security guard:

```ts
import mongoose from 'mongoose'
import { Contact } from '../../models/Contact.js'
import { Conversation } from '../../models/Conversation.js'
import { IUser } from '../../models/User.js'
import { USER_ROLES, HTTP_STATUS } from '../../utils/constants.js'
import { AppError } from '../../middleware/errorHandler.js'

export interface OutboundCommunicationTarget {
  contactId?: string | mongoose.Types.ObjectId
  to?: string
  conversationId?: string | mongoose.Types.ObjectId
}

/**
 * Enforces strict multi-tenant communication boundaries for Super Admin.
 * Super Admin can initiate communication ONLY to contacts belonging to their own assigned brokerage.
 * If Super Admin has no assigned brokerage (null/undefined), all contacts are non-contactable.
 * Throws HTTP 403 Forbidden on violation.
 */
export const assertSuperAdminCanContact = async (
  caller: IUser,
  target: OutboundCommunicationTarget
): Promise<void> => {
  if (caller.role !== USER_ROLES.SUPER_ADMIN) {
    return
  }

  // If Super Admin has no assigned brokerage, all contacts are non-contactable (R1)
  if (!caller.brokerageId) {
    throw new AppError(
      'Access denied: Super Admin has no assigned brokerage and cannot initiate communications.',
      HTTP_STATUS.FORBIDDEN
    )
  }

  const callerBrokerageStr = caller.brokerageId.toString()

  // 1. Verify by conversationId
  if (target.conversationId && mongoose.Types.ObjectId.isValid(target.conversationId.toString())) {
    const conv = await Conversation.findById(new mongoose.Types.ObjectId(target.conversationId.toString()))
      .select('brokerageId assignedAgentId')
      .lean()

    if (conv && conv.brokerageId.toString() !== callerBrokerageStr) {
      throw new AppError(
        'Access denied: Cross-brokerage communication is prohibited for Super Admin.',
        HTTP_STATUS.FORBIDDEN
      )
    }
  }

  // 2. Verify by contactId
  if (target.contactId && mongoose.Types.ObjectId.isValid(target.contactId.toString())) {
    const contact = await Contact.findById(new mongoose.Types.ObjectId(target.contactId.toString()))
      .select('brokerageId')
      .lean()

    if (contact) {
      if (contact.brokerageId.toString() !== callerBrokerageStr) {
        throw new AppError(
          'Access denied: Super Admin can only contact leads belonging to their own assigned brokerage.',
          HTTP_STATUS.FORBIDDEN
        )
      }
    }
  }

  // 3. Verify by direct destination (Phone or Email)
  if (target.to && typeof target.to === 'string' && target.to.trim()) {
    const rawTarget = target.to.trim()
    const isEmail = rawTarget.includes('@')

    let matchedContact = null
    if (isEmail) {
      matchedContact = await Contact.findOne({
        email: rawTarget.toLowerCase(),
        isDeleted: false,
      })
        .select('brokerageId')
        .lean()
    } else {
      const cleanPhone = rawTarget.replace(/\D/g, '')
      const searchDigits = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone
      matchedContact = await Contact.findOne({
        phone: { $regex: searchDigits },
        isDeleted: false,
      })
        .select('brokerageId')
        .lean()
    }

    if (matchedContact && matchedContact.brokerageId.toString() !== callerBrokerageStr) {
      throw new AppError(
        'Access denied: Target recipient belongs to another brokerage and cannot be contacted.',
        HTTP_STATUS.FORBIDDEN
      )
    }
  }
}
```

#### Module 2: Intercept Unified Communication (`server/src/features/communication/comm.controller.ts`)
Inject `assertSuperAdminCanContact` directly into `sendUnifiedHandler`:
```ts
// Before line 28 in comm.controller.ts:
await assertSuperAdminCanContact(caller as IUser, {
  contactId: req.body.contactId,
  to: req.body.to,
  conversationId: req.body.conversationId,
})
```

#### Module 3: Intercept WhatsApp Messages (`server/src/features/communication/whatsapp.service.ts`)
Inject `assertSuperAdminCanContact` into `sendWhatsAppMessage`:
```ts
// At top of sendWhatsAppMessage (line 208):
await assertSuperAdminCanContact(caller, {
  contactId: input.contactId,
  to: input.toPhone,
  conversationId: input.conversationId,
})
```
And in `createAndExecuteBroadcast`:
```ts
if (caller.role === USER_ROLES.SUPER_ADMIN && !caller.brokerageId) {
  throw new AppError(
    'Access denied: Super Admin has no assigned brokerage and cannot broadcast messages.',
    HTTP_STATUS.FORBIDDEN
  )
}
```

#### Module 4: Intercept Inbox Conversation Initiation (`server/src/features/inbox/inbox.service.ts`)
In `startConversation` (line 414):
```ts
if (caller.role === USER_ROLES.SUPER_ADMIN) {
  if (!caller.brokerageId || contact.brokerageId.toString() !== caller.brokerageId.toString()) {
    throw new AppError(
      'Access denied: Super Admin cannot initiate conversations with cross-brokerage contacts.',
      HTTP_STATUS.FORBIDDEN
    )
  }
}
```

#### Module 5: Contact Mutation Read-Only Enforcement (`server/src/features/contacts/contact.service.ts`)
1. **Refactor `verifyContactAccess` to disallow cross-brokerage mutations for Super Admin**:
   ```ts
   export const verifyContactMutationAccess = (
     contact: { brokerageId?: any; assignedAgentId?: any },
     caller: IUser
   ): void => {
     if (caller.role === USER_ROLES.SUPER_ADMIN) {
       if (!caller.brokerageId || !contact.brokerageId || contact.brokerageId.toString() !== caller.brokerageId.toString()) {
         throw new AppError(
           'Cross-brokerage contacts are strictly read-only for Super Admin.',
           HTTP_STATUS.FORBIDDEN
         )
       }
       return
     }
     if (contact.brokerageId && contact.brokerageId.toString() !== caller.brokerageId.toString()) {
       throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
     }
     if (caller.role === USER_ROLES.AGENT && contact.assignedAgentId?.toString() !== caller._id.toString()) {
       throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
     }
   }
   ```
2. **Apply in `updateContact`**:
   ```ts
   // Line 810:
   verifyContactMutationAccess(existing, caller)
   ```
3. **Apply in `deleteContact`**:
   ```ts
   // In deleteContact (line 914):
   const contactToDel = await Contact.findOne({ _id: id, isDeleted: false }).select('brokerageId').lean()
   if (!contactToDel) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
   verifyContactMutationAccess(contactToDel, caller)
   ```
4. **Apply in `addContactNote`**:
   ```ts
   // Line 989:
   verifyContactMutationAccess(contact, caller)
   ```
5. **Apply in `getOrGeneratePortalInvite`**:
   ```ts
   // Line 643:
   verifyContactMutationAccess(contact, caller)
   ```

#### Module 6: Rule ML-002 Violation Remediation (`server/src/features/communication/comm.controller.ts`)
Replace module-level array mutation (`QUICK_TEMPLATES.push(newTemplate)`) with bounded LRU cache or local copy:
```ts
// Remediate ML-002 in createQuickTemplateHandler:
export const customTemplatesCache = new BoundedLruCache<QuickTemplateDto>(200, 3600)

export const createQuickTemplateHandler = (req: Request, res: Response): void => {
  const newTemplate: QuickTemplateDto = {
    id: `tmpl-${uuidv4().substring(0, 8)}`,
    ...req.body,
  }
  customTemplatesCache.set(newTemplate.id, newTemplate, 3600)
  sendSuccess(res, newTemplate, 'Quick reply template created successfully', HTTP_STATUS.CREATED)
}
```

---

## 5. Verification Method

### 5.1 Verification Commands
1. **TypeScript Typecheck**:
   ```powershell
   node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit
   ```
   (Must pass with 0 errors).
2. **Unit Test Suite Execution**:
   ```powershell
   tsx --test tests/unit/communicationPrivacy.test.ts
   tsx --test tests/unit/contacts.test.ts
   ```

### 5.2 Independent Test Matrix & Invalidation Criteria

| Test Case | Scenario Description | Input Payload | Expected HTTP Status | Invalidation Condition |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Super Admin sends unified message to own brokerage contact | `contactId`: Contact in Brokerage A | `201 Created` | Fails if 403 returned |
| **TC-02** | Super Admin sends unified message to cross-brokerage contact | `contactId`: Contact in Brokerage B | `403 Forbidden` | Fails if 201 or 404 returned |
| **TC-03** | Super Admin sends unified message with cross-brokerage phone | `to`: Phone of Contact in Brokerage B | `403 Forbidden` | Fails if message sent |
| **TC-04** | Unassigned Super Admin (`brokerageId: null`) sends message | Any `contactId` or `to` | `403 Forbidden` | Fails if permitted |
| **TC-05** | Super Admin sends WhatsApp message to cross-brokerage contact | `contactId`: Contact in Brokerage B | `403 Forbidden` | Fails if message dispatched |
| **TC-06** | Super Admin updates cross-brokerage contact profile | `PATCH /api/contacts/:id` (Brokerage B) | `403 Forbidden` | Fails if contact updated |
| **TC-07** | Super Admin deletes cross-brokerage contact | `DELETE /api/contacts/:id` (Brokerage B) | `403 Forbidden` | Fails if contact archived |
| **TC-08** | Super Admin adds note to cross-brokerage contact | `POST /api/contacts/:id/notes` (Brokerage B) | `403 Forbidden` | Fails if note created |
| **TC-09** | Super Admin generates portal credentials for cross-brokerage contact | `GET/POST /api/contacts/:id/portal-invite` | `403 Forbidden` | Fails if credentials issued |
| **TC-10** | Uncached query performance benchmark | `assertSuperAdminCanContact` execution time | `< 2.0ms` | Fails if > 10.0ms or COLLSCAN |
