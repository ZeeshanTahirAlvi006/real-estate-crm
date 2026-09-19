# DISPATCH — Worker M2

## 2026-09-17T16:50:24Z

You are Worker M2.
Your working directory is: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\worker_m2
Project root: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm
Original Request file: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\PROJECT.md
Survey 2 findings & blueprints: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\explorer_survey_2\handoff.md

Task: Implement Milestone 2 — Backend Contact Attribution, Wire-Level Masking Engine, Audit Logs & CSV Export.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Exclusive File Ownership:
1. `server/src/utils/maskingHelper.ts` (CREATE):
   Implement and export:
   - `maskPhone(phone?: string): string`: preserves first 3 chars (e.g. `+92 3` or `+1 `) and last 2 digits, replacing middle characters with asterisks (minimum 4 asterisks).
   - `maskEmail(email?: string): string`: preserves first char of local part, masks rest of local part with asterisks (minimum 3), preserves full domain (e.g., `j***@domain.com`).
   - `isCrossBrokerage(resourceBrokerageId: mongoose.Types.ObjectId | string | undefined, caller: IUser): boolean`:
     - If caller.role !== USER_ROLES.SUPER_ADMIN, returns false.
     - If !caller.brokerageId, returns true (all contacts are cross-brokerage).
     - If !resourceBrokerageId, returns true.
     - Returns resourceBrokerageId.toString() !== caller.brokerageId.toString().
   - `redactSensitiveText(text: string): string`: replaces emails and phone numbers with masked versions.
   - `redactDeep(obj: any): any`: recursively masks sensitive keys (phone, mobile, email, secondaryPhone) and redacts strings in arbitrary objects/arrays while preserving operational context.

2. `server/src/features/contacts/contact.types.ts` (MODIFY):
   Extend `ContactResponseDto` with:
   - `brokerageId?: string`
   - `brokerageName?: string`
   - `isCrossBrokerage?: boolean`

3. `server/src/features/contacts/contact.service.ts` (MODIFY):
   - Add `brokerageId` to `listContacts` projection string (line 238) so lean documents have `brokerageId`.
   - Implement `resolveBrokerageNames(brokerageIds: string[]): Promise<Map<string, string>>` using the existing `brokerageNameCache` (`BoundedLruCache<string>(100, 3600)`) and a single indexed batch query `Brokerage.find({ _id: { $in: missingIds } }, 'name').lean()` to eliminate N+1 queries (Rule PERF-M-001).
   - In `getContacts`: resolve brokerage names in batch and pass `brokerageName` and `caller` to `formatContactDto`.
   - In `getContactById`: resolve brokerage name and pass to `formatContactDto`.
   - In `formatContactDto`:
     - Calculate `isCross = caller ? isCrossBrokerage(bId, caller) : false`.
     - Wire-level masking: if `isCross` is true, mask `phone`, `secondaryPhone`, `email`, and `portalAccessEmail` before serialization. Raw unmasked values must NEVER be sent over the wire.
     - Attach `brokerageId`, `brokerageName`, `isCrossBrokerage`.
     - In `getContactActivities`: apply `redactSensitiveText` and `redactDeep` to descriptions and metadata if contact is cross-brokerage.

4. `server/src/features/audit/audit.service.ts` (MODIFY):
   - In `formatAuditLogDto`: when caller is Super Admin and log belongs to a different brokerage (`isCrossBrokerage(bId, caller)`):
     - Deeply redact `details`, `previousState`, `newState`, and mask `userEmail` and `failureReason` while preserving operational metadata (`action`, `resource`, `timestamp`, `userRole`, `status`).

5. `server/src/features/export/export.service.ts` (MODIFY):
   - In `getExportContactsData`:
     - If user is Super Admin without assigned brokerage (`!user.brokerageId`), return empty list (0 contact rows).
     - Query strictly filters by `{ brokerageId: user.brokerageId, isDeleted: false }`. Super Admin cannot export cross-brokerage contacts.

6. `server/tests/unit/maskingAndAttribution.test.ts` (CREATE):
   Comprehensive unit tests for:
   - Phone and email masking algorithms (international formats, short strings, standard emails)
   - `isCrossBrokerage` matrix (Super Admin with/without brokerage, standard users)
   - Deep redaction of audit log and activity payloads
   - Contact DTO wire-level masking (raw PII zero-leakage)
   - CSV export scoping to own brokerage only

Verification:
- Run TypeScript check (`node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit` or `npm --prefix server run build`)
- Run unit test suite (`npx tsx --test server/tests/unit/maskingAndAttribution.test.ts`)
- Run E2E test suite (`npx tsx --test server/tests/e2e/multiTenantBoundary.e2e.test.ts`)
- Write handoff report to `c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\worker_m2\handoff.md` and notify parent.
