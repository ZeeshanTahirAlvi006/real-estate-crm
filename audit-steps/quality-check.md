---
STAGE: 4_POST_REFACTOR_QUALITY_VALIDATION
RULES_SOURCE: aidlc-quality-agent
---

Act as the `aidlc-quality-agent`. Our Developer Agent has just refactored our feature to clear critical latency multipliers. 

Your job is to build the automated testing contract to verify that our optimized, sub-1ms code handles extreme concurrency loops safely without changing any core business logic. Output:

1. FUNCTIONAL BOUNDARIES: List the exact happy paths, edge cases, and empty data conditions that must be validated.
2. LATENCY SLO ASSERTIONS: Define the exact performance validation limits to prove the code responds under 1ms on local loopback adapters.
3. AUTOMATED TEST SUITE: Generate a complete, ready-to-run test script using our environment's testing framework (e.g., Jest / Supertest / Mocha) that mocks our warmed connection pool and asserts structural payload correctness.

Output the complete, production-ready validation code block.
