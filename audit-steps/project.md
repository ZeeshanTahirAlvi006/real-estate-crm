---
active_space: main-space
project_type: brownfield
tier: judgment
change_control: strict
---

# Project Memory & Technical Debt Register

This document serves as the authoritative context for optimization tasks. The primary engineering goal is to rewire existing endpoints to reduce loopback latency to **sub-1ms**. Downstream agents must eliminate all blockers listed below during the code-generation and refactoring phases.

---

## 📊 1. MongoDB & ORM Database Bottlenecks

### ⚠️ Missing Indexes
* **Signal:** MongoDB executes collection scans (`COLLSCAN`) instead of index scans (`IXSCAN`).
* **Impact:** Query times scale linearly with database size, completely breaking the sub-1ms local loopback latency budget.
* **Remediation:** Track queries in route controllers and ensure all criteria in `.find()` or `$match` structures have corresponding compound or single-field indexes.

### ⚠️ ORM Lazy Loading & Hidden Queries
* **Signal:** Object-Relational Mappers (or Mongoose virtuals/populate) executing hidden data fetches automatically behind the scenes.
* **Impact:** Causes sneaky, un-pipelined data queries to execute sequentially behind the scenes instead of using a single pooled memory block.
* **Remediation:** Explicitly define and fetch all necessary relations upfront. Avoid automated virtual getters that make database calls during serialization loops.

### ⚠️ Large Data Payloads
* **Signal:** Queries fetch entire documents with unneeded fields (e.g., retrieving hashed passwords, metadata, and full history arrays when only the username or property ID is needed).
* **Impact:** Massive internal serialization overhead and high memory consumption on the heap.
* **Remediation:** Enforce projection constraints on all reads (e.g., `.find({}, { username: 1 })` or `$project` blocks).

### ⚠️ Unoptimized Aggregations
* **Signal:** Aggregation pipelines feature poorly ordered stages.
* **Impact:** Processing massive collections in-memory due to early pipeline bloat.
* **Remediation:** Aggressive positioning of `$match` and `$sort` stages at the absolute beginning of pipelines to prune data before executing `$project`, `$lookup`, or `$unwind`.

---

## 📈 2. Node.js & Express Backend Bottlenecks

### ⚠️ Synchronous Logging Lag
* **Signal:** Active code printing statements directly to a Windows console or terminal synchronously using native output utilities.
* **Impact:** Commands like `console.log()` or `print()` interact directly with the operating system's standard out buffer, taking **2ms to 10ms** per execution block, which immediately breaks a sub-1ms budget.
* **Remediation:** Completely strip raw console statements from production hot-paths, or swap them out for decoupled, non-blocking asynchronous log buffers (like Pino or Winston configured with a worker thread/sonic-boom stream).

### ⚠️ Blocking the Event Loop
* **Signal:** CPU-intensive tasks (e.g., heavy cryptography, sorting enormous arrays, text processing) run synchronously inside the main execution thread.
* **Impact:** Node.js halts entirely, delaying all concurrent loopback traffic.
* **Remediation:** Offload CPU-bound calculations to worker threads or execute them completely out-of-band using asynchronous microtasks.

### ⚠️ The N+1 Query Problem
* **Signal:** Executing a parent database query to fetch an array of documents, then running a nested, separate database query inside a loop for each item to fetch child/related data.
* **Impact:** Cumulative network socket lag on localhost.
* **Remediation:** Refactor data patterns to use single MongoDB `$lookup` aggregations or pre-fetch related documents via `$in` queries.

### ⚠️ Unmanaged Global Middleware
* **Signal:** Heavy or poorly optimized custom middleware functions executing globally via `app.use()` across all application routes.
* **Impact:** Compounded request processing latency before the target route handler is even invoked.
* **Remediation:** Isolate middleware strictly to the route groups that require them. Optimize inline text transforms and authorization parsing steps.

### ⚠️ Memory Leaks & Garbage Collection Overload
* **Signal:** Accumulating references to unused objects inside global arrays, long-lived closures, or un-cleared event listeners.
* **Impact:** The V8 garbage collector runs aggressively, freezing application execution for milliseconds at a time.
* **Remediation:** Enforce strict encapsulation. Ensure variables clear their references immediately after execution blocks close.

---

## 🌐 3. Architecture, Network, & Connection Bottlenecks

### ⚠️ TCP Connection Bloat
* **Signal:** Initializing new database, Mongoose, or Redis client handshakes dynamically inside individual request controllers or lifecycle loops.
* **Impact:** Every single inbound route event forces a new TCP connection handshake, adding massive cryptographic and connection setup latency.
* **Remediation:** Maintain persistent, warmed connection pools initialized globally at application boot, and reuse the single active client instance across all endpoints.

### ⚠️ Lack of Caching
* **Signal:** Repeatedly querying MongoDB for static, configuration, or rarely changing system parameters.
* **Impact:** Unnecessary query parsing overhead on standard CRUD pathways.
* **Remediation:** Implement an ultra-fast in-memory lookup cache or a local memory map to bypass the database network socket entirely for read-heavy operations.

### ⚠️ Massive Payload Sizes
* **Signal:** Transferring uncompressed, giant raw JSON payloads across the localhost loopback adapter to the React frontend client.
* **Impact:** Long data parsing windows in Node.js stringify pipelines.
* **Remediation:** Prune all object properties at the controller level down to the bare minimum fields requested by the view.

### ⚠️ Missing Pagination
* **Signal:** API endpoints attempt to resolve and send thousands of records at once within a single response packet.
* **Impact:** System memory spikes and slow transfer windows over the loopback interface.
* **Remediation:** Enforce strict, mandatory limit boundaries (`.limit()`, `.skip()`) or cursor-based pagination strategies on every list endpoint.

Other Issues to look for and solve
1. Sequential DB calls inflate blocking time
2.missing composite index or table scan
3.Cache-expiry requests wait synchronously on the DB
4.DB fetch sits on the socket handshake's critical path → transport close disconnects
5.Non-essential side effects block the client response
