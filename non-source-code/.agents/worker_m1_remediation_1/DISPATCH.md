## 2026-09-17T16:39:03Z
You are Worker M1 Remediation.
Your working directory is: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\worker_m1_remediation_1
Project root: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm
Original Request file: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\PROJECT.md
Remediation Blueprint: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\explorer_m1_remediation_1\handoff.md
Forensic Auditor Report: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\auditor_m1_1\handoff.md

Task: Apply Milestone 1 Remediation fixes per the exact drop-in specifications in explorer_m1_remediation_1/handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusive File Ownership:
1. `server/src/models/Contact.ts`:
   Add global compound indexes for cross-brokerage lookups to satisfy Rule PERF-M-001:
   - `contactSchema.index({ email: 1, isDeleted: 1, brokerageId: 1 })`
   - `contactSchema.index({ phone: 1, isDeleted: 1, brokerageId: 1 })`

2. `server/src/features/communication/commGuard.ts`:
   Replace with the hardened implementation from Section 4.2 of the Remediation Blueprint:
   - Fail-closed checks: `(!doc.brokerageId || doc.brokerageId.toString() !== callerBrokerageStr)`
   - Extract clean RFC 2822 email
   - Fast covered query on caller's own brokerage first
   - Cross-brokerage check covers both active and soft-deleted contacts
   - Uses covered index projection `.select('brokerageId').lean()` (Rule PERF-M-001)

3. `server/src/features/communication/comm.controller.ts`:
   Apply changes from Section 4.3 of the Remediation Blueprint:
   - In `sendUnifiedHandler`: Invoke `assertSuperAdminCanContact` BEFORE `if (!brokerageId) sendError(...)` so unassigned Super Admin receives HTTP 403 Forbidden ("Access denied: Super Admin has no assigned brokerage..."), NOT 400 Bad Request.
   - Validate and wrap `conversationId` with `mongoose.Types.ObjectId.isValid` and `new mongoose.Types.ObjectId(...)` (Rule DI-001).
   - In `getQuickTemplatesHandler`: Snapshot keys with `Array.from(customTemplatesCache.keys())` before looping to fix the infinite loop and out-of-memory heap crash (Rule ML-002).

4. `server/src/features/communication/whatsapp.controller.ts`:
   Apply changes from Section 4.4 of the Remediation Blueprint:
   - In `sendMessage` and `createBroadcast` catch blocks: replace `HTTP_STATUS.BAD_REQUEST` with `err.statusCode || HTTP_STATUS.BAD_REQUEST` so HTTP 403 Forbidden thrown by domain security guards is preserved.

5. `server/src/features/communication/whatsapp.service.ts`:
   - In `sendWhatsAppMessage` (line 224): throw `AppError` with `HTTP_STATUS.FORBIDDEN` (403) instead of generic `Error`.

6. `server/src/features/contacts/contact.service.ts`:
   Apply changes from Section 4.6 of the Remediation Blueprint:
   - In `createContact`: block unassigned Super Admin with HTTP 403 Forbidden.
   - In `updateContact`: delete `brokerageId`, `_id`, and `id` from updatePayload before `$set` to prevent tenant hijacking.
   - In `deleteContact`: cast `id` to `new mongoose.Types.ObjectId(id)` (Rule DI-001).

7. `server/tests/unit/communicationPrivacy.test.ts`:
   Add test for `getQuickTemplatesHandler` cache snapshot and update tests to verify 403 on unassigned Super Admin and WhatsApp errors.

Verification:
- Run TypeScript check (`node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit` or `npm --prefix server run build`)
- Run unit test suite (`npx tsx --test server/tests/unit/communicationPrivacy.test.ts`)
- Run E2E test suite (`npx tsx --test server/tests/e2e/multiTenantBoundary.e2e.test.ts`) to verify Milestone 1 tests pass.
- Write handoff report to `c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\worker_m1_remediation_1\handoff.md` and notify parent.
