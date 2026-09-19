# Milestone 1 Adversarial Challenge Report: Mutation Guards & Memory Leaks

**Agent**: Challenger 2 (Empirical Challenger / Critic / Specialist)  
**Date**: 2026-09-17T16:33:00Z  
**Milestone**: Milestone 1 — Backend Communication & Mutation Multi-Tenant Security Guards  
**Working Directory**: `.agents/challenger_m1_2`  
**Project Root**: `c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm`  

---

## 1. Observation

Direct observations from codebase inspection, specification analysis, and AST trace:

### 1.1 Critical Infinite Loop & Unbounded Heap Growth in `server/src/features/communication/comm.controller.ts`
- **Location**: `server/src/features/communication/comm.controller.ts:81-92`
```ts
81: export const getQuickTemplatesHandler = (req: Request, res: Response): void => {
82:   const channel = req.query.channel as string
83:   const baseTemplates = commService.getQuickTemplates(channel)
84:   const customTemplates: QuickTemplateDto[] = []
85:   for (const key of customTemplatesCache.keys()) {
86:     const item = customTemplatesCache.get(key)
87:     if (item && (!channel || channel === 'all' || item.channel === 'all' || item.channel === channel)) {
88:       customTemplates.push(item)
89:     }
90:   }
91:   sendSuccess(res, [...baseTemplates, ...customTemplates], 'Quick reply templates retrieved successfully')
92: }
```
- **Definition of `BoundedLruCache.get` in `server/src/utils/lruCache.ts:21-34`**:
```ts
21:   get(key: string): T | null {
22:     const item = this.cache.get(key)
23:     if (!item) return null
24: 
25:     if (Date.now() > item.expiry) {
26:       this.cache.delete(key)
27:       return null
28:     }
29: 
30:     // Refresh LRU order (delete & re-insert moves to end of Map iteration)
31:     this.cache.delete(key)
32:     this.cache.set(key, item)
33:     return item.value
34:   }
```
- **ECMAScript Specification Observation**: `customTemplatesCache.keys()` returns `this.cache.keys()` (a native `MapIterator`). In JavaScript (ECMA-262 §24.1.5.2.1), calling `.delete(key)` and `.set(key, item)` inside a loop iterating over that Map causes the re-inserted key to be placed at the end of the Map. The active iterator visits the re-inserted key again. When `customTemplatesCache` contains any custom templates, `for (const key of customTemplatesCache.keys())` creates an **INFINITE LOOP**. Inside this loop, `customTemplates.push(item)` executes continuously, causing 100% CPU lockup and unbounded memory growth until the process crashes with `JavaScript heap out of memory`.

### 1.2 Contact Mutation Guards in `server/src/features/contacts/contact.service.ts`
- **Location**: `server/src/features/contacts/contact.service.ts:667-690`
```ts
667: export const verifyContactMutationAccess = (
668:   contact: { brokerageId?: any; assignedAgentId?: any },
669:   caller: IUser
670: ): void => {
671:   if (caller.role === USER_ROLES.SUPER_ADMIN) {
672:     if (
673:       !caller.brokerageId ||
674:       !contact.brokerageId ||
675:       contact.brokerageId.toString() !== caller.brokerageId.toString()
676:     ) {
677:       throw new AppError(
678:         'Cross-brokerage contacts are strictly read-only for Super Admin.',
679:         HTTP_STATUS.FORBIDDEN
680:       )
681:     }
682:     return
683:   }
684:   if (contact.brokerageId && (!caller.brokerageId || contact.brokerageId.toString() !== caller.brokerageId.toString())) {
685:     throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
686:   }
687:   if (caller.role === USER_ROLES.AGENT && contact.assignedAgentId?.toString() !== caller._id.toString()) {
688:     throw new AppError(GENERIC_AUTH_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN)
689:   }
690: }
```
- **Mutations Checked**:
  1. `updateContact` (`contact.service.ts:833-835`):
     ```ts
     const existing = await Contact.findOne({ _id: objectId, isDeleted: false }).lean()
     if (!existing) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
     verifyContactMutationAccess(existing, caller)
     ```
     Payload validation (`contact.validators.ts:35-56`) uses `.strict()` and does NOT allow `brokerageId`, preventing tenant-tampering via payload.
  2. `deleteContact` (`contact.service.ts:939-945`):
     ```ts
     const target = await Contact.findOne({ _id: id, isDeleted: false })
       .select('brokerageId assignedAgentId')
       .lean()
     if (!target) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
     verifyContactMutationAccess(target, caller)
     ```
  3. `addContactNote` (`contact.service.ts:1021-1023`):
     ```ts
     const contact = await Contact.findOne({ _id: objId, isDeleted: false })
     if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
     verifyContactMutationAccess(contact, caller)
     ```
  4. `getOrGeneratePortalInvite` (`contact.service.ts:634-642`):
     ```ts
     const contact = await Contact.findOne({ _id: objContactId, isDeleted: false }).lean()
     if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
     verifyContactMutationAccess(contact, caller)
     ```
  5. `bulkUpdateContacts` (`contact.service.ts:1196-1212`):
     ```ts
     if (caller.role === USER_ROLES.SUPER_ADMIN) {
       if (!caller.brokerageId) {
         throw new AppError(
           'Cross-brokerage contacts are strictly read-only for Super Admin.',
           HTTP_STATUS.FORBIDDEN
         )
       }
       const crossContact = await Contact.findOne({
         _id: { $in: objectIds },
         brokerageId: { $ne: caller.brokerageId },
       }).select('brokerageId').lean()
       if (crossContact) {
         throw new AppError(
           'Cross-brokerage contacts are strictly read-only for Super Admin.',
           HTTP_STATUS.FORBIDDEN
         )
       }
     }
     ```

### 1.3 Unindexed Cross-Brokerage Lookups in `server/src/features/communication/commGuard.ts` (Rule PERF-M-001)
- **Location**: `server/src/features/communication/commGuard.ts:77-102`
```ts
78: matchedContact = await Contact.findOne({
79:   email: rawTarget.toLowerCase(),
80:   isDeleted: false,
81: }).select('brokerageId').lean()
...
88: matchedContact = await Contact.findOne({
89:   phone: { $regex: searchDigits },
90:   isDeleted: false,
91: }).select('brokerageId').lean()
```
- **Index Inventory in `server/src/models/Contact.ts:239-252`**:
  All email and phone indexes are compound indexes prefixed with `brokerageId`:
  `{ brokerageId: 1, email: 1, isDeleted: 1 }` and `{ brokerageId: 1, phone: 1, isDeleted: 1 }`.
  There is NO index on `{ email: 1 }` or `{ phone: 1 }` as the leading key.
  Consequently, queries without `brokerageId` cannot use the compound index, triggering full collection scans or expensive fetch scans over all non-deleted records, violating Rule PERF-M-001.

### 1.4 Unhandled Unassigned Super Admin in `createContact`
- **Location**: `server/src/features/contacts/contact.service.ts:580-604`
```ts
580: const brokerageId = caller.brokerageId
...
604: invalidateTenantFeatureCache(brokerageId.toString(), 'contacts')
```
If an unassigned Super Admin calls `POST /api/contacts`, `caller.brokerageId` is undefined. The asynchronous background task throws an unhandled `TypeError: Cannot read properties of undefined (reading 'toString')`, and Mongoose schema validation fails with 500 error instead of a clean 403 or 400 rejection.

---

## 2. Logic Chain

1. **Rule ML-002 Violation & Severe Denial of Service**:
   - The worker replaced the module-level array in `comm.controller.ts` with `customTemplatesCache = new BoundedLruCache<QuickTemplateDto>(200, 3600)`.
   - While the cache itself evicts after 200 items, `getQuickTemplatesHandler` loops directly over `customTemplatesCache.keys()` while calling `customTemplatesCache.get(key)` inside the body.
   - Calling `get()` moves the entry to the end of the Map. Under ECMAScript specifications, iterating an active Map iterator whose entries are modified and re-appended produces an infinite loop.
   - The loop appends items to `customTemplates` forever, rapidly consuming heap memory until OOM crash and freezing the server's event loop at 100% CPU.
   - The worker's unit test suite only tested `customTemplatesCache instanceof BoundedLruCache` and never called `getQuickTemplatesHandler`, so this critical bug was missed.

2. **Evaluation of Super Admin Mutation Access**:
   - **Scenario 1: Super Admin without assigned brokerage (`caller.brokerageId == null/undefined`)**:
     - `updateContact`: Evaluates `!caller.brokerageId` in `verifyContactMutationAccess`. Throws HTTP 403 Forbidden.
     - `deleteContact`: Evaluates `!caller.brokerageId` in `verifyContactMutationAccess`. Throws HTTP 403 Forbidden.
     - `addContactNote`: Evaluates `!caller.brokerageId` in `verifyContactMutationAccess`. Throws HTTP 403 Forbidden.
     - `getOrGeneratePortalInvite`: Evaluates `!caller.brokerageId` in `verifyContactMutationAccess`. Throws HTTP 403 Forbidden.
     - `bulkUpdateContacts`: Evaluates `!caller.brokerageId` on line 1197. Throws HTTP 403 Forbidden.
     - **Finding**: Verified. Super Admin without assigned brokerage CANNOT mutate any contact.
   - **Scenario 2: Super Admin assigned to Brokerage A mutating contact in Brokerage B**:
     - `updateContact`: `contact.brokerageId.toString() !== caller.brokerageId.toString()` ('B' !== 'A'). Throws HTTP 403 Forbidden.
     - `deleteContact`: `contact.brokerageId.toString() !== caller.brokerageId.toString()`. Throws HTTP 403 Forbidden.
     - `addContactNote`: `contact.brokerageId.toString() !== caller.brokerageId.toString()`. Throws HTTP 403 Forbidden.
     - `getOrGeneratePortalInvite`: `contact.brokerageId.toString() !== caller.brokerageId.toString()`. Throws HTTP 403 Forbidden.
     - `bulkUpdateContacts`: Evaluates `Contact.findOne({ _id: { $in: objectIds }, brokerageId: { $ne: caller.brokerageId } })`. Finds the Brokerage B contact and throws HTTP 403 Forbidden.
     - **Finding**: Verified. Super Admin in Brokerage A CANNOT mutate any contact in Brokerage B.

3. **Rule PERF-M-001 Violation**:
   - `commGuard.ts` performs un-scoped lookups by email and unanchored regex phone across all brokerages. Because `Contact` schema indexes are prefixed with `brokerageId`, these queries trigger full collection scans or unbounded fetches across all documents.

---

## 3. Caveats

- Terminal execution commands timed out due to PowerShell interactive user approval prompts in this execution environment; therefore, findings were derived from comprehensive static analysis, AST path tracing, ECMAScript standard specification evaluation, and schema index cross-referencing.
- No caveats regarding the identified infinite loop: it is mathematically and specificationally guaranteed by ECMAScript Map iterator semantics.

---

## 4. Conclusion

Milestone 1 successfully implements strict mutation guards across `updateContact`, `deleteContact`, `addContactNote`, `getOrGeneratePortalInvite`, and `bulkUpdateContacts`, ensuring that Super Admins without an assigned brokerage and Super Admins crossing brokerage boundaries are strictly blocked with HTTP 403 Forbidden.

However, Milestone 1 **CANNOT BE APPROVED** in its current state due to two issues that must be addressed:
1. **CRITICAL BLOCKER**: `comm.controller.ts:85` contains an infinite loop and unbounded memory leak in `getQuickTemplatesHandler` caused by mutating Map keys during `MapIterator` traversal. Any request to `GET /api/communication/quick-templates` when custom templates exist will lock the server event loop at 100% CPU and crash with OOM.
2. **HIGH PERFORMANCE BLOCKER**: `commGuard.ts:78-94` queries `Contact` by `email` and unanchored `phone` regex without an index leading prefix, violating Rule PERF-M-001.

---

## 5. Verification Method

### 5.1 Independent Reproduction of Infinite Loop Bug
Run this standalone Node.js snippet to verify ECMAScript MapIterator re-traversal:
```js
const map = new Map();
map.set('t1', { id: 't1' });
// Simulates BoundedLruCache.get() behavior during iteration:
for (const key of map.keys()) {
  const item = map.get(key);
  map.delete(key);
  map.set(key, item);
  console.log('Visited key:', key); // Loops infinitely!
}
```

### 5.2 Remediations Required
1. In `server/src/features/communication/comm.controller.ts:85`, snapshot keys before iteration:
   ```ts
   for (const key of Array.from(customTemplatesCache.keys())) {
     const item = customTemplatesCache.get(key)
     ...
   }
   ```
2. In `server/src/models/Contact.ts`, add index for cross-brokerage lookups:
   ```ts
   contactSchema.index({ email: 1, isDeleted: 1 })
   contactSchema.index({ phone: 1, isDeleted: 1 })
   ```
3. In `server/src/features/contacts/contact.service.ts:580`, add guard for unassigned Super Admin in `createContact`:
   ```ts
   if (caller.role === USER_ROLES.SUPER_ADMIN && !caller.brokerageId) {
     throw new AppError('Super Admin without assigned brokerage cannot create contacts.', HTTP_STATUS.FORBIDDEN)
   }
   ```
4. In `server/tests/unit/communicationPrivacy.test.ts`, add test executing `getQuickTemplatesHandler` with custom templates populated in `customTemplatesCache` to prevent regression.

---

VERDICT: REQUEST_CHANGES
