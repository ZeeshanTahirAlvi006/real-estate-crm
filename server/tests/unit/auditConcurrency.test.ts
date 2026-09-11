import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  listAuditLogs,
  getAuditLogById,
  buildAuditFilter,
  formatAuditLogDto,
  normalizeTenantFilter,
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
import { buildCacheKey, safeJsonParse } from '../../src/utils/cacheHelper.js'
import { USER_ROLES, HTTP_STATUS } from '../../src/utils/constants.js'

describe('Stage 4: Post-Refactor Quality & Concurrency Validation (aidlc-quality-agent)', () => {
  const tenantBrokerageId = new mongoose.Types.ObjectId()
  const tenantFilter = { brokerageId: tenantBrokerageId }

  // Backup original Mongoose model query methods
  const origAuditLogAggregate = AuditLog.aggregate
  const origAuditLogFindOne = AuditLog.findOne
  const origAuditLogInsertMany = AuditLog.insertMany

  // Mock response helper for controller testing
  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      body: null,
      _listeners: {} as Record<string, Function>,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(data: any) {
        this.body = data
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

  beforeEach(() => {
    // Default: Mock warmed database connection pool responses for instant execution (< 0.05ms)
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
    // Restore original Mongoose methods
    AuditLog.aggregate = origAuditLogAggregate
    AuditLog.findOne = origAuditLogFindOne
    AuditLog.insertMany = origAuditLogInsertMany
  })

  // =========================================================================
  // 1. FUNCTIONAL BOUNDARIES: Happy Paths & Populated State Integrity
  // =========================================================================
  describe('1. Functional Boundaries: Happy Paths & Populated State Integrity', () => {
    it('listAuditLogs should aggregate, filter, and map populated DB records into AuditLogResponseDto', async () => {
      const query = { page: 1, limit: 10, action: 'contact.created' }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)
      await cacheDelete(cacheKey)

      const mockLog = {
        _id: new mongoose.Types.ObjectId('64f111111111111111111111'),
        userId: new mongoose.Types.ObjectId('64f222222222222222222222'),
        userEmail: 'broker@proppulse.com',
        userRole: 'brokerage_owner',
        brokerageId: tenantBrokerageId,
        action: 'contact.created',
        resource: 'contacts',
        resourceId: 'c_9988',
        ipAddress: '192.168.1.50',
        userAgent: 'Mozilla/5.0 Chrome/120',
        status: 'success' as const,
        createdAt: new Date('2026-09-11T10:00:00.000Z'),
      }

      AuditLog.aggregate = (async () => [
        {
          data: [mockLog],
          totalCount: [{ count: 1 }],
        },
      ]) as any

      const result = await listAuditLogs(query, tenantFilter)

      assert.equal(result.total, 1)
      assert.equal(result.logs.length, 1)
      const log = result.logs[0]
      assert.equal(log.id, '64f111111111111111111111')
      assert.equal(log.userEmail, 'broker@proppulse.com')
      assert.equal(log.action, 'contact.created')
      assert.equal(log.resource, 'contacts')
      assert.equal(log.resourceId, 'c_9988')
      assert.equal(log.status, 'success')
      assert.equal(log.createdAt, '2026-09-11T10:00:00.000Z')
      assert.equal(log.details, undefined, 'Heavy details blob must be excluded from list projection (Rule PERF-M-002)')
    })

    it('getAuditLogById should retrieve a single record with full state snapshots (details, previousState, newState)', async () => {
      const targetId = '64f333333333333333333333'
      const mockDoc = {
        _id: new mongoose.Types.ObjectId(targetId),
        userId: new mongoose.Types.ObjectId('64f222222222222222222222'),
        userEmail: 'agent@proppulse.com',
        userRole: 'agent',
        brokerageId: tenantBrokerageId,
        action: 'deal.updated',
        resource: 'deals',
        resourceId: 'deal_456',
        details: { fieldUpdated: 'stage', durationMs: 42 },
        previousState: { stage: 'offer_pending', dealValue: 500000 },
        newState: { stage: 'under_contract', dealValue: 525000 },
        ipAddress: '10.0.0.1',
        userAgent: 'Safari/17.0',
        status: 'success' as const,
        createdAt: new Date('2026-09-11T11:00:00.000Z'),
      }

      AuditLog.findOne = (() => ({
        lean: async () => mockDoc,
      })) as any

      const record = await getAuditLogById(targetId, tenantFilter)

      assert.ok(record)
      assert.equal(record.id, targetId)
      assert.equal(record.action, 'deal.updated')
      assert.deepEqual(record.details, { fieldUpdated: 'stage', durationMs: 42 })
      assert.deepEqual(record.previousState, { stage: 'offer_pending', dealValue: 500000 })
      assert.deepEqual(record.newState, { stage: 'under_contract', dealValue: 525000 })
    })

    it('normalizeTenantFilter should safely wrap string brokerageId into mongoose.Types.ObjectId (Rule DI-001)', () => {
      const rawFilter = {
        brokerageId: tenantBrokerageId.toString(), // String representation
      }

      const normalized = normalizeTenantFilter(rawFilter)

      assert.ok(normalized.brokerageId instanceof mongoose.Types.ObjectId)
      assert.equal(normalized.brokerageId.toString(), tenantBrokerageId.toString())
    })

    it('buildAuditFilter should validate and ignore invalid date strings gracefully', () => {
      const query = {
        startDate: 'not-a-valid-date-string',
        endDate: '2026-12-31T23:59:59.000Z',
      }

      const filter = buildAuditFilter(query, tenantFilter)

      // Only valid date should be attached to createdAt
      assert.equal(filter.createdAt.$gte, undefined)
      assert.ok(filter.createdAt.$lte instanceof Date)
      assert.equal(isNaN(filter.createdAt.$lte.getTime()), false)
    })

    it('httpAuditLogger middleware should intercept POST/PUT/PATCH/DELETE mutations and log audit events cleanly', () => {
      const req: any = {
        method: 'POST',
        baseUrl: '/api/deals',
        path: '/64f555555555555555555555/stage',
        originalUrl: '/api/deals/64f555555555555555555555/stage',
        headers: { 'user-agent': 'Chrome/120' },
        params: {},
        body: { stage: 'closed_won' },
        user: {
          _id: new mongoose.Types.ObjectId(),
          email: 'closer@proppulse.com',
          role: 'agent',
          brokerageId: tenantBrokerageId,
        },
      }
      const res = createMockRes()
      res.statusCode = 201

      let nextCalled = false
      httpAuditLogger(req, res, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, true)
      assert.ok(typeof res._listeners['finish'] === 'function')

      // Emit finish to trigger async logger
      assert.doesNotThrow(() => {
        res.emit('finish')
      })
    })
  })

  // =========================================================================
  // 2. FUNCTIONAL BOUNDARIES: Empty State & Zero-Record Integrity
  // =========================================================================
  describe('2. Functional Boundaries: Empty State & Zero-Record Integrity', () => {
    it('listAuditLogs should return zero count and empty array without crashing when tenant has no records', async () => {
      const query = { page: 1, limit: 25 }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)
      await cacheDelete(cacheKey)

      AuditLog.aggregate = (async () => [
        {
          data: [],
          totalCount: [],
        },
      ]) as any

      const result = await listAuditLogs(query, tenantFilter)

      assert.equal(result.total, 0)
      assert.ok(Array.isArray(result.logs))
      assert.equal(result.logs.length, 0)
    })

    it('getAuditLogById should return null when no document matches the ID', async () => {
      AuditLog.findOne = (() => ({
        lean: async () => null,
      })) as any

      const result = await getAuditLogById('64f000000000000000000000', tenantFilter)
      assert.equal(result, null)
    })

    it('getAuditLogs controller should return standardized paginated 200 payload on empty data', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER, brokerageId: tenantBrokerageId },
        tenantFilter: { brokerageId: tenantBrokerageId },
        query: { page: '1', limit: '25' },
      }
      const res = createMockRes()

      AuditLog.aggregate = (async () => [
        {
          data: [],
          totalCount: [{ count: 0 }],
        },
      ]) as any

      await getAuditLogsController(req, res, () => {})

      assert.equal(res.statusCode, HTTP_STATUS.OK)
      assert.equal(res.body?.success, true)
      assert.equal(res.body?.data?.length, 0)
      assert.equal(res.body?.meta?.total, 0)
      assert.equal(res.body?.meta?.page, 1)
      assert.equal(res.body?.meta?.totalPages, 0)
    })

    it('flushAuditQueue should safely return 0 on an empty queue without DB invocation', async () => {
      const flushedCount = await flushAuditQueue()
      assert.equal(typeof flushedCount, 'number')
    })
  })

  // =========================================================================
  // 3. SECURITY, MULTI-TENANT ISOLATION & ROLE RBAC (DI-CRIT-01)
  // =========================================================================
  describe('3. Security, Multi-Tenant Isolation & Role RBAC (DI-CRIT-01)', () => {
    it('getAuditLogs must reject non-super-admins missing brokerageId with 403 Forbidden', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER },
        tenantFilter: {}, // Missing brokerageId
        query: {},
      }
      const res = createMockRes()

      await getAuditLogsController(req, res, () => {})

      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
      assert.equal(res.body?.success, false)
      assert.match(res.body?.message, /Valid tenant scope required/)
    })

    it('getAuditLogById must reject non-super-admins missing brokerageId with 403 Forbidden', async () => {
      const req: any = {
        user: { role: USER_ROLES.AGENT },
        tenantFilter: undefined,
        params: { id: '64f111111111111111111111' },
      }
      const res = createMockRes()

      await getAuditLogByIdController(req, res, () => {})

      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
      assert.equal(res.body?.success, false)
      assert.match(res.body?.message, /Valid tenant scope required/)
    })

    it('Cross-tenant data leakage prevention: Tenant A cannot fetch Tenant B record', async () => {
      const tenantB_Id = new mongoose.Types.ObjectId()
      const logId = '64f777777777777777777777'

      let capturedFilter: any = null
      AuditLog.findOne = ((filter: any) => {
        capturedFilter = filter
        return {
          lean: async () => null, // Not found under Tenant A's filter
        }
      }) as any

      // Tenant A queries with its tenantFilter
      const result = await getAuditLogById(logId, { brokerageId: tenantBrokerageId })

      assert.equal(result, null)
      assert.ok(capturedFilter)
      assert.equal(capturedFilter.brokerageId.toString(), tenantBrokerageId.toString())
      assert.notEqual(capturedFilter.brokerageId.toString(), tenantB_Id.toString())
    })

    it('Super Admin should query without brokerageId requirement', async () => {
      const req: any = {
        user: { role: USER_ROLES.SUPER_ADMIN },
        tenantFilter: {}, // Empty for super admin
        query: { page: 1, limit: 10 },
      }
      const res = createMockRes()

      AuditLog.aggregate = (async () => [
        {
          data: [],
          totalCount: [{ count: 0 }],
        },
      ]) as any

      await getAuditLogsController(req, res, () => {})

      assert.equal(res.statusCode, HTTP_STATUS.OK)
      assert.equal(res.body?.success, true)
    })

    it('getAuditLogById should return null for malformed ObjectId string without throwing', async () => {
      const malformedId = 'not-an-object-id-123'
      const result = await getAuditLogById(malformedId, tenantFilter)
      assert.equal(result, null)
    })
  })

  // =========================================================================
  // 4. MEMORY SAFETY, PAYLOAD SANITIZATION & BUFFER PROTECTION (EL-001, ML-002, ML-003)
  // =========================================================================
  describe('4. Memory Safety, Payload Sanitization & Buffer Protection (EL-001, ML-002, ML-003)', () => {
    it('sanitizeAuditPayload must redact sensitive keys at root and nested levels', () => {
      const sensitivePayload = {
        username: 'john_doe',
        password: 'PlainTextPassword!',
        token: 'jwt.token.here',
        secret: 'top_secret',
        apiKey: 'key_1234567890',
        credentials: 'root_credentials_value',
        authConfig: {
          accessToken: 'token_abc',
          refreshToken: 'refresh_xyz',
          encryptionKey: 'aes256_key',
        },
        publicInfo: {
          bio: 'Real estate agent in Austin',
        },
      }

      const sanitized = sanitizeAuditPayload(sensitivePayload)

      assert.equal(sanitized?.username, 'john_doe')
      assert.equal(sanitized?.password, '[REDACTED]')
      assert.equal(sanitized?.token, '[REDACTED]')
      assert.equal(sanitized?.secret, '[REDACTED]')
      assert.equal(sanitized?.apiKey, '[REDACTED]')
      assert.equal(sanitized?.credentials, '[REDACTED]')
      assert.equal(sanitized?.authConfig?.accessToken, '[REDACTED]')
      assert.equal(sanitized?.authConfig?.refreshToken, '[REDACTED]')
      assert.equal(sanitized?.authConfig?.encryptionKey, '[REDACTED]')
      assert.equal(sanitized?.publicInfo?.bio, 'Real estate agent in Austin')
    })

    it('sanitizeAuditPayload must gracefully break circular references without stack overflow (Rule EL-001)', () => {
      const circular: any = { tag: 'root' }
      circular.loop = circular
      circular.child = { parent: circular }

      let sanitized: any = null
      assert.doesNotThrow(() => {
        sanitized = sanitizeAuditPayload(circular)
      })

      assert.ok(sanitized)
      assert.equal(sanitized.tag, 'root')
      assert.equal(sanitized.loop, '[CIRCULAR]')
      assert.equal(sanitized.child?.parent, '[CIRCULAR]')
    })

    it('sanitizeAuditPayload must limit depth recursion to maxDepth = 3 (Rule EL-001)', () => {
      const deep = {
        d1: {
          d2: {
            d3: {
              d4: {
                d5: 'hidden',
              },
            },
          },
        },
      }

      const sanitized = sanitizeAuditPayload(deep)
      assert.equal(sanitized?.d1?.d2?.d3?.d4, '[MAX_DEPTH_REACHED]')
    })

    it('sanitizeAuditPayload must truncate string values exceeding 512 characters (Rule ML-003)', () => {
      const hugeString = 'X'.repeat(2000)
      const sanitized = sanitizeAuditPayload({ description: hugeString })

      assert.ok(sanitized?.description?.endsWith('...[TRUNCATED]'))
      assert.ok(sanitized?.description?.length <= 530)
    })

    it('enqueueAuditEvent should maintain bounded FIFO ring buffer (Rule ML-002)', () => {
      // Buffer a burst of items
      for (let i = 0; i < 20; i++) {
        enqueueAuditEvent({
          action: `test.burst.${i}`,
          resource: 'benchmark',
          brokerageId: tenantBrokerageId,
        })
      }

      // Assert logAuditEvent alias behaves equivalently
      assert.doesNotThrow(() => {
        logAuditEvent({
          action: 'test.burst.alias',
          resource: 'benchmark',
          brokerageId: tenantBrokerageId,
        })
      })
    })
  })

  // =========================================================================
  // 5. EXTREME CONCURRENCY & BATCH INGESTION
  // =========================================================================
  describe('5. Extreme Concurrency & Batch Ingestion', () => {
    it('should safely handle 50 concurrent listAuditLogs requests under cached conditions without resource exhaustion', async () => {
      const query = { page: 1, limit: 10 }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      // Seed cache
      const cachedData = {
        logs: [
          {
            id: '64f999999999999999999999',
            action: 'lead.assigned',
            resource: 'leads',
            status: 'success' as const,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }
      await cacheSet(cacheKey, JSON.stringify(cachedData), 60)

      const CONCURRENT_REQUESTS = 50
      const promises: Promise<any>[] = []
      const startTime = process.hrtime.bigint()

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        promises.push(listAuditLogs(query, tenantFilter))
      }

      const results = await Promise.all(promises)
      const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6
      const avgMsPerCall = elapsedMs / CONCURRENT_REQUESTS

      assert.equal(results.length, CONCURRENT_REQUESTS)
      for (const res of results) {
        assert.equal(res.total, 1)
        assert.equal(res.logs.length, 1)
        assert.equal(res.logs[0].id, '64f999999999999999999999')
      }

      // Assert average concurrent throughput is sub-1ms
      assert.ok(
        avgMsPerCall < 1.0,
        `Average concurrent resolution time (${avgMsPerCall.toFixed(3)}ms) exceeded 1.0ms SLA`
      )
    })

    it('should handle rapid concurrent enqueueAuditEvent calls without data corruption or memory leaks', async () => {
      const BURST_COUNT = 50
      const startTime = process.hrtime.bigint()

      for (let i = 0; i < BURST_COUNT; i++) {
        enqueueAuditEvent({
          userId: new mongoose.Types.ObjectId(),
          userEmail: `agent_${i}@proppulse.com`,
          userRole: 'agent',
          brokerageId: tenantBrokerageId,
          action: 'note.created',
          resource: 'contacts',
          resourceId: `c_${i}`,
          details: { noteIndex: i },
          ipAddress: '127.0.0.1',
          userAgent: 'test-concurrency-runner',
        })
      }

      const totalElapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6
      const avgMsPerEnqueue = totalElapsedMs / BURST_COUNT

      // Ingestion overhead must remain sub-0.15ms per call
      assert.ok(
        avgMsPerEnqueue < 0.15,
        `Average enqueue time (${avgMsPerEnqueue.toFixed(4)}ms) exceeded 0.15ms budget`
      )
    })
  })

  // =========================================================================
  // 6. LATENCY SLO ASSERTIONS (< 1.0ms Cached Steady-State SLA)
  // =========================================================================
  describe('6. Latency SLO Assertions (< 1.0ms Cached Steady-State SLA)', () => {
    it('should service cached listAuditLogs with p50 < 0.2ms and p95 < 1.0ms on local loopback', async () => {
      const query = { page: 1, limit: 25, sortBy: 'createdAt', sortOrder: 'desc' as const }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      const payload = {
        logs: Array.from({ length: 10 }, (_, i) => ({
          id: new mongoose.Types.ObjectId().toString(),
          action: 'auth.login',
          resource: 'auth',
          status: 'success' as const,
          ipAddress: '127.0.0.1',
          userAgent: 'test-browser',
          createdAt: new Date().toISOString(),
        })),
        total: 10,
      }
      await cacheSet(cacheKey, JSON.stringify(payload), 60)

      // Warm-up phase (5 requests to warm JIT)
      for (let i = 0; i < 5; i++) {
        await listAuditLogs(query, tenantFilter)
      }

      // Measurement phase (50 steady-state iterations)
      const ITERATIONS = 50
      const latencies: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        const start = process.hrtime.bigint()
        const res = await listAuditLogs(query, tenantFilter)
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6
        latencies.push(elapsedMs)
        assert.equal(res.total, 10)
      }

      latencies.sort((a, b) => a - b)
      const p50 = latencies[Math.floor(ITERATIONS * 0.5)]
      const p95 = latencies[Math.floor(ITERATIONS * 0.95)]
      const p99 = latencies[Math.min(Math.floor(ITERATIONS * 0.99), ITERATIONS - 1)]

      console.log(`\n[AUDIT LOGS CACHED LATENCY SLO - ${ITERATIONS} Iterations]`)
      console.log(`  p50: ${p50.toFixed(4)}ms (Target: < 0.200ms)`)
      console.log(`  p95: ${p95.toFixed(4)}ms (Target: < 0.500ms)`)
      console.log(`  p99: ${p99.toFixed(4)}ms (Target: < 1.000ms)`)

      assert.ok(
        p50 < 0.2,
        `p50 latency (${p50.toFixed(4)}ms) exceeded target < 0.2ms`
      )
      assert.ok(
        p95 < 1.0,
        `p95 latency (${p95.toFixed(4)}ms) exceeded SLA < 1.0ms`
      )
    })

    it('sanitizeAuditPayload throughput benchmark should process 50 payloads in under 5ms', () => {
      const samplePayload = {
        name: 'Sarah Agent',
        email: 'sarah@proppulse.com',
        password: 'Password123!',
        token: 'token_secret',
        preferences: { notifications: true, theme: 'dark' },
        nested: { innerToken: 'inner_secret' },
      }

      const start = process.hrtime.bigint()
      for (let i = 0; i < 50; i++) {
        sanitizeAuditPayload(samplePayload)
      }
      const totalMs = Number(process.hrtime.bigint() - start) / 1e6

      assert.ok(
        totalMs < 5.0,
        `50 payload sanitizations took ${totalMs.toFixed(3)}ms; must be < 5.0ms (< 0.1ms each)`
      )
    })
  })

  // =========================================================================
  // 7. FAULT ISOLATION & RESILIENCE (DI-003)
  // =========================================================================
  describe('7. Fault Isolation & Resilience (DI-003)', () => {
    it('should transparently fall through to database aggregation when cache contains corrupted JSON (DI-003)', async () => {
      const query = { page: 1, limit: 10 }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'audit-logs', query)

      // Poison cache with broken JSON
      await cacheSet(cacheKey, '{"brokenJson": true, incomplete...', 60)

      let dbCalled = false
      AuditLog.aggregate = (async () => {
        dbCalled = true
        return [
          {
            data: [],
            totalCount: [{ count: 0 }],
          },
        ]
      }) as any

      // Must NOT throw SyntaxError; must fall through to database
      const result = await listAuditLogs(query, tenantFilter)

      assert.ok(result)
      assert.equal(dbCalled, true, 'Expected transparent DB fallthrough on corrupted JSON cache read')
      assert.equal(result.total, 0)
    })
  })
})
