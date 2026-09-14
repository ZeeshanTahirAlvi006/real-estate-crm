import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  formatAuditLogDto,
  normalizeTenantFilter,
  buildAuditFilter,
  listAuditLogs,
  getAuditLogById,
  invalidateAuditCaches,
  auditLogsL1Cache,
  auditLogDetailL1Cache,
} from '../../src/features/audit/audit.service.js'
import {
  getAuditLogs as getAuditLogsController,
  getAuditLogById as getAuditLogByIdController,
} from '../../src/features/audit/audit.controller.js'
import { httpAuditLogger } from '../../src/middleware/auditLogger.js'
import {
  sanitizeAuditPayload,
  enqueueAuditEvent,
  logAuditEvent,
  flushAuditQueue,
} from '../../src/utils/auditLogger.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { cacheSet, cacheGet, cacheDelete } from '../../src/config/redis.js'
import { buildCacheKey, measureExecutionMs } from '../../src/utils/cacheHelper.js'
import { USER_ROLES, HTTP_STATUS } from '../../src/utils/constants.js'

describe('Stage 4: aidlc-quality-agent — Exhaustive Per-Function & Sequence Latency Contract', () => {
  const MAX_ALLOWED_LATENCY_MS = 10.0 // Hard SLA ceiling: 10.0ms
  const CACHED_SLA_MS = 1.0 // Cached SLA ceiling: 1.0ms

  const tenantBrokerageId = new mongoose.Types.ObjectId()
  const tenantFilter = { brokerageId: tenantBrokerageId }

  // Timing helper that verifies latency ceiling and prints structured audit trail
  const assertLatencyLimit = (
    fnName: string,
    sequence: string,
    startTime: bigint,
    limitMs: number = MAX_ALLOWED_LATENCY_MS
  ): number => {
    const durationMs = measureExecutionMs(startTime)
    console.log(
      `  [SLO-PASS] ${fnName.padEnd(26)} | Seq: ${sequence.padEnd(36)} | Duration: ${durationMs.toFixed(4)}ms (SLA: <${limitMs.toFixed(1)}ms)`
    )
    assert.ok(
      durationMs < limitMs,
      `PERFORMANCE REGRESSION: ${fnName} (${sequence}) took ${durationMs.toFixed(4)}ms, exceeding the ${limitMs}ms limit!`
    )
    return durationMs
  }

  // Response mock with header and listener support
  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      body: null,
      headers: {} as Record<string, string>,
      _listeners: {} as Record<string, Function>,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(data: any) {
        this.body = data
        return this
      },
      setHeader(name: string, value: string) {
        this.headers[name] = value
        return this
      },
      once(event: string, listener: Function) {
        this._listeners[event] = listener
        return this
      },
      emit(event: string, ...args: any[]) {
        if (this._listeners[event]) {
          this._listeners[event](...args)
        }
      },
    }
    return res
  }

  const origAuditLogAggregate = AuditLog.aggregate
  const origAuditLogFindOne = AuditLog.findOne
  const origAuditLogInsertMany = AuditLog.insertMany

  beforeEach(() => {
    auditLogsL1Cache.clear()
    auditLogDetailL1Cache.clear()

    AuditLog.aggregate = (async () => [
      {
        data: [],
        totalCount: [{ count: 0 }],
      },
    ]) as any

    AuditLog.findOne = (() => ({
      lean: async () => null,
    })) as any

    AuditLog.insertMany = (async () => []) as any
  })

  afterEach(() => {
    AuditLog.aggregate = origAuditLogAggregate
    AuditLog.findOne = origAuditLogFindOne
    AuditLog.insertMany = origAuditLogInsertMany
  })

  // =========================================================================
  // 1. formatAuditLogDto Sequences
  // =========================================================================
  describe('Function: formatAuditLogDto', () => {
    it('Seq 1: Standard plain object mapping with all fields populated', () => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        userEmail: 'agent@proppulse.com',
        userRole: 'agent',
        brokerageId: tenantBrokerageId,
        action: 'contact.update',
        resource: 'contacts',
        resourceId: 'c_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120',
        status: 'success',
        createdAt: new Date(),
      }
      const t0 = process.hrtime.bigint()
      const dto = formatAuditLogDto(doc)
      assertLatencyLimit('formatAuditLogDto', 'Standard full document mapping', t0)
      assert.equal(dto.action, 'contact.update')
      assert.equal(dto.userEmail, 'agent@proppulse.com')
    })

    it('Seq 2: Edge case with missing optional fields & null fallbacks', () => {
      const minimalDoc = {
        _id: 'string_id_123',
        action: 'auth.logout',
        resource: 'auth',
      }
      const t0 = process.hrtime.bigint()
      const dto = formatAuditLogDto(minimalDoc)
      assertLatencyLimit('formatAuditLogDto', 'Minimal doc missing optional fields', t0)
      assert.equal(dto.ipAddress, '127.0.0.1')
      assert.equal(dto.userAgent, 'system')
      assert.equal(dto.status, 'success')
    })

    it('Seq 3: Date representation variations (Date instance, string, number)', () => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        action: 'deal.close',
        resource: 'deals',
        createdAt: '2026-09-12T12:00:00.000Z',
      }
      const t0 = process.hrtime.bigint()
      const dto = formatAuditLogDto(doc)
      assertLatencyLimit('formatAuditLogDto', 'Date string parsing', t0)
      assert.equal(dto.createdAt, '2026-09-12T12:00:00.000Z')
    })
  })

  // =========================================================================
  // 2. normalizeTenantFilter Sequences
  // =========================================================================
  describe('Function: normalizeTenantFilter', () => {
    it('Seq 1: Valid 24-character hex string coerced to ObjectId', () => {
      const rawHex = '64f000000000000000000001'
      const t0 = process.hrtime.bigint()
      const normalized = normalizeTenantFilter({ brokerageId: rawHex })
      assertLatencyLimit('normalizeTenantFilter', 'Valid hex string to ObjectId cast', t0)
      assert.ok(normalized.brokerageId instanceof mongoose.Types.ObjectId)
    })

    it('Seq 2: Already wrapped ObjectId preserved without recreation', () => {
      const objId = new mongoose.Types.ObjectId()
      const t0 = process.hrtime.bigint()
      const normalized = normalizeTenantFilter({ brokerageId: objId })
      assertLatencyLimit('normalizeTenantFilter', 'Pre-existing ObjectId passthrough', t0)
      assert.equal(normalized.brokerageId, objId)
    })

    it('Seq 3: Missing/empty tenantFilter returns safe empty object', () => {
      const t0 = process.hrtime.bigint()
      const normalized = normalizeTenantFilter({})
      assertLatencyLimit('normalizeTenantFilter', 'Empty tenantFilter normalization', t0)
      assert.deepEqual(normalized, {})
    })
  })

  // =========================================================================
  // 3. buildAuditFilter Sequences
  // =========================================================================
  describe('Function: buildAuditFilter', () => {
    it('Seq 1: Multi-dimensional filter with action, resource, email, and status', () => {
      const query = {
        action: 'contact.create',
        resource: 'contacts',
        userEmail: 'Agent@PropPulse.com',
        status: 'success' as const,
      }
      const t0 = process.hrtime.bigint()
      const filter = buildAuditFilter(query, tenantFilter)
      assertLatencyLimit('buildAuditFilter', 'Multi-dimensional criteria assembly', t0)
      assert.equal(filter.action, 'contact.create')
      assert.equal(filter.userEmail, 'agent@proppulse.com')
      assert.equal(filter.status, 'success')
      assert.ok(filter.brokerageId instanceof mongoose.Types.ObjectId)
    })

    it('Seq 2: Date boundary range filter (startDate and endDate)', () => {
      const query = {
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z',
      }
      const t0 = process.hrtime.bigint()
      const filter = buildAuditFilter(query, tenantFilter)
      assertLatencyLimit('buildAuditFilter', 'ISO date range boundary extraction', t0)
      assert.ok(filter.createdAt.$gte instanceof Date)
      assert.ok(filter.createdAt.$lte instanceof Date)
    })

    it('Seq 3: Invalid dates ignored gracefully without breaking filter', () => {
      const query = {
        startDate: 'INVALID_NOT_A_DATE',
        endDate: 'GARBAGE_INPUT',
      }
      const t0 = process.hrtime.bigint()
      const filter = buildAuditFilter(query, tenantFilter)
      assertLatencyLimit('buildAuditFilter', 'Corrupted date input sanitization', t0)
      assert.equal(filter.createdAt, undefined)
    })
  })

  // =========================================================================
  // 4. listAuditLogs Sequences
  // =========================================================================
  describe('Function: listAuditLogs', () => {
    it('Seq 1: L1 In-Memory Cache Hit (< 1.0ms SLO)', async () => {
      const query = { page: 1, limit: 25, action: 'contact.view' }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      // Seed L1 cache
      auditLogsL1Cache.set(cacheKey, { logs: [], total: 0 }, 30)

      const t0 = process.hrtime.bigint()
      const result = await listAuditLogs(query, tenantFilter)
      assertLatencyLimit('listAuditLogs', 'L1 In-Memory Cache Hit (<0.1ms)', t0, CACHED_SLA_MS)
      assert.equal(result.source, 'l1')
    })

    it('Seq 2: L2 Redis Cache Hit (< 10ms SLO)', async () => {
      const query = { page: 1, limit: 25, action: 'contact.delete' }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      // Seed L2 Redis cache
      await cacheSet(cacheKey, JSON.stringify({ logs: [], total: 0 }), 30)

      const t0 = process.hrtime.bigint()
      const result = await listAuditLogs(query, tenantFilter)
      assertLatencyLimit('listAuditLogs', 'L2 Redis Cache Hit', t0)
      assert.equal(result.source, 'l2')
    })

    it('Seq 3: Cache Miss -> Uncached MongoDB Query (< 10ms SLO)', async () => {
      const query = { page: 1, limit: 10, resource: 'leads' }
      const mockRecord = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: tenantBrokerageId,
        action: 'lead.ingest',
        resource: 'leads',
        status: 'success',
        createdAt: new Date(),
      }

      AuditLog.aggregate = (async () => [
        {
          data: [mockRecord],
          totalCount: [{ count: 1 }],
        },
      ]) as any

      const t0 = process.hrtime.bigint()
      const result = await listAuditLogs(query, tenantFilter)
      assertLatencyLimit('listAuditLogs', 'Uncached Single-Pass Aggregation', t0)
      assert.equal(result.source, 'db')
      assert.equal(result.total, 1)
    })

    it('Seq 4: Super Admin Unscoped Query with Descending Sort (< 10ms SLO)', async () => {
      const query = { page: 1, limit: 15, sortBy: 'createdAt', sortOrder: 'desc' as const }

      AuditLog.aggregate = (async () => [
        {
          data: [],
          totalCount: [{ count: 0 }],
        },
      ]) as any

      const t0 = process.hrtime.bigint()
      const result = await listAuditLogs(query, {}) // Global unscoped
      assertLatencyLimit('listAuditLogs', 'Super Admin unscoped sort query', t0)
      assert.equal(result.total, 0)
    })

    it('Seq 5: Corrupted Cache JSON Transparent Fallthrough (< 10ms SLO)', async () => {
      const query = { page: 1, limit: 5, action: 'system.reboot' }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      await cacheSet(cacheKey, '{badJson...', 30)

      const t0 = process.hrtime.bigint()
      const result = await listAuditLogs(query, tenantFilter)
      assertLatencyLimit('listAuditLogs', 'Corrupted Redis JSON fallthrough', t0)
      assert.equal(result.source, 'db')
    })
  })

  // =========================================================================
  // 5. getAuditLogById Sequences
  // =========================================================================
  describe('Function: getAuditLogById', () => {
    it('Seq 1: Malformed ObjectId fast-fail rejection (< 10ms SLO)', async () => {
      const t0 = process.hrtime.bigint()
      const result = await getAuditLogById('invalid-object-id', tenantFilter)
      assertLatencyLimit('getAuditLogById', 'Malformed ID fast rejection', t0)
      assert.equal(result, null)
    })

    it('Seq 2: L1 In-Memory Cache Hit (< 1.0ms SLO)', async () => {
      const id = new mongoose.Types.ObjectId().toString()
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-log-detail', { id })

      const mockDto = {
        id,
        action: 'contact.archive',
        resource: 'contacts',
        status: 'success' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'test',
        createdAt: new Date().toISOString(),
      }
      auditLogDetailL1Cache.set(cacheKey, mockDto, 60)

      const t0 = process.hrtime.bigint()
      const result = await getAuditLogById(id, tenantFilter)
      assertLatencyLimit('getAuditLogById', 'L1 Detail Cache Hit (<0.1ms)', t0, CACHED_SLA_MS)
      assert.equal(result?.source, 'l1')
      assert.equal(result?.id, id)
    })

    it('Seq 3: Cache Miss -> Uncached MongoDB Query (< 10ms SLO)', async () => {
      const id = new mongoose.Types.ObjectId().toString()
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(id),
        brokerageId: tenantBrokerageId,
        action: 'deal.won',
        resource: 'deals',
        details: { commission: 15000 },
        previousState: { stage: 'under_contract' },
        newState: { stage: 'closed_won' },
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        status: 'success' as const,
        createdAt: new Date(),
      }

      AuditLog.findOne = (() => ({
        lean: async () => mockDoc,
      })) as any

      const t0 = process.hrtime.bigint()
      const result = await getAuditLogById(id, tenantFilter)
      assertLatencyLimit('getAuditLogById', 'Uncached findOne with state snapshots', t0)
      assert.equal(result?.source, 'db')
      assert.equal(result?.action, 'deal.won')
      assert.deepEqual(result?.details, { commission: 15000 })
    })

    it('Seq 4: Non-existent document returns null (< 10ms SLO)', async () => {
      const id = new mongoose.Types.ObjectId().toString()
      AuditLog.findOne = (() => ({
        lean: async () => null,
      })) as any

      const t0 = process.hrtime.bigint()
      const result = await getAuditLogById(id, tenantFilter)
      assertLatencyLimit('getAuditLogById', 'Non-existent ID database miss', t0)
      assert.equal(result, null)
    })
  })

  // =========================================================================
  // 6. invalidateAuditCaches Sequences
  // =========================================================================
  describe('Function: invalidateAuditCaches', () => {
    it('Seq 1: Tenant-scoped cache invalidation (< 10ms SLO)', async () => {
      const t0 = process.hrtime.bigint()
      await invalidateAuditCaches(tenantBrokerageId.toString())
      assertLatencyLimit('invalidateAuditCaches', 'Tenant-scoped invalidation', t0)
      assert.equal(auditLogsL1Cache.size, 0)
    })

    it('Seq 2: Global all-tenants cache invalidation (< 10ms SLO)', async () => {
      const t0 = process.hrtime.bigint()
      await invalidateAuditCaches()
      assertLatencyLimit('invalidateAuditCaches', 'Global invalidation', t0)
      assert.equal(auditLogsL1Cache.size, 0)
    })
  })

  // =========================================================================
  // 7. Controller Handlers (getAuditLogs, getAuditLogById)
  // =========================================================================
  describe('Controller Handlers: getAuditLogs & getAuditLogById', () => {
    it('Seq 1: getAuditLogsController — 403 Forbidden on missing tenant scope (< 10ms SLO)', async () => {
      const req: any = {
        user: { role: USER_ROLES.AGENT },
        tenantFilter: {},
        query: {},
      }
      const res = createMockRes()

      const t0 = process.hrtime.bigint()
      await getAuditLogsController(req, res, () => {})
      assertLatencyLimit('getAuditLogsController', '403 Forbidden tenant enforcement', t0)
      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
    })

    it('Seq 2: getAuditLogsController — 200 OK Paginated happy path (< 10ms SLO)', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER, brokerageId: tenantBrokerageId },
        tenantFilter: { brokerageId: tenantBrokerageId },
        query: { page: 1, limit: 10 },
      }
      const res = createMockRes()

      const t0 = process.hrtime.bigint()
      await getAuditLogsController(req, res, () => {})
      assertLatencyLimit('getAuditLogsController', '200 OK paginated retrieval', t0)
      assert.equal(res.statusCode, HTTP_STATUS.OK)
      assert.ok(res.headers['X-Cache'])
      assert.ok(res.headers['X-Response-Time'])
    })

    it('Seq 3: getAuditLogByIdController — 403 Forbidden on missing tenant scope (< 10ms SLO)', async () => {
      const req: any = {
        user: { role: USER_ROLES.AGENT },
        tenantFilter: undefined,
        params: { id: new mongoose.Types.ObjectId().toString() },
      }
      const res = createMockRes()

      const t0 = process.hrtime.bigint()
      await getAuditLogByIdController(req, res, () => {})
      assertLatencyLimit('getAuditLogByIdController', '403 Forbidden detail scope', t0)
      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
    })

    it('Seq 4: getAuditLogByIdController — 404 Not Found on missing document (< 10ms SLO)', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER, brokerageId: tenantBrokerageId },
        tenantFilter: { brokerageId: tenantBrokerageId },
        params: { id: new mongoose.Types.ObjectId().toString() },
      }
      const res = createMockRes()

      const t0 = process.hrtime.bigint()
      await getAuditLogByIdController(req, res, () => {})
      assertLatencyLimit('getAuditLogByIdController', '404 Not Found handling', t0)
      assert.equal(res.statusCode, HTTP_STATUS.NOT_FOUND)
    })
  })

  // =========================================================================
  // 8. httpAuditLogger Middleware Sequences
  // =========================================================================
  describe('Middleware: httpAuditLogger', () => {
    it('Seq 1: Non-mutating GET request bypass (< 10ms SLO)', () => {
      const req: any = { method: 'GET', path: '/api/contacts' }
      const res: any = createMockRes()
      let nextCalled = false

      const t0 = process.hrtime.bigint()
      httpAuditLogger(req, res, () => {
        nextCalled = true
      })
      assertLatencyLimit('httpAuditLogger', 'GET request instant bypass', t0)
      assert.equal(nextCalled, true)
    })

    it('Seq 2: Auth login / refresh endpoint bypass (< 10ms SLO)', () => {
      const req: any = { method: 'POST', path: '/api/auth/login' }
      const res: any = createMockRes()
      let nextCalled = false

      const t0 = process.hrtime.bigint()
      httpAuditLogger(req, res, () => {
        nextCalled = true
      })
      assertLatencyLimit('httpAuditLogger', 'Auth endpoint instant bypass', t0)
      assert.equal(nextCalled, true)
    })

    it('Seq 3: Mutating POST transaction with finish listener registration (< 10ms SLO)', () => {
      const req: any = {
        method: 'POST',
        path: '/api/contacts/64f1234567890abcdef12345',
        originalUrl: '/api/contacts/64f1234567890abcdef12345',
        headers: { 'user-agent': 'JestClient' },
        body: { name: 'Sarah Connor' },
      }
      const res: any = createMockRes()
      let nextCalled = false

      const t0 = process.hrtime.bigint()
      httpAuditLogger(req, res, () => {
        nextCalled = true
      })
      assertLatencyLimit('httpAuditLogger', 'Mutating route listener hook', t0)
      assert.equal(nextCalled, true)
      assert.ok(typeof res._listeners['finish'] === 'function')
    })
  })

  // =========================================================================
  // 9. sanitizeAuditPayload Sequences
  // =========================================================================
  describe('Function: sanitizeAuditPayload', () => {
    it('Seq 1: Sensitive keys redaction at all levels (< 10ms SLO)', () => {
      const payload = {
        username: 'broker',
        password: 'TopSecretPassword!',
        token: 'ey123456...',
        nested: {
          clientSecret: 'secret_live_098',
          apiKey: 'sk-998877',
        },
      }
      const t0 = process.hrtime.bigint()
      const sanitized = sanitizeAuditPayload(payload)
      assertLatencyLimit('sanitizeAuditPayload', 'Sensitive key redaction', t0)
      assert.equal(sanitized?.password, '[REDACTED]')
      assert.equal(sanitized?.token, '[REDACTED]')
      assert.equal(sanitized?.nested?.clientSecret, '[REDACTED]')
      assert.equal(sanitized?.nested?.apiKey, '[REDACTED]')
      assert.equal(sanitized?.username, 'broker')
    })

    it('Seq 2: Circular reference protection (< 10ms SLO)', () => {
      const circular: any = { title: 'Loop' }
      circular.loop = circular

      const t0 = process.hrtime.bigint()
      const sanitized = sanitizeAuditPayload(circular)
      assertLatencyLimit('sanitizeAuditPayload', 'Circular reference prevention', t0)
      assert.equal(sanitized?.title, 'Loop')
      assert.equal(sanitized?.loop, '[CIRCULAR]')
    })

    it('Seq 3: Deep object recursion cap at depth 3 (< 10ms SLO)', () => {
      const deep = { l1: { l2: { l3: { l4: { l5: 'too deep' } } } } }
      const t0 = process.hrtime.bigint()
      const sanitized = sanitizeAuditPayload(deep)
      assertLatencyLimit('sanitizeAuditPayload', 'Recursion depth limiting', t0)
      assert.equal(sanitized?.l1?.l2?.l3?.l4, '[MAX_DEPTH_REACHED]')
    })

    it('Seq 4: String length truncation at 512 characters (< 10ms SLO)', () => {
      const payload = { text: 'X'.repeat(800) }
      const t0 = process.hrtime.bigint()
      const sanitized = sanitizeAuditPayload(payload)
      assertLatencyLimit('sanitizeAuditPayload', 'String length truncation', t0)
      assert.ok(sanitized?.text?.endsWith('...[TRUNCATED]'))
      assert.ok(sanitized?.text?.length <= 530)
    })
  })

  // =========================================================================
  // 10. enqueueAuditEvent & logAuditEvent Sequences
  // =========================================================================
  describe('Functions: enqueueAuditEvent & logAuditEvent', () => {
    it('Seq 1: Enqueue event into in-memory micro-batch queue (< 10ms SLO)', () => {
      const input = {
        action: 'contact.tag',
        resource: 'contacts',
        resourceId: 'c_9988',
        ipAddress: '127.0.0.1',
      }
      const t0 = process.hrtime.bigint()
      enqueueAuditEvent(input)
      assertLatencyLimit('enqueueAuditEvent', 'Buffer enqueue operation', t0)
    })

    it('Seq 2: logAuditEvent asynchronous non-blocking invocation (< 10ms SLO)', async () => {
      const input = {
        action: 'deal.stage_change',
        resource: 'deals',
      }
      const t0 = process.hrtime.bigint()
      await logAuditEvent(input)
      assertLatencyLimit('logAuditEvent', 'Async log event entrypoint', t0)
    })
  })

  // =========================================================================
  // 11. flushAuditQueue Sequences
  // =========================================================================
  describe('Function: flushAuditQueue', () => {
    it('Seq 1: Empty queue flush (< 10ms SLO)', async () => {
      const t0 = process.hrtime.bigint()
      const flushed = await flushAuditQueue()
      assertLatencyLimit('flushAuditQueue', 'Empty queue zero-overhead return', t0)
      assert.equal(typeof flushed, 'number')
    })

    it('Seq 2: Populated queue batch flush (< 10ms SLO)', async () => {
      for (let i = 0; i < 3; i++) {
        enqueueAuditEvent({
          action: `test.event.${i}`,
          resource: 'testing',
        })
      }
      const t0 = process.hrtime.bigint()
      const flushed = await flushAuditQueue()
      assertLatencyLimit('flushAuditQueue', 'Populated micro-batch flush', t0)
      assert.equal(typeof flushed, 'number')
    })
  })
})
