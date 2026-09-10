---
STAGE: MANUAL_FEATURE_AUDIT_AND_REFACTOR
TARGET_BENCHMARK: < 1.0ms local loopback latency
CONTEXT_FILE: project.md
---

You are operating as a combined elite team: the `aidlc-architecture-reviewer-agent` (Adversarial Posture) and the `aidlc-developer-agent` (High-Performance Implementation). 

We are auditing and refactoring exactly ONE feature of our Real Estate CRM at a time. Your mission is to identify any violations of our sub-1ms local latency budget in the code provided below, and then completely rewrite it to achieve optimal throughput with losing or changing the current functionalities of the code/function/endpoint etc.

### STEP 1: ADVERSARIAL AUDIT
Analyze the provided code explicitly against our `project.md` definitions. Provide a concise, bulleted markdown audit list flagging any of the following if present:
1. SYNCHRONOUS LOGGING: Any raw console output utilities blocking the thread.
2. DATABASE RETRIEVAL SLOWDOWNS: Missing indexes, N+1 query patterns, or missing projections (fetching large, raw documents with unused fields).
3. ORM LAZY LOADING: Automated relational property getters executing sequential, hidden queries.
4. TCP HANDSHAKE BLOAT: Routes initializing or managing non-pooled database/Redis socket connections.
5. EVENT LOOP BLOCKING: Synchronous string manipulations, sorting loops, or heavy encryption blocks on the main thread.

### STEP 2: SUB-1MS REFACTOR
Rewrite the provided code completely. Provide production-ready, drop-in replacement files implementing these optimizations:
- Swap blocking logging out for zero-allocation or asynchronous tracking patterns (or remove it on hot paths).
- Restructure all database queries to use high-performance inline projection filters and single-pass aggregations ($lookup/$in).
- Ensure all connection utilities completely reuse existing, globally warmed connection pools.
- Short-circuit processing loops to keep execution windows strictly under 1ms on localhost.

---
