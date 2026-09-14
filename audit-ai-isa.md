---
STAGE: 1_MANUAL_FEATURE_AUDIT_AND_REFACTOR
FEATURE: AI Assistant & AI ISA (`server/src/features/ai-isa/*`, `server/src/features/ai-chatbot/*`, `server/src/models/AiIsaConfig.ts`, `server/src/models/QualificationCriteria.ts`, `server/src/models/ReactivationCampaign.ts`, `server/src/models/ObjectionPlaybook.ts`)
SECURITY_SENSITIVE: YES
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
CONTEXT_FILE: project.md
---

# Stage 1: Adversarial Audit & Draft Rewrite for AI Assistant & AI ISA

Please refer to [`audit-steps/audit-ai-isa.md`](./audit-steps/audit-ai-isa.md) for the complete adversarial audit register and drafted drop-in replacement specifications.
