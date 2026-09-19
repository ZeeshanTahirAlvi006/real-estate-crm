DONT RE-WRITE THIS FILE - ALWAYS MAKE A NEW FILE

---
STAGE: 3_HIGH_PERFORMANCE_CODEGEN
RULES_SOURCE: aidlc-developer-agent
---

Act as the `aidlc-developer-agent`. We are ready to write the optimized code for our feature according to our Stage 2 checklist. 

Your mission is to completely refactor the existing code provided below to smash our sub-1ms localhost latency target. Enforce these strict engineering principles:
- Zero-Allocation Logging: Completely strip raw console statements from production hot-paths, or implement non-blocking asynchronous log streams.
- Inline Projections & Aggregations: Restructure all database lookups to use explicit field projection filtering. Flatten nested loops into single-pass database lookups ($lookup/$in).
- Persistent Connection Reuse: Ensure all controllers leverage our globally warmed connection pools. Do not initialize client socket handshakes inline.
- Non-Blocking Control Flow: Short-circuit conditional logic to ensure processing windows stay well under 1ms.

Output production-ready, drop-in replacement files. Label file names clearly.

---
### ORIGINAL CODE TO REWRITE:

[ PASTE SOURCE CODE HERE ]
