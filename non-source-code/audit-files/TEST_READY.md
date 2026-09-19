# TEST_READY: Super Admin Multi-Tenant Boundary Restrictions & Contact Masking E2E Suite

**Document Version**: 1.0.0  
**Test Suite File**: `server/tests/e2e/multiTenantBoundary.e2e.test.ts`  
**Target Subsystem**: PropPulse OS Multi-Tenant Isolation, Outbound Gateway, Wire-Level Masking Engine, Mutation Guards, Audit Redaction, and CSV Confinement  
**Specification Sources**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`  
**Test Design Methodology**: Category-Partition + Boundary Value Analysis + Cross-Feature Combinations + Real-World End-to-End Workflows (Tiers 1–4)

---

## 1. Test Runner Invocation Commands

The test suite is written using the Node.js built-in test runner (`node:test`, `node:assert/strict`) with `tsx` and `supertest`, co-located inside the server test infrastructure.

### Primary Command (from project root):
```bash
npm --prefix server run test -- tests/e2e/multiTenantBoundary.e2e.test.ts
```

### Direct Server Directory Invocation:
```bash
cd server
npx tsx --test tests/e2e/multiTenantBoundary.e2e.test.ts
```

### Full Project Test Suite Invocation:
```bash
cd server
npm test
```

---

## 2. Test Suite Architecture & Design

- **Opaque-Box Testing**: Evaluates Express HTTP endpoints (`/api/communication/*`, `/api/contacts/*`, `/api/audit-logs/*`, `/api/export/*`, `/api/inbox/*`) via `supertest` hitting `createApp()`. No internal implementation state is mocked or bypassed.
- **Progressive Testability & Tenant Isolation**: Uses isolated database fixtures representing multiple tenant brokerages:
  - **Brokerage Alpha** (`65a111111111111111111111`): "Apex Alpha Realty" (Home brokerage for Super Admin Alpha).
  - **Brokerage Beta** (`65b222222222222222222222`): "Beacon Beta Properties" (Foreign brokerage).
  - **Brokerage Gamma** (`65c333333333333333333333`): "Crestview Gamma Realty" (Third-party tenant).
- **Persona Role Matrix**:
  - `Super Admin Alpha`: Assigned to Brokerage Alpha (`role: super_admin`, `brokerageId: Brokerage Alpha`).
  - `Super Admin Unassigned`: System administrator without assigned brokerage (`role: super_admin`, `brokerageId: null`).
  - `Agent Alpha`: Standard agent in Brokerage Alpha (`role: agent`, `brokerageId: Brokerage Alpha`).
  - `Owner Beta`: Brokerage Owner of Brokerage Beta (`role: brokerage_owner`, `brokerageId: Brokerage Beta`).
- **Wire-Level Forensic Inspection**: Explicitly validates that raw sensitive contact data (phone numbers like `+92 301 9876543`, emails like `bruce.beta@waynecorp.org`, secondary phones, portal emails) NEVER appear in serialized response payloads (`res.body` or `res.text`) for cross-brokerage requests.

---

## 3. Test Coverage Matrix & Inventory (Total: 93 Tests)

| Tier | Feature / Category | Scope | Test Count | Target Invariants Enforced |
|:----:|:-------------------|:------|:----------:|:---------------------------|
| **Tier 1** | **F1: Outbound Unified Communication** | `/api/communication/send` | 5 | Same-brokerage allowed; cross-brokerage by `contactId`, `to` phone, and `to` email strictly rejected with `HTTP 403 Forbidden`. |
| **Tier 1** | **F2: WhatsApp & Broadcasts** | `/api/communication/whatsapp/*` | 5 | Same-brokerage WhatsApp allowed; foreign `contactId`, `toPhone`, and inbox conversation start rejected with `HTTP 403`. |
| **Tier 1** | **F3: Unassigned Super Admin Lockout** | Communication Lockout | 5 | Super Admin with `brokerageId: null` is completely locked out from sending unified messages, WhatsApp, broadcasts, or templates (all `HTTP 403`). |
| **Tier 1** | **F4: Brokerage Attribution** | `ContactResponseDto` | 5 | `brokerageId`, `brokerageName`, and `isCrossBrokerage` present on all contact records; accurate attribution to true owning brokerage. |
| **Tier 1** | **F5: Wire-Level Data Masking** | Contact Privacy Masking | 5 | Foreign phones masked (`+92 3******67`), foreign emails masked (`j***@domain.com`); raw PII zero-leakage verified on network wire. |
| **Tier 1** | **F6: Cross-Brokerage Mutations** | Read-Only Enforcement | 5 | `PATCH`, `DELETE`, `POST /notes`, and `portal-invite` on foreign contacts strictly rejected with `HTTP 403 Forbidden`. |
| **Tier 1** | **F7: Audit Logs & Activity Redaction** | Audit / Activity Streams | 5 | Deep redaction of phone numbers and emails in audit log descriptions and snapshots (`details`, `previousState`, `newState`); operational context intact. |
| **Tier 1** | **F8: CSV Export Confinement** | `/api/export/contacts` | 5 | Export strictly confined to own brokerage; foreign contacts 100% excluded; unassigned Super Admin receives 0 data rows. |
| **Tier 2** | **F1 Boundaries: Outbound Send** | Edge & Corner Cases | 5 | Missing fields (400/422), malformed IDs (400/403), punctuation/spacing in phone numbers (403), soft-deleted foreign contacts (403), empty message body (400/422). |
| **Tier 2** | **F2 Boundaries: WhatsApp & Broadcast** | Edge & Corner Cases | 5 | Missing recipient (400/422), international phone format `+44...` (403), short numbers (403), empty brokerage broadcasts, whitespace contact IDs (400/404). |
| **Tier 2** | **F3 Boundaries: Lockout** | Edge & Corner Cases | 5 | Empty string brokerageId `""` lockout, ghost/non-existent brokerageId lockout, opt-out/opt-in cross-brokerage manipulation block, dynamic token revocation lockout. |
| **Tier 2** | **F4 Boundaries: Attribution** | Edge & Corner Cases | 5 | Missing brokerageId resilience, inactive brokerage resolution, multi-word search (`q=Sarah Connor`) attribution, pagination boundary, 404 for non-existent ID. |
| **Tier 2** | **F5 Boundaries: Wire Masking** | Edge & Corner Cases | 5 | Short 5-digit phone masking, 13-digit international masking, short email username masking, null/empty secondary phone handling, complex subdomain (`.co.uk`) masking. |
| **Tier 2** | **F6 Boundaries: Mutation Guards** | Edge & Corner Cases | 5 | Empty body PATCH (403), tenant hijacking attempt reassigning brokerageId (403), delete on already deleted contact (403), max length note payload (403), non-ObjectId param (400/404). |
| **Tier 2** | **F7 Boundaries: Redaction** | Edge & Corner Cases | 5 | Empty snapshot resilience, deeply nested level-4 JSON PII redaction, 0 activity history contact handling, multi-PII text string redaction, paginated audit redaction. |
| **Tier 2** | **F8 Boundaries: CSV Export** | Edge & Corner Cases | 5 | 0 contact brokerage export (headers only), RFC-4180 special character escaping, unassigned PDF export zero rows, soft-deleted exclusion, high-volume tenant isolation. |
| **Tier 3** | **Cross-Feature Combinations** | Multi-Feature Integration | 8 | Discovery -> Masking -> Communication Attempt (F4+F5+F1); WhatsApp -> Audit Redaction (F2+F7); Mutation Attempt -> Data Integrity (F6+F5); Multi-Brokerage -> CSV Confinement (F4+F8); Unassigned Full Lockout (F3+F1+F2+F8); Activity Stream Redaction (F7+F5); Dual-Target Operation (F6+F1); Full Pipeline Integrity (F4+F5+F6+F1+F8). |
| **Tier 4** | **Real-World Scenarios** | Application Workflows | 5 | Scenario 1: Multi-Brokerage Lead Intake & Super Admin Review; Scenario 2: Unified Omnichannel Campaign with Mixed Contacts; Scenario 3: Cross-Brokerage Regulatory Audit Compliance; Scenario 4: Super Admin Brokerage Reassignment & Scope Shift; Scenario 5: Enterprise CSV Export Audit & Regulatory Filing. |
| **Total** | **All Tiers (1–4)** | **Complete Suite** | **93** | **100% Comprehensive Coverage of Acceptance Criteria in ORIGINAL_REQUEST.md** |

---

## 4. Key Pass/Fail Semantics Enforced

1. **Outbound Communication Gateway**:
   - `POST /api/communication/send` to cross-brokerage lead -> `HTTP 403 Forbidden`.
   - `POST /api/communication/whatsapp/send` to cross-brokerage lead -> `HTTP 403 Forbidden`.
   - `POST /api/inbox/conversations/start` with cross-brokerage lead -> `HTTP 403 Forbidden`.
   - Outbound send to same-brokerage lead -> `HTTP 200 OK` or `HTTP 201 Created`.

2. **Read-Only Contact Mutation Defense**:
   - `PATCH /api/contacts/:id` on cross-brokerage lead -> `HTTP 403 Forbidden`.
   - `DELETE /api/contacts/:id` on cross-brokerage lead -> `HTTP 403 Forbidden`.
   - `POST /api/contacts/:id/notes` on cross-brokerage lead -> `HTTP 403 Forbidden`.
   - `POST /api/contacts/:id/portal-invite` on cross-brokerage lead -> `HTTP 403 Forbidden`.

3. **Wire-Level Payload Masking & Zero Leakage**:
   - `phone` matches middle-asterisk pattern (e.g. `+92 3******67` or `+44 7******56`).
   - `email` matches masked pattern (e.g. `b***@waynecorp.org`).
   - `assertZeroWireLeak`: Assert that raw sensitive strings NEVER appear in response body.

4. **CSV Export Confinement**:
   - Super Admin assigned to Brokerage Alpha exports strictly Brokerage Alpha contacts.
   - Cross-brokerage contacts (Brokerage Beta, Brokerage Gamma) are completely omitted.
   - Unassigned Super Admin (`brokerageId: null`) receives 0 data rows.

---

## 5. Architectural & Security Compliance Checklist

- [x] **Opaque-Box Requirement**: All tests interact solely via standard HTTP requests and responses.
- [x] **Application Source Code Untouched**: Zero modifications to `server/src/` or `src/`.
- [x] **Rate Limit Isolation**: Every test persona and tier category utilizes distinct user tokens to prevent rate-limit throttling under high-throughput test runs.
- [x] **Anti-CSRF Exemption Handled**: Requests include `x-bypass-csrf: test-mode` and Bearer tokens conforming to CSRF defense rules.
- [x] **Data Lifecycle Teardown**: `before` and `after` hooks cleanly seed and purge database collections, ensuring test run idempotency.
