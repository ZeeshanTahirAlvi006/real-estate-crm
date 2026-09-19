# Project: PropPulse OS — Super Admin Multi-Tenant Boundary Restrictions & Contact Masking

## Architecture
PropPulse OS is a MERN-stack multi-tenant Real Estate CRM (Node.js/Express/TypeScript backend under `server/`, React 19/TypeScript/Vite/Tailwind frontend under `src/`, MongoDB with Mongoose, Redis caching).

Multi-tenant boundary enforcement isolates brokerage data and communication channels:
1. **Communication & Mutation Security Gateway (`server/src/features/communication/commGuard.ts` & `contact.service.ts`)**:
   - Outbound communication (`/api/communication/send`, WhatsApp, Broadcasts, Inbox Conversation start) rejects cross-brokerage requests from Super Admins with HTTP 403 Forbidden.
   - If Super Admin has no assigned brokerage (`req.user.brokerageId == null`), all contacts across all brokerages are non-contactable and strictly read-only.
   - Contact mutations (`PATCH/PUT /api/contacts/:id`, `DELETE /api/contacts/:id`, `POST /api/contacts/:id/notes`, `portal-invite`, `bulk`) reject cross-brokerage modifications with HTTP 403 Forbidden.
2. **Attribution & Wire-Level Masking Engine (`server/src/utils/maskingHelper.ts`)**:
   - `resolveBrokerageNames(brokerageIds)` resolves brokerage names using a `BoundedLruCache` and single indexed `$in` queries (zero COLLSCAN, sub-millisecond).
   - `formatContactDto`: For cross-brokerage contacts viewed by Super Admin, `phone`, `secondaryPhone`, `email`, and `portalAccessEmail` are transformed to masked formats (`+92 3******67`, `j***@domain.com`) before serializing to HTTP response. Raw unmasked strings NEVER touch the network wire.
   - Deep redaction utility (`redactDeep`) masks phone and email references in `AuditLog` details, previous/new states, and `Activity` feeds while preserving operational context.
   - CSV export query is strictly locked to `user.brokerageId`, returning 0 rows if Super Admin has no assigned brokerage.
3. **Frontend UI Attribution, Action Disabling & Tooltip Layer**:
   - `useContactRestriction`: centralized hook detecting `isCrossBrokerage` and `isSuperAdmin`.
   - `<BrokerageBadge>`: renders resolved brokerage name as a subtle pill badge directly beneath contact names in Table, Grid, Kanban, Detail Page, and Drawers (visible ONLY to Super Admins; no extra table column added).
   - `<RestrictedActionTooltip>`: wraps disabled action buttons (Call, WhatsApp, Send Message, Email, Share Portal, Edit, Delete, Save Note) with clean tooltip feedback.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Comm Guard: Outbound Unified Send | Rejects `/api/communication/send` to cross-brokerage contact with 403 | M1 | Survey 1 (commGuard.ts) |
| 2 | Comm Guard: WhatsApp & Broadcasts | Rejects WhatsApp send & broadcast to cross-brokerage contact with 403 | M1 | Survey 1 (whatsapp.service.ts) |
| 3 | Comm Guard: Inbox Start Conversation | Rejects conversation initiation to cross-brokerage contact with 403 | M1 | Survey 1 (inbox.service.ts) |
| 4 | Comm Guard: Unassigned Super Admin | Blocks all outbound communication if Super Admin has no assigned brokerage | M1 | Survey 1 (commGuard.ts) |
| 5 | Mutation Guard: Contact Update | Rejects `PATCH /api/contacts/:id` on cross-brokerage contact with 403 | M1 | Survey 1 (contact.service.ts) |
| 6 | Mutation Guard: Contact Deletion | Rejects `DELETE /api/contacts/:id` on cross-brokerage contact with 403 | M1 | Survey 1 (contact.service.ts) |
| 7 | Mutation Guard: Contact Notes | Rejects `POST /api/contacts/:id/notes` on cross-brokerage contact with 403 | M1 | Survey 1 (contact.service.ts) |
| 8 | Mutation Guard: Portal Credential | Rejects portal credential generation for cross-brokerage contact with 403 | M1 | Survey 1 (contact.service.ts) |
| 9 | Memory Leak Remediation | Remediates Rule ML-002 module-level array push in `comm.controller.ts` | M1 | Survey 1 (comm.controller.ts) |
| 10 | DTO Attribution | Extends `ContactResponseDto` with `brokerageId`, `brokerageName`, `isCrossBrokerage` | M2 | Survey 2 (contact.types.ts) |
| 11 | Batch Brokerage Resolution | High-performance LRU cache + covered `$in` query resolving brokerage names | M2 | Survey 2 (contact.service.ts) |
| 12 | Wire-Level Phone & Email Masking | Mask phone (`+92 3******67`) and email (`j***@domain.com`) on wire | M2 | Survey 2 (maskingHelper.ts) |
| 13 | Audit Log Privacy Redaction | Deep redaction of phone/email in `details`, `previousState`, `newState` | M2 | Survey 2 (audit.service.ts) |
| 14 | Activity Stream Redaction | Redaction of phone/email in activity feeds (`/api/contacts/:id/activities`) | M2 | Survey 2 (contact.service.ts) |
| 15 | CSV Export Privacy Lock | Scopes export query to `user.brokerageId`, returns empty if unassigned | M2 | Survey 2 (export.service.ts) |
| 16 | Frontend Type Extensions | Updates `Contact` & `ConversationThread` in `src/types/` | M3 | Spec Miner (`src/types/index.ts`) |
| 17 | Brokerage Badge Component | Subtle badge beneath contact name visible exclusively to Super Admin | M3 | Spec Miner (`BrokerageBadge.tsx`) |
| 18 | Restricted Tooltip Component | Tooltip wrapper for disabled buttons capturing pointer events | M3 | Spec Miner (`RestrictedActionTooltip.tsx`) |
| 19 | Contacts Table View Restriction | Badge under name in NAME cell; disabled Call, WhatsApp, Message, Edit, Delete | M3 | Spec Miner (`ContactsTableView.tsx`) |
| 20 | Contacts Grid View Restriction | Badge under name; disabled action buttons & phone link | M3 | Spec Miner (`ContactsGridView.tsx`) |
| 21 | Contacts Kanban View Restriction | Badge under name; disabled drag-and-drop & action buttons | M3 | Spec Miner (`ContactKanbanCard.tsx`) |
| 22 | Contact Detail Page Restriction | Badge in hero banner; disabled Edit, Portal, Save Note, Merge Duplicate | M3 | Spec Miner (`ContactDetailPage.tsx`) |
| 23 | Inbox & Start Modal Restriction | Attribution badge & disabled cross-brokerage selection | M3 | Spec Miner (`StartConversationModal.tsx`) |
| 24 | Contacts Page Export Guard | Disables export or shows warning for unassigned Super Admin | M3 | Spec Miner (`ContactsPage.tsx`) |
| 25 | E2E Opaque-Box Test Suite | Tiers 1-4 comprehensive test suite verifying full multi-tenant behavior | M4 | Test Track (`TEST_INFRA.md`) |
| 26 | Adversarial Hardening & Audit | White-box stress tests, memory leak checks, forensic integrity audit | M4 | Test Track (Tier 5) |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Communication & Mutation Security Guards | Features 1–9 (`commGuard.ts`, `comm.controller.ts`, `whatsapp.service.ts`, `inbox.service.ts`, `contact.service.ts`) | Survey | DONE |
| M2 | Backend Attribution, Masking Engine, Audit & Export | Features 10–15 (`maskingHelper.ts`, `contact.types.ts`, `contact.service.ts`, `audit.service.ts`, `export.service.ts`) | M1 | IN_PROGRESS |
| M3 | Frontend Attribution UI, Action Disabling & Tooltips | Features 16–24 (`src/types/`, `useContactRestriction.ts`, `BrokerageBadge.tsx`, `RestrictedActionTooltip.tsx`, Table/Grid/Kanban/Detail/Inbox) | M2 | PLANNED |
| M4 | Comprehensive E2E Test Suite & Adversarial Hardening | Features 25–26 (Tiers 1-5 test suites, performance benchmarks, forensic victory audit) | M3 | PLANNED |

---

## Interface Contracts

### Communication Guard Contract
```ts
// server/src/features/communication/commGuard.ts
export interface OutboundCommunicationTarget {
  contactId?: string | mongoose.Types.ObjectId
  to?: string
  conversationId?: string | mongoose.Types.ObjectId
}
export const assertSuperAdminCanContact: (caller: IUser, target: OutboundCommunicationTarget) => Promise<void>
```
- Rejection: Throws `AppError(..., HTTP_STATUS.FORBIDDEN)`.

### Mutation Guard Contract
```ts
// server/src/features/contacts/contact.service.ts
export const verifyContactMutationAccess: (
  contact: { brokerageId?: any; assignedAgentId?: any },
  caller: IUser
) => void
```
- Rejection: Throws `AppError('Cross-brokerage contacts are strictly read-only for Super Admin.', HTTP_STATUS.FORBIDDEN)`.

### Masking Engine Contract
```ts
// server/src/utils/maskingHelper.ts
export const maskPhone: (phone?: string) => string
export const maskEmail: (email?: string) => string
export const isCrossBrokerage: (resourceBrokerageId: mongoose.Types.ObjectId | string | undefined, caller: IUser) => boolean
export const redactSensitiveText: (text: string) => string
export const redactDeep: (obj: any) => any
```

### Frontend Restriction Hook Contract
```ts
// src/hooks/useContactRestriction.ts
export interface ContactRestrictionResult {
  isSuperAdmin: boolean
  isRestricted: boolean
  brokerageName?: string
  restrictionReason?: string
}
export function useContactRestriction(contact?: { brokerageId?: string; brokerageName?: string } | null): ContactRestrictionResult
```

---

## Code Layout
- `server/src/features/communication/commGuard.ts`: New communication security guard.
- `server/src/features/communication/comm.controller.ts`: Intercept unified communication; fix ML-002.
- `server/src/features/communication/whatsapp.service.ts`: Intercept WhatsApp messages and broadcasts.
- `server/src/features/inbox/inbox.service.ts`: Intercept conversation initiation.
- `server/src/utils/maskingHelper.ts`: New data masking and deep redaction utility.
- `server/src/features/contacts/contact.types.ts`: Contact DTO types.
- `server/src/features/contacts/contact.service.ts`: Mutation guards, batch brokerage resolver, wire-level masking.
- `server/src/features/audit/audit.service.ts`: Audit log redaction.
- `server/src/features/export/export.service.ts`: CSV export tenant confinement.
- `src/types/index.ts`: Frontend contact interface.
- `src/hooks/useContactRestriction.ts`: Centralized frontend restriction hook.
- `src/components/shared/BrokerageBadge.tsx`: Super Admin brokerage attribution badge.
- `src/components/shared/RestrictedActionTooltip.tsx`: Accessible disabled tooltip wrapper.
- `src/pages/contacts/components/ContactsTableView.tsx`: Table view attribution and action disabling.
- `src/pages/contacts/components/ContactsGridView.tsx`: Grid view attribution and action disabling.
- `src/pages/contacts/components/ContactsKanbanView.tsx` & `ContactKanbanCard.tsx`: Kanban attribution and action disabling.
- `src/pages/contacts/ContactDetailPage.tsx`: Detail page attribution and read-only enforcement.
- `src/pages/inbox/InboxPage.tsx` & `StartConversationModal.tsx`: Inbox attribution and restrictions.
- `src/pages/contacts/ContactsPage.tsx`: CSV export client guard.
- `tests/`: Automated unit, integration, and E2E test suites.
