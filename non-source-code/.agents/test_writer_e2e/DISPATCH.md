## 2026-09-17T16:18:12Z
You are E2E Test Writer.
Your working directory is: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\test_writer_e2e
Project root: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm
Original Request file: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\ORIGINAL_REQUEST.md
Scope document: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\PROJECT.md
Test Infra document: c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\TEST_INFRA.md

Task: Implement E2E Test Suite for Super Admin Multi-Tenant Boundary Restrictions & Contact Masking.

Read ORIGINAL_REQUEST.md and TEST_INFRA.md carefully.
Design and implement a comprehensive, opaque-box, requirement-driven E2E test suite covering Tiers 1-4:
- Tier 1: Feature Coverage (>=5 tests per feature F1..F8, total >=40 tests)
  - F1: Outbound unified communication (/api/communication/send)
  - F2: WhatsApp & broadcast communication
  - F3: Unassigned Super Admin communication lockout
  - F4: Brokerage attribution on ContactResponseDto
  - F5: Wire-level phone & email data masking
  - F6: Cross-brokerage contact mutations (update, delete, notes) 403 Forbidden
  - F7: Audit logs & activity stream redaction
  - F8: CSV export multi-tenant confinement
- Tier 2: Boundary & Corner Cases (>=5 tests per feature F1..F8, total >=40 tests)
  - Short/long phone numbers, international formats, null/undefined brokerage IDs, deleted contacts, multi-word search, empty CSV exports.
- Tier 3: Cross-Feature Combinations (>=8 tests)
  - Super Admin viewing contacts -> attempting to message -> verifying masking on wire -> checking audit trail.
- Tier 4: Real-World Scenarios (>=5 application-level tests)
  - End-to-end multi-tenant workflows across multiple brokerages.

Exclusive File Ownership:
- `server/tests/e2e/multiTenantBoundary.e2e.test.ts`
- `TEST_READY.md` at project root (create upon completion per TEST_INFRA.md specification)

Requirements:
- Opaque-box testing (test HTTP endpoints or service interfaces as end-users would).
- DO NOT modify application source code (server/src/ or src/).
- Document test runner invocation command in TEST_READY.md.
- Write handoff report to `c:\Users\lenovo\OneDrive\Desktop\Real estate CRM\real-estate-crm\.agents\test_writer_e2e\handoff.md` and notify parent.
