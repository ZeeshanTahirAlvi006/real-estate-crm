# E2E Test Infra: PropPulse OS Multi-Tenant Restriction & Contact Masking

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Derived strictly from `ORIGINAL_REQUEST.md`, simulating genuine HTTP client requests and user role interactions.
- **Methodology**: Category-Partition + Boundary Value Analysis + Cross-Feature Combinations + Real-World Workload Testing.
- **Independence**: Evaluates end-to-end multi-tenant boundaries and wire-level payloads without relying on implementation internals.

---

## Feature Inventory & Test Coverage Mapping
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|--------|:-----------------:|:-----------------:|:----------------------:|:-------------------:|
| F1 | R1: Outbound Unified Communication Restriction | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | R1: WhatsApp & Broadcast Restriction | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | R1: Unassigned Super Admin Communication Lock | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F4 | R2: Contact Brokerage Attribution (API & UI) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F5 | R3: Wire-Level Phone & Email Data Masking | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F6 | R3: Contact Mutation Read-Only (Update/Delete/Notes) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| F7 | R4: Audit Logs & Activity Stream Redaction | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| F8 | R5: CSV Export Multi-Tenant Confinement | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |

---

## Test Architecture
- **Runner**: Node.js built-in test runner with `tsx` (`npx tsx --test`) or Jest/Vitest.
- **Test File Location**: `server/tests/e2e/multiTenantBoundary.e2e.test.ts`
- **Pass/Fail Semantics**:
  - Outbound communication to cross-brokerage lead returns strictly `HTTP 403 Forbidden`.
  - Same-brokerage communication returns `HTTP 201 Created` or `HTTP 200 OK`.
  - Wire-level payload inspection: `phone` matches `+92 3******67` pattern and `email` matches `j***@domain.com` pattern for cross-brokerage leads; raw numbers/emails NEVER present in JSON response.
  - Cross-brokerage mutation attempts (PATCH, DELETE, POST notes) return strictly `HTTP 403 Forbidden`.
  - Audit logs and activities for cross-brokerage resources have sensitive strings redacted.
  - CSV export returns exclusively own-brokerage contacts; returns 0 data rows for unassigned Super Admin.

---

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Multi-Brokerage Lead Intake & Super Admin Review | F4, F5, F6 | High |
| 2 | Unified Omnichannel Campaign with Mixed Contacts | F1, F2, F3 | High |
| 3 | Cross-Brokerage Audit Compliance & Activity Trail | F4, F7 | Medium |
| 4 | Super Admin Brokerage Reassignment & Scope Shift | F1, F3, F5, F8 | High |
| 5 | Enterprise CSV Export Audit & Regulatory Filing | F5, F8 | Medium |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >=5 tests per feature (>=40 tests)
- **Tier 2 (Boundary & Corner Cases)**: >=5 tests per feature (>=40 tests)
- **Tier 3 (Cross-Feature Combinations)**: >=8 pairwise tests
- **Tier 4 (Real-World Scenarios)**: >=5 realistic workflow tests
- **Total Minimum Target**: >=93 automated test cases
