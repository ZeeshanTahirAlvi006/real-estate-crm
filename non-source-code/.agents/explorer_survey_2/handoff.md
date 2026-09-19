# Explorer Survey 2: Backend Contact Attribution, Data Masking Engine, Audit Logs & CSV Export

**Date**: 2026-09-17T16:15:30Z  
**Author**: Explorer Survey 2  
**Role**: Read-only Investigation & Architectural Strategy  
**Project**: PropPulse OS Multi-Tenant Backend (Real Estate CRM)

---

## 1. Observation

Direct observations and evidence from the codebase:

### 1.1 Contact Querying & Serialization
1. **Route & Middleware Chain**:
   - Location: `server/src/features/contacts/contact.routes.ts`, lines 29-41 & 50:
     ```ts
     router.use(
       authenticate,
       tenantScope,
       authorize(
         USER_ROLES.SUPER_ADMIN,
         USER_ROLES.BROKERAGE_OWNER,
         USER_ROLES.TEAM_LEAD,
         USER_ROLES.AGENT
       )
     )
     router.get('/', validate({ query: listContactsQuerySchema }), getContacts)
     router.get('/:id', getContact)
     ```
2. **Tenant Scoping Behavior for Super Admin**:
   - Location: `server/src/middleware/tenantScope.ts`, lines 25-36:
     ```ts
     if (req.user.role === USER_ROLES.SUPER_ADMIN) {
       const requestedBrokerageId = req.query.brokerageId as string | undefined
       if (requestedBrokerageId && mongoose.Types.ObjectId.isValid(requestedBrokerageId)) {
         req.tenantFilter = { brokerageId: new mongoose.Types.ObjectId(requestedBrokerageId) }
         req.effectiveBrokerageId = requestedBrokerageId
       } else {
         req.tenantFilter = {}
         req.effectiveBrokerageId = req.user.brokerageId?.toString()
       }
       return next()
     }
     ```
     When Super Admin does not pass `?brokerageId=...`, `req.tenantFilter` is `{}`. Contacts from all brokerages are fetched.
3. **Missing `brokerageId` in DB Projection**:
   - Location: `server/src/features/contacts/contact.service.ts`, line 238:
     ```ts
     const projection = 'firstName lastName email phone secondaryPhone address city state zipCode leadSource leadScore tags status assignedAgentId notes propertyInterests socialLinks portalUserId portalEnabled portalAccessEmail createdAt updatedAt lastContactedAt'
     ```
     `brokerageId` is missing from the list projection string. Therefore, returned lean documents lack `c.brokerageId`.
4. **Current Contact DTO Definition**:
   - Location: `server/src/features/contacts/contact.types.ts`, lines 14-41 (`ContactResponseDto`):
     Does NOT contain `brokerageId`, `brokerageName`, or `isCrossBrokerage`.
   - Location: `server/src/features/contacts/contact.service.ts`, lines 27-69 (`formatContactDto`):
     Does NOT map or accept `brokerageName`.
5. **Existing In-Memory Brokerage Cache**:
   - Location: `server/src/features/contacts/contact.service.ts`, lines 387-389:
     ```ts
     // Cache brokerage company names (max 100 brokerages, 1 hour TTL)
     const brokerageNameCache = new BoundedLruCache<string>(100, 3600)
     ```
     An LRU cache already exists in `contact.service.ts` for single lookups, but there is currently no batch resolver for contact lists.

### 1.2 Cross-Brokerage Access & Mutation Vulnerability
1. **Permissive Super Admin Guard**:
   - Location: `server/src/features/contacts/contact.service.ts`, lines 653-665 (`verifyContactAccess`):
     ```ts
     const verifyContactAccess = (
       contact: { brokerageId?: any; assignedAgentId?: any },
       caller: IUser
     ): void => {
       if (caller.role === USER_ROLES.SUPER_ADMIN) return
       if (contact.brokerageId && contact.brokerageId.toString() !== caller.brokerageId.toString()) {
         throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
       }
       ...
     }
     ```
     Super Admin returns early (`return`) for all mutations (`updateContact`, `deleteContact`, `addContactNote`), permitting cross-brokerage writes and deletes.
2. **Delete Contact Filter**:
   - Location: `server/src/features/contacts/contact.service.ts`, lines 914-917:
     ```ts
     const filter: Record<string, any> = { _id: id, isDeleted: false }
     if (caller.role !== USER_ROLES.SUPER_ADMIN) {
       filter.brokerageId = caller.brokerageId
     }
     ```
     If Super Admin calls `DELETE /api/contacts/:id`, `brokerageId` is omitted, allowing deletion across brokerages.

### 1.3 Audit Logs & Activity Streams
1. **Audit Log Feature**:
   - Location: `server/src/features/audit/audit.routes.ts`, lines 13-29:
     `GET /api/audit-logs` and `GET /api/audit-logs/:id` authorize `USER_ROLES.SUPER_ADMIN` and `USER_ROLES.BROKERAGE_OWNER`.
   - Location: `server/src/features/audit/audit.service.ts`, lines 148-177 (`listAuditLogs`):
     Uses `$facet` aggregation with projection omitting heavy JSON blobs (`details`, `previousState`, `newState`).
   - Location: `server/src/features/audit/audit.service.ts`, lines 203-258 (`getAuditLogById`):
     Returns full document including `details`, `previousState`, and `newState`.
   - In `contact.service.ts` line 769-778, `logContactUpdate` stores unmasked `email` and `phone` in `previousState` and `newState`.
2. **Activity Streams**:
   - Location: `server/src/features/contacts/contact.service.ts`, lines 1073-1078 (`getContactActivities`):
     Queries `Activity.find({ contactId: objId })`.
   - Location: `server/src/features/dashboard/dashboard.service.ts`, line 300:
     Queries `Activity.find(queryFilter)`.
   - Activity `description` and `metadata` currently contain unmasked phone numbers and emails (e.g. `"VIP Client Portal credentials generated for ... (client@email.com)"`).

### 1.4 CSV Export Privacy
1. **Export Endpoint**:
   - Location: `server/src/features/export/export.routes.ts`, line 12:
     `router.get('/contacts', exportContacts)`
   - Location: `server/src/features/export/export.controller.ts`, lines 10-32:
     Calls `getExportContactsData(req.user)`.
   - Location: `server/src/features/export/export.service.ts`, lines 7-13:
     ```ts
     export const getExportContactsData = async (user: IUser) => {
       const contacts = await Contact.find({
         brokerageId: user.brokerageId,
         isDeleted: false,
       })
         .sort({ createdAt: -1 })
         .lean()
     ```
     If `user.brokerageId` is undefined or null (Super Admin without assigned brokerage), Mongoose queries `{ brokerageId: undefined }` which returns empty or unexpected documents without explicit guard.

---

## 2. Logic Chain

### 2.1 Contact Querying, Attribution & Performance
1. **Projection Fix**: Adding `brokerageId` to the `listContacts` projection string (`contact.service.ts:238`) allows `c.brokerageId` to be retrieved directly from the indexed document with zero extra query cost.
2. **Batch Brokerage Resolution**:
   - Contacts on a page belong to 1 or a few brokerages (typically 1–5 distinct IDs per page).
   - Using a batch resolver `resolveBrokerageNames(brokerageIds: string[])`:
     - Checks the existing `brokerageNameCache` (`BoundedLruCache<string>(100, 3600)`).
     - Gathers cache misses.
     - Executes a single indexed batch query: `Brokerage.find({ _id: { $in: missingIds } }, 'name').lean()`.
     - Populates the LRU cache.
   - Result: 0 or 1 DB query per list request, completely eliminating N+1 queries. It achieves sub-millisecond resolution while satisfying Rule PERF-M-001.

### 2.2 Wire-Level Masking Engine Guarantee
1. **Cross-Brokerage Identification**:
   - A contact is considered "cross-brokerage" if:
     `caller.role === USER_ROLES.SUPER_ADMIN && (!caller.brokerageId || contact.brokerageId.toString() !== caller.brokerageId.toString())`
   - Non-super admins (Owners, Leads, Agents) are already scoped to their own tenant via `tenantScope` and see unmasked contacts.
   - Super Admins viewing their own assigned brokerage see unmasked contacts.
   - Super Admins viewing any other brokerage see strictly masked contacts and `isCrossBrokerage: true`.
2. **Transformation at Server Serialization**:
   - Before `res.json()` or cache storage, `phone`, `secondaryPhone`, `email`, and `portalAccessEmail` are transformed by the masking utility.
   - Because this occurs in Node.js before writing to the network socket, unmasked raw values NEVER touch the network wire, preventing DevTools/API inspection leaks.
3. **Masking Algorithm**:
   - **Phone**:
     Preserve first 3 characters and last 2 digits, replacing the middle with asterisks (e.g., `+92 3******10` or `+92 3******67`).
     Pattern:
     `prefix` = first 3 characters (or 5 characters if starting with `+` and space, e.g. `+92 3`);
     `suffix` = last 2 digits;
     `middle` = `*` repeated for remaining characters (minimum 4 asterisks).
   - **Email**:
     Preserve first character of the local part, mask the rest of the local part with asterisks (minimum 3), preserve `@` and domain (e.g., `j***@domain.com`).
4. **Strict Read-Only Enforcement**:
   - In `updateContact`, `deleteContact`, `addContactNote`, and `bulkUpdateContacts`:
     If `isCrossBrokerageContact` is true, immediately reject with `HTTP_STATUS.FORBIDDEN` (403 Forbidden).
   - Frontend uses `isCrossBrokerage: true` to disable/hide Edit, Delete, Notes, Call, and Message buttons with a descriptive tooltip.

### 2.3 Audit Logs & Activity Stream Redaction
1. **Deep Object Redaction**:
   - In `AuditLog`: `details`, `previousState`, `newState`, and `failureReason`.
   - In `Activity`: `description` and `metadata`.
2. **Algorithm**:
   - String values are scanned for email regex (`/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`) and phone regex (`/(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g`).
   - Matched email tokens are replaced with `maskEmail(token)`.
   - Matched phone tokens are replaced with `maskPhone(token)`.
   - Keys named `phone`, `email`, `secondaryPhone`, etc., are directly masked.
   - Operational context (`action`, `resource`, `timestamp`, `userRole`, `status`, `ipAddress`) is preserved intact.

### 2.4 CSV Export Privacy
1. **Super Admin Tenant Lock**:
   - In `getExportContactsData`:
     ```ts
     if (user.role === USER_ROLES.SUPER_ADMIN) {
       if (!user.brokerageId) {
         return { csvContent: formatAsCSV([], columns), pdfHeaders, pdfRows: [] }
       }
     }
     ```
   - Query strictly enforces `{ brokerageId: user.brokerageId, isDeleted: false }`.
   - Contacts from other brokerages are never fetched from the database, guaranteeing 0 cross-brokerage rows in exported CSVs.

---

## 3. Caveats

1. **Super Admin Without Assigned Brokerage**:
   If a Super Admin account has `brokerageId: undefined` or `null`, by business rule R1 & R5:
   - All contacts across all brokerages are treated as cross-brokerage (read-only, masked).
   - Communication actions (calls, WhatsApp, email) are blocked (403 Forbidden).
   - CSV export returns an empty list (0 rows).
2. **Frontend Coordination**:
   `ContactResponseDto` additions (`brokerageId`, `brokerageName`, `isCrossBrokerage`) must be matched in `src/types/index.ts` so frontend components compile cleanly without TypeScript errors.
3. **Multi-word Search & Regex Performance**:
   Contact search uses indexed `$or` regexes; ensuring `brokerageId` is included in the compound index prevents any full collection scan.

---

## 4. Conclusion & Implementation Strategy

### 4.1 Architecture Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Incoming Request                                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                         [authenticate + tenantScope]
                                       │
                   ┌───────────────────┴───────────────────┐
                   │                                       │
             Non-Super Admin                          Super Admin
        (Scoped to own brokerage)              (Can query global / all)
                   │                                       │
        ┌──────────┴──────────┐                 ┌──────────┴──────────┐
        │  Query Contacts DB  │                 │  Query Contacts DB  │
        │  (Own Brokerage)    │                 │  (Global/Tenant)    │
        └──────────┬──────────┘                 └──────────┬──────────┘
                   │                                       │
                   ▼                                       ▼
       Resolve Brokerages (Cache)               Resolve Brokerages (Cache)
                   │                                       │
                   ▼                                       ▼
        formatContactDto()                      formatContactDto()
        isCrossBrokerage = false                isCrossBrokerage = contact.bId !== caller.bId
        Unmasked Phone/Email                    Mask Phone & Email if isCrossBrokerage
                   │                                       │
                   └───────────────────┬───────────────────┘
                                       │
                         Output over HTTP Wire
                     (Zero unmasked leak to Cross-SA)
```

### 4.2 Concrete Implementation Specifications

#### File 1: `server/src/utils/maskingHelper.ts` (New Module)
```ts
import mongoose from 'mongoose'
import { IUser } from '../models/User.js'
import { USER_ROLES } from './constants.js'

export const maskPhone = (phone?: string): string => {
  if (!phone || typeof phone !== 'string') return ''
  const trimmed = phone.trim()
  if (trimmed.length <= 5) return '***'

  // Preserve prefix (+92 3 or first 3-5 chars) and last 2 digits
  let prefixLen = 3
  if (trimmed.startsWith('+')) {
    const spaceIdx = trimmed.indexOf(' ')
    prefixLen = spaceIdx > 0 && spaceIdx <= 4 ? spaceIdx + 2 : 4
  }
  prefixLen = Math.min(prefixLen, trimmed.length - 2)
  const prefix = trimmed.slice(0, prefixLen)
  const suffix = trimmed.slice(-2)
  const maskLen = Math.max(trimmed.length - prefixLen - 2, 4)
  return `${prefix}${'*'.repeat(maskLen)}${suffix}`
}

export const maskEmail = (email?: string): string => {
  if (!email || typeof email !== 'string') return ''
  const trimmed = email.trim()
  const atIdx = trimmed.indexOf('@')
  if (atIdx <= 0) return '***@***.***'
  const localPart = trimmed.slice(0, atIdx)
  const domainPart = trimmed.slice(atIdx)
  const firstChar = localPart[0]
  const maskLen = Math.max(localPart.length - 1, 3)
  return `${firstChar}${'*'.repeat(maskLen)}${domainPart}`
}

export const isCrossBrokerage = (
  resourceBrokerageId: mongoose.Types.ObjectId | string | undefined,
  caller: IUser
): boolean => {
  if (caller.role !== USER_ROLES.SUPER_ADMIN) return false
  if (!caller.brokerageId) return true
  if (!resourceBrokerageId) return true
  return resourceBrokerageId.toString() !== caller.brokerageId.toString()
}

export const redactSensitiveText = (text: string): string => {
  if (!text || typeof text !== 'string') return text
  // Redact email addresses
  let redacted = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => maskEmail(match))
  // Redact phone numbers (+92 300 1234567, 03001234567, +1-555-123-4567)
  redacted = redacted.replace(/(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/g, (match) => {
    const digits = match.replace(/\D/g, '')
    if (digits.length >= 7) {
      return maskPhone(match)
    }
    return match
  })
  return redacted
}

export const redactDeep = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') return redactSensitiveText(obj)
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(redactDeep)
  }
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (/phone|secondaryPhone|mobile/i.test(k) && typeof v === 'string') {
      out[k] = maskPhone(v)
    } else if (/email|portalAccessEmail/i.test(k) && typeof v === 'string') {
      out[k] = maskEmail(v)
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactDeep(v)
    } else if (typeof v === 'string') {
      out[k] = redactSensitiveText(v)
    } else {
      out[k] = v
    }
  }
  return out
}
```

#### File 2: `server/src/features/contacts/contact.types.ts`
Add to `ContactResponseDto`:
```ts
export interface ContactResponseDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  leadSource: string
  leadScore: number
  tags: string[]
  status: ContactStatus
  assignedAgentId?: string
  assignedAgentName?: string
  brokerageId?: string
  brokerageName?: string
  isCrossBrokerage?: boolean
  notes?: string
  propertyInterests: string[]
  socialLinks?: ISocialLinks
  portalUserId?: string
  portalEnabled?: boolean
  portalAccessEmail?: string
  portalCredentials?: PortalCredentials
  createdAt: string
  updatedAt: string
  lastContactedAt?: string
}
```

#### File 3: `server/src/features/contacts/contact.service.ts`
1. Include `brokerageId` in `projection` (line 238):
   ```ts
   const projection = 'firstName lastName email phone secondaryPhone address city state zipCode leadSource leadScore tags status assignedAgentId brokerageId notes propertyInterests socialLinks portalUserId portalEnabled portalAccessEmail createdAt updatedAt lastContactedAt'
   ```
2. Implement batch `resolveBrokerageNames(brokerageIds: string[])`:
   ```ts
   export const resolveBrokerageNames = async (brokerageIds: string[]): Promise<Map<string, string>> => {
     const result = new Map<string, string>()
     const missingIds: mongoose.Types.ObjectId[] = []
     for (const id of brokerageIds) {
       const cached = brokerageNameCache.get(id)
       if (cached !== null) {
         if (cached) result.set(id, cached)
       } else if (mongoose.Types.ObjectId.isValid(id)) {
         missingIds.push(new mongoose.Types.ObjectId(id))
       }
     }
     if (missingIds.length > 0) {
       const brokerages = await Brokerage.find({ _id: { $in: missingIds } }, 'name').lean()
       const found = new Set<string>()
       for (const b of brokerages) {
         const idStr = b._id.toString()
         found.add(idStr)
         brokerageNameCache.set(idStr, b.name, 3600)
         result.set(idStr, b.name)
       }
       for (const m of missingIds) {
         const mStr = m.toString()
         if (!found.has(mStr)) brokerageNameCache.set(mStr, '', 3600)
       }
     }
     return result
   }
   ```
3. Update `formatContactDto`:
   ```ts
   export const formatContactDto = (
     contact: IContact | any,
     agentName?: string,
     credentials?: PortalCredentials,
     silent: boolean = true,
     brokerageName?: string,
     caller?: IUser
   ): ContactResponseDto => {
     ...
     const bId = contact.brokerageId?._id ? contact.brokerageId._id.toString() : contact.brokerageId?.toString()
     const cross = caller ? isCrossBrokerage(bId, caller) : false

     const rawPhone = contact.phone || ''
     const rawEmail = contact.email || ''
     const rawSecondaryPhone = contact.secondaryPhone
     const rawPortalEmail = contact.portalAccessEmail || contact.email || ''

     const dto: ContactResponseDto = {
       id: contact._id.toString(),
       firstName: contact.firstName,
       lastName: contact.lastName,
       email: cross ? maskEmail(rawEmail) : rawEmail,
       phone: cross ? maskPhone(rawPhone) : rawPhone,
       secondaryPhone: cross && rawSecondaryPhone ? maskPhone(rawSecondaryPhone) : rawSecondaryPhone,
       address: contact.address,
       city: contact.city,
       state: contact.state,
       zipCode: contact.zipCode,
       leadSource: contact.leadSource,
       leadScore: contact.leadScore,
       tags: contact.tags || [],
       status: contact.status,
       assignedAgentId: agentId,
       assignedAgentName: agentName,
       brokerageId: bId,
       brokerageName: brokerageName,
       isCrossBrokerage: cross,
       notes: cross ? undefined : contact.notes,
       propertyInterests: contact.propertyInterests || [],
       socialLinks: contact.socialLinks,
       portalUserId: contact.portalUserId?.toString(),
       portalEnabled: contact.portalEnabled ?? false,
       portalAccessEmail: cross ? maskEmail(rawPortalEmail) : rawPortalEmail,
       portalCredentials: cross ? undefined : credentials,
       createdAt: createdIso,
       updatedAt: updatedIso,
       lastContactedAt: lastIso,
     }
     return dto
   }
   ```
4. Update Mutation Guards:
   - In `updateContact`:
     ```ts
     if (isCrossBrokerage(existing.brokerageId, caller)) {
       throw new AppError('Cross-brokerage contacts are strictly read-only for Super Admin', HTTP_STATUS.FORBIDDEN)
     }
     ```
   - In `deleteContact`:
     ```ts
     if (caller.role === USER_ROLES.SUPER_ADMIN) {
       if (!caller.brokerageId) {
         throw new AppError('Super Admin with no assigned brokerage cannot delete contacts', HTTP_STATUS.FORBIDDEN)
       }
       filter.brokerageId = caller.brokerageId
     }
     ```
   - In `addContactNote`:
     ```ts
     if (isCrossBrokerage(contact.brokerageId, caller)) {
       throw new AppError('Cross-brokerage contacts are strictly read-only for Super Admin', HTTP_STATUS.FORBIDDEN)
     }
     ```
   - In `bulkUpdateContacts`:
     ```ts
     if (caller.role === USER_ROLES.SUPER_ADMIN) {
       if (!caller.brokerageId) {
         throw new AppError('Super Admin with no assigned brokerage cannot perform bulk actions', HTTP_STATUS.FORBIDDEN)
       }
       filter.brokerageId = caller.brokerageId
     }
     ```

#### File 4: `server/src/features/audit/audit.service.ts`
In `formatAuditLogDto`, when caller is Super Admin and log is cross-brokerage:
```ts
export const formatAuditLogDto = (log: any, caller?: IUser): AuditLogResponseDto => {
  ...
  const bId = log.brokerageId?._id ? log.brokerageId._id.toString() : log.brokerageId?.toString()
  const cross = caller ? isCrossBrokerage(bId, caller) : false

  return {
    id: log._id ? log._id.toString() : log.id?.toString() || '',
    userId: log.userId?.toString(),
    userEmail: cross && log.userEmail ? maskEmail(log.userEmail) : log.userEmail,
    userRole: log.userRole,
    brokerageId: bId,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId,
    details: cross && log.details ? redactDeep(log.details) : log.details,
    previousState: cross && log.previousState ? redactDeep(log.previousState) : log.previousState,
    newState: cross && log.newState ? redactDeep(log.newState) : log.newState,
    ipAddress: log.ipAddress || '127.0.0.1',
    userAgent: log.userAgent || 'system',
    status: log.status || 'success',
    failureReason: cross && log.failureReason ? redactSensitiveText(log.failureReason) : log.failureReason,
    createdAt: createdAtIso,
  }
}
```

#### File 5: `server/src/features/export/export.service.ts`
Enforce Super Admin own-brokerage boundary:
```ts
export const getExportContactsData = async (user: IUser) => {
  // If user has no brokerageId (e.g. unassigned Super Admin), export is disabled / returns empty list (Rule R5)
  if (!user.brokerageId) {
    const columns = [
      { header: 'ID', key: '_id' },
      { header: 'First Name', key: 'firstName' },
      { header: 'Last Name', key: 'lastName' },
      { header: 'Email', key: 'email' },
      { header: 'Phone', key: 'phone' },
      { header: 'Status', key: 'status' },
      { header: 'Lead Source', key: 'leadSource' },
      { header: 'City', key: 'city' },
      { header: 'Created Date', key: 'createdAt' },
    ]
    return {
      csvContent: formatAsCSV([], columns),
      pdfHeaders: ['Name', 'Email', 'Phone', 'Status', 'Lead Source', 'City'],
      pdfRows: [],
    }
  }

  const filter: Record<string, any> = {
    brokerageId: user.brokerageId,
    isDeleted: false,
  }
  if (user.role === USER_ROLES.AGENT) {
    filter.assignedAgentId = user._id
  }

  const contacts = await Contact.find(filter)
    .sort({ createdAt: -1 })
    .lean()

  ...
```

---

## 5. Verification Method

### 5.1 Independent Code & Rule Verification
1. **TypeScript Type Safety Check**:
   Run in backend:
   ```powershell
   npm --prefix server run build
   ```
   Or `npx tsc --noEmit` inside `server/`.
2. **Lean Mutation Invariance (Rule DI-002)**:
   Inspect `contact.service.ts`, `audit.service.ts`, `export.service.ts` to verify no `.save()` is invoked on any object returned by `.lean()`.
3. **Redis Fallback Invariance (Rule DI-003)**:
   Verify all `cacheGet`, `cacheSet`, `cacheDelete` calls remain wrapped with `try/catch` or `.catch(() => {})`.
4. **Covered Query & Performance (Rule PERF-M-001)**:
   Verify the query filter `{ brokerageId: user.brokerageId, isDeleted: false }` matches compound index `{ brokerageId: 1, isDeleted: 1, createdAt: -1 }`.

### 5.2 Test Scenarios & Invalidation Conditions
1. **Masking Wire-Level Verification**:
   - As Super Admin assigned to Brokerage A, perform `GET /api/contacts`.
   - Inspect the raw JSON response payload:
     - Contacts with `brokerageId === Brokerage A` have unmasked phone and email.
     - Contacts with `brokerageId === Brokerage B` have masked phone (`+92 3******10`) and masked email (`j***@domain.com`).
     - Raw unmasked string must not appear anywhere in the HTTP response body.
2. **Read-Only Mutation Verification**:
   - As Super Admin assigned to Brokerage A, perform `PATCH /api/contacts/:id` for a contact belonging to Brokerage B.
   - Expect HTTP 403 Forbidden with error message `"Cross-brokerage contacts are strictly read-only for Super Admin"`.
   - Perform `DELETE /api/contacts/:id` for a contact belonging to Brokerage B.
   - Expect HTTP 403 Forbidden or 404 Not Found.
3. **Audit Log Masking Verification**:
   - As Super Admin, perform `GET /api/audit-logs/:id` for an audit record of a Brokerage B contact.
   - Verify phone and email inside `details`, `previousState`, and `newState` are replaced with masked versions.
4. **CSV Export Boundary Verification**:
   - As Super Admin assigned to Brokerage A, perform `GET /api/export/contacts?format=csv`.
   - Verify generated CSV contains only contacts where `brokerageId === Brokerage A`.
   - If Super Admin has no `brokerageId`, verify CSV header is returned with 0 data rows.
