DON'T REWRITE THIS FILE - ALWAYS MAKE A NEW FILE
---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
---

Act as the `aidlc-delivery-agent`. We have completed the Stage 1 performance audit for our feature. The codebase is currently unchanged; we have not modified any files yet.

Your job is to act as our engineering manager and translate the Stage 1 remediation strategy into a low-risk execution plan. Provide:

1. THE INTEGRATION SEQUENCE (BOLT PLAN): Group the modifications into sequential steps. Specify exactly which foundational utilities or configurations (like connection pooling setups) must be updated BEFORE rewriting the active route handlers.
2. RFACTOR BOUNDARIES: Pinpoint precisely which files, routers, or middleware layers will be modified, and which code lines are being stripped out.
3. CONFIDENCE HYPOTHESIS: What explicit local metrics, console performance timers, or flags must we evaluate immediately after editing to prove the latency multiplier was cleared?

Output a scannable, step-by-step checklist I can execute manually in my IDE.
