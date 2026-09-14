---
STAGE: 2_DELIVERY_AND_INTEGRATION_PLANNING
RULES_SOURCE: aidlc-delivery-agent
FEATURE: Pipeline (`server/src/features/pipeline/`, `server/src/models/Pipeline.ts`, `server/src/models/Deal.ts`)
TARGET_BENCHMARK: < 1.0ms local loopback latency (cached) · < 10ms uncached (MongoDB) · zero data loss · zero memory leaks
---

# Delivery & Integration Plan: Pipeline Sub-1ms Architecture

**Agent:** `aidlc-delivery-agent`  
**Target Feature:** `/server/pipeline`  
**Pre-condition:** Codebase is unmodified. This plan translates Stage 1 findings into a phased, risk-ordered Bolt execution plan with strict rollback gates.

---

## 1. The Integration Sequence (Bolt Plan)

The refactoring is decomposed into 5 sequential Bolts. Foundational data indexes and types MUST land before service and controller modifications to guarantee zero runtime compilation errors and immediate query optimization.

```
┌────────────────────────────────────────────────────────┐
│ Bolt 1: Database Tier — Compound Covering Indexes      │
│ (Pipeline.ts & Deal.ts index declarations)             │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Bolt 2: Types & Contract Expansion                     │
│ (pipeline.types.ts caching & telemetry shapes)         │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Bolt 3: Service Tier Rewiring & Sub-1ms Caching Engine │
│ (Eliminate N+1, L1/L2 cache, async audit, timers)      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Bolt 4: Controller Immunization & Telemetry Injection  │
│ (HTTP 401 on missing user, X-Cache, X-Response-Time)   │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Bolt 5: Automated Quality Gate & Concurrency Suite     │
│ (Unit/perf tests verifying <1ms cache & <10ms DB)      │
└────────────────────────────────────────────────────────┘
```

### Bolt 1: Database Tier — Index Optimization
- **File 1:** `server/src/models/Pipeline.ts`
  - Action: Add compound index `{ brokerageId: 1, isDefault: -1, createdAt: 1 }` to cover tenant listing with default-first sorting without requiring an in-memory sort.
- **File 2:** `server/src/models/Deal.ts`
  - Action: Add compound covering index `{ pipelineId: 1, isDeleted: 1, stageId: 1, dealValue: 1 }` to eliminate `COLLSCAN` during pipeline stage stats aggregations.

### Bolt 2: Types Tier — Cache & Telemetry Envelopes
- **File:** `server/src/features/pipeline/pipeline.types.ts`
  - Action: Export `CachedPipelineListResult` (`{ pipelines: PipelineResponse[], source: 'l1' | 'l2' | 'db' }`) and `CachedPipelineDetailResult` (`{ pipeline: PipelineResponse, source: 'l1' | 'l2' | 'db' }`).

### Bolt 3: Service Tier — High-Performance Rewiring
- **File:** `server/src/features/pipeline/pipeline.service.ts`
  - Action 1: Instantiate L1 in-memory caches: `pipelineListL1Cache` (500 entries, 60s TTL) and `pipelineDetailL1Cache` (500 entries, 60s TTL).
  - Action 2: Export `invalidatePipelineCaches(brokerageId?: string, pipelineId?: string)` to flush L1 and trigger tenant-scoped Redis invalidation (`pp:<brokerageId>:pipeline:*` and `pp:<brokerageId>:deals:*`).
  - Action 3: Implement `getBatchStageStats(pipelineIds: mongoose.Types.ObjectId[])` using a single `$in` aggregation pipeline, eliminating the N+1 query loop in `listPipelines`.
  - Action 4: Rewire `listPipelines` to check L1 -> L2 (Redis) -> single-pass DB fetch, instrumented with `process.hrtime.bigint()`.
  - Action 5: Rewire `getPipelineById` with L1 -> L2 -> lean DB fetch.
  - Action 6: Offload all 7 `logAuditEvent` calls to `queueMicrotask` with `.catch()` error isolation.
  - Action 7: Integrate `invalidatePipelineCaches` into all mutation functions (`createPipeline`, `updatePipeline`, `deletePipeline`, `addStage`, `updateStage`, `reorderStages`, `deleteStage`).
  - Action 8: Insert console execution counters into every single service function:
    `console.log('[PIPELINE-PERF][service:<fnName>] <ms> (source: L1|L2|DB)')`.

### Bolt 4: Controller Tier — Socket Immunization & Diagnostic Headers
- **File:** `server/src/features/pipeline/pipeline.controller.ts`
  - Action 1: Replace all 9 silent `if (!req.user) return` traps with:
    `if (!req.user) { sendError(res, GENERIC_AUTH_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); return }`.
  - Action 2: Wrap all 9 controller functions with `process.hrtime.bigint()` timers.
  - Action 3: Set diagnostic response headers:
    - `X-Cache`: `L1-HIT` | `L2-HIT` | `MISS`
    - `X-Response-Time`: `<duration>ms`
  - Action 4: Output console timing metrics:
    `console.log('[PIPELINE-PERF][controller:<handlerName>] <ms>')`.

### Bolt 5: Test Tier — Verification & Quality Assurance
- **File:** `server/tests/unit/pipelinePerformance.test.ts`
  - Action: Implement comprehensive test suite asserting:
    1. Socket immunization (immediate HTTP 401 for unauthenticated calls across all handlers).
    2. Sub-1ms cached read latency SLO on L1 hits.
    3. Single-pass batch aggregation and N+1 elimination.
    4. Deterministic cache invalidation on pipeline & stage mutations.
    5. Clean error handling and zero data regression.

---

## 2. Refactor Boundaries

| Target File | Tier | Modifications | Lines Stripped / Replaced |
|---|---|---|---|
| `server/src/models/Pipeline.ts` | Model | Add compound sort index | None; additive index declaration |
| `server/src/models/Deal.ts` | Model | Add covering aggregation index | None; additive index declaration |
| `server/src/features/pipeline/pipeline.types.ts` | Types | Export `CachedPipelineListResult`, `CachedPipelineDetailResult` | None; additive interfaces |
| `server/src/features/pipeline/pipeline.service.ts` | Service | Add L1/L2 caches, batch stage stats, async audit, console counters | Lines 21–37 (old sequential stats), Lines 71–79, 139–147, 176–184, 217–225, 254–262, 290–298, 344–352 (blocking audit awaits) replaced with `queueMicrotask` |
| `server/src/features/pipeline/pipeline.controller.ts` | Controller | Replace silent exits with 401, inject telemetry headers & console counters | Lines 24, 33, 42, 52, 62, 72, 82, 92, 102 (`if (!req.user) return`) replaced with explicit `sendError(res, ...)` |

---

## 3. Confidence Hypotheses & Telemetry Gates

| Metric | Verification Instrument | Target Threshold | Validation Point |
|---|---|---|---|
| **Cached Read Latency** | `X-Response-Time` header & `[PIPELINE-PERF]` log | **< 1.0ms** (expected ~0.02ms – 0.15ms) | Bolt 3 & 4 execution |
| **Uncached DB Latency** | `recordDbMetric` & `[PIPELINE-PERF]` log | **< 10.0ms** | Single-pass batch aggregation |
| **N+1 Elimination** | MongoDB aggregation count per `listPipelines` | **Exactly 1 batch aggregation** | Bolt 3 execution |
| **Socket Immunization** | HTTP status code on unauthenticated request | **HTTP 401 Unauthorized** (in < 1.0ms) | Bolt 4 execution |
| **Cache Invalidation** | Cache state after stage/pipeline mutation | **Immediate L1 eviction + Redis pattern purge** | Bolt 3 & 5 execution |
| **TypeScript Compilation** | `npm run typecheck` | **0 errors, 0 warnings** | After Bolt 4 |
| **Unit & Performance Tests**| `npm test` | **100% pass rate (0 failures)** | Bolt 5 execution |

---

## 4. Scannable Step-by-Step Execution Checklist

- [ ] **Step 1:** Update `Pipeline.ts` and `Deal.ts` schemas with optimized compound covering indexes.
- [ ] **Step 2:** Update `pipeline.types.ts` with cached result types.
- [ ] **Step 3:** Rewrite `pipeline.service.ts`:
  - [ ] Implement `pipelineListL1Cache`, `pipelineDetailL1Cache`, and `invalidatePipelineCaches`.
  - [ ] Implement `getBatchStageStats` to collapse N+1 queries.
  - [ ] Rewrite `listPipelines` and `getPipelineById` with L1/L2 caching.
  - [ ] Decouple `logAuditEvent` calls to background microtasks.
  - [ ] Add `process.hrtime.bigint()` timing and console counters in every service function.
- [ ] **Step 4:** Rewrite `pipeline.controller.ts`:
  - [ ] Replace all silent `if (!req.user) return` traps with explicit HTTP 401 responses.
  - [ ] Add `process.hrtime.bigint()` timers, console counters, and `X-Cache` / `X-Response-Time` headers.
- [ ] **Step 5:** Run `npm run typecheck` to verify complete type safety.
- [ ] **Step 6:** Create `server/tests/unit/pipelinePerformance.test.ts` and run tests via `npm test`.
- [ ] **Step 7:** Verify console timing displays and latency budgets in local environment.
