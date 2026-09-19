# PropPulse OS: Super Admin Cross-Brokerage Communication Restriction & Contact Data Masking Plan

## Overview
Implement strict multi-tenant boundary restrictions for Super Admins in PropPulse OS across backend API, frontend UI, audit logs, activity feeds, and CSV export.

## Phase 0: Survey & Scope Mapping (Parallel 3 Subagents)
- Explorer 1: Backend communication routes (/api/communication/send, whatsapp, dialer, emails, calls) and mutation guards (/api/contacts/:id PATCH/PUT/DELETE/notes)
- Explorer 2: Backend contact querying, DTOs, masking engine, audit logs (/api/audit-logs), activity feeds (/api/contacts/:id/activities), CSV export (/api/contacts/export)
- Spec Miner: Frontend contact views (table, grid, kanban, detail drawer/page, inbox, dialer), action buttons, tooltips, and contact response types
Outputs: Survey reports in `.agents/explorer_survey_1/handoff.md`, `.agents/explorer_survey_2/handoff.md`, `.agents/spec_miner_survey_1/handoff.md`.

## Phase 1: PROJECT.md & Dual Track Setup
- Synthesize findings into `PROJECT.md` at project root with full Feature Inventory, Architecture, Milestones, and Interface Contracts.
- Dual Track:
  - Track A (E2E Testing): Create `TEST_INFRA.md`, build opaque-box test runner & cases (Tiers 1-4).
  - Track B (Implementation):
    - Milestone 1: Backend Multi-Tenant Guards (R1, R3 API Guards)
    - Milestone 2: Backend Attribution & Masking Engine (R2, R3, R4, R5 Backend)
    - Milestone 3: Frontend UI Attribution, Outbound Action Disabling & Masking (R1, R2, R3 Frontend)

## Phase 2: Execution & Verification Gate per Milestone
For each milestone:
1. Explorer: Implementation design & file targets
2. Worker: Genuine implementation + unit tests + build check
3. Reviewers (2): Code review & specification conformance
4. Challengers (2): Boundary & adversarial testing
5. Forensic Auditor: Integrity check (Anti-cheating, DI-001..004, ML-001..004, PERF-M/R)
6. Gate Decision in GATE_STATUS.md

## Phase 3: Final E2E Suite & Hardening (Tier 5)
- Validate 100% pass on all E2E test cases
- White-box adversarial testing (Tier 5)
- Forensic Victory Audit
- Final completion handoff to Sentinel
