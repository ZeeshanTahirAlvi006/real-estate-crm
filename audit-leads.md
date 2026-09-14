---
STAGE: MANUAL_FEATURE_AUDIT_AND_REFACTOR
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: audit-steps/project.md
FEATURE: Leads (`server/src/features/leads/`, `server/src/models/LeadSource.ts`, `server/src/models/RoutingRule.ts`, `server/src/models/ScoringConfig.ts`)
SECURITY_SENSITIVE: YES (touches webhook HMAC signatures, API keys, decrypted webhook secrets, multi-tenant lead routing, PII including lead contact info)
---

# Stage 1: Adversarial Audit & Draft Rewrite for Leads Feature

Please refer to [`audit-steps/audit-leads.md`](file:///c:/Users/lenovo/OneDrive/Desktop/Real%20estate%20CRM/real-estate-crm/audit-steps/audit-leads.md) for the complete audit and draft rewrite.
