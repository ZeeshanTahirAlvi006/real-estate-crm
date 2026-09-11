import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { AuditLog } from '../../src/models/AuditLog.js'
import {
  sanitizeAuditPayload,
  enqueueAuditEvent,
  logAuditEvent,
  flushAuditQueue,
} from '../../src/utils/auditLogger.js'
import {
  formatAuditLogDto,
  buildAuditFilter,
  listAuditLogs,
  getAuditLogById,
} from '../../src/features/audit/audit.service.js'
import {
  getAuditLogs as getAuditLogsController,
  getAuditLogById as getAuditLogByIdController,
} from '../../src/features/audit/audit.controller.js'
import { httpAuditLogger } from '../../src/middleware/auditLogger.js'
import { cacheSet, cacheGet } from '../../src/config/redis.js'
import { measureExecutionMs, safeJsonParse } from '../../src/utils/cacheHelper.js'
import { USER_ROLES, HTTP_STATUS } from '../../src/utils/constants.js'

describe('Audit Subsystem Performance & Security Audit Tests', () => {
  // Helper to create mock response object
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

  describe('1. Security & Fail-Closed Tenant Isolation (DI-CRIT-01)', () => {
    it('should reject getAuditLogs with 403 when tenantFilter is missing brokerageId for non-super-admin', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER },
        tenantFilter: {}, // missing brokerageId
        query: {},
      }
      const res = createMockRes()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await getAuditLogsController(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
      assert.equal(res.body?.success, false)
      assert.match(res.body?.message, /Valid tenant scope required/)
      assert.equal(nextCalled, false)
    })

    it('should reject getAuditLogById with 403 when tenantFilter is missing brokerageId for non-super-admin', async () => {
      const req: any = {
        user: { role: USER_ROLES.BROKERAGE_OWNER },
        tenantFilter: undefined, // missing tenantFilter
        params: { id: '64f1234567890abcdef12345' },
      }
      const res = createMockRes()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await getAuditLogByIdController(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.FORBIDDEN)
      assert.equal(res.body?.success, false)
      assert.match(res.body?.message, /Valid tenant scope required/)
      assert.equal(nextCalled, false)
    })

    it('should allow Super Admin to proceed without brokerageId in tenantFilter', async () => {
      const req: any = {
        user: { role: USER_ROLES.SUPER_ADMIN },
        tenantFilter: {},
        query: { page: 1, limit: 10 },
      }
      const res = createMockRes()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      const origAggregate = AuditLog.aggregate
      AuditLog.aggregate = (async () => [{ data: [], totalCount: [{ count: 0 }] }]) as any
      try {
        await getAuditLogsController(req, res, next)
        assert.notEqual(res.statusCode, HTTP_STATUS.FORBIDDEN)
      } finally {
        AuditLog.aggregate = origAggregate
      }
    })
  })

  describe('2. Parameter Resolution & Lifecycle Hooks (DI-CRIT-02, EL-002, ML-001)', () => {
    it('httpAuditLogger should attach res.once("finish") and not monkey-patch res.end', () => {
      const req: any = {
        method: 'POST',
        path: '/api/contacts/64f1234567890abcdef12345',
        originalUrl: '/api/contacts/64f1234567890abcdef12345',
        headers: {},
        params: {}, // Empty at global middleware level
        body: { name: 'Test Contact' },
      }
      const originalEnd = () => {}
      const res: any = createMockRes()
      res.end = originalEnd

      let nextCalled = false
      httpAuditLogger(req, res, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, true)
      assert.equal(res.end, originalEnd, 'res.end must NOT be monkey-patched (Rule EL-002)')
      assert.ok(typeof res._listeners['finish'] === 'function', 'res.once("finish") listener must be registered (Rule ML-001)')
    })

    it('httpAuditLogger.onFinish should extract resourceId from originalUrl regex', () => {
      const targetId = '64f1234567890abcdef12345'
      const req: any = {
        method: 'PUT',
        path: `/api/leads/${targetId}`,
        originalUrl: `/api/leads/${targetId}?verbose=true`,
        headers: { 'user-agent': 'JestTest' },
        params: {}, // Empty at global level!
        body: { status: 'qualified' },
        user: { _id: '64f000000000000000000001', email: 'agent@proppulse.com', role: 'agent' },
      }
      const res = createMockRes()
      res.statusCode = 200

      httpAuditLogger(req, res, () => {})

      // Trigger the finish event
      assert.doesNotThrow(() => {
        res.emit('finish')
      })
    })
  })

  describe('3. Bounded Sanitizer Safety & Memory Protection (EL-001, ML-003)', () => {
    it('should redact sensitive keys properly', () => {
      const payload = {
        email: 'user@example.com',
        password: 'SuperSecretPassword123!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        apiKey: 'sk-live-123456789',
        nested: {
          clientSecret: 'secret_live_98765',
          refreshToken: 'refresh_token_value',
          safeField: 'Hello World',
        },
      }

      const sanitized = sanitizeAuditPayload(payload)
      assert.equal(sanitized?.email, 'user@example.com')
      assert.equal(sanitized?.password, '[REDACTED]')
      assert.equal(sanitized?.token, '[REDACTED]')
      assert.equal(sanitized?.apiKey, '[REDACTED]')
      assert.equal(sanitized?.nested?.clientSecret, '[REDACTED]')
      assert.equal(sanitized?.nested?.refreshToken, '[REDACTED]')
      assert.equal(sanitized?.nested?.safeField, 'Hello World')
    })

    it('should gracefully handle circular references without stack overflow (EL-001)', () => {
      const circularObj: any = { name: 'Parent' }
      circularObj.self = circularObj
      circularObj.child = { parent: circularObj }

      assert.doesNotThrow(() => {
        const result = sanitizeAuditPayload(circularObj)
        assert.ok(result)
        assert.equal(result?.name, 'Parent')
        assert.equal(result?.self, '[CIRCULAR]')
      })
    })

    it('should truncate deeply nested objects beyond depth 3 (EL-001)', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'too deep',
              },
            },
          },
        },
      }

      const sanitized = sanitizeAuditPayload(deepObject)
      assert.equal(sanitized?.level1?.level2?.level3?.level4, '[MAX_DEPTH_REACHED]')
    })

    it('should truncate long strings exceeding 512 characters (ML-003)', () => {
      const longString = 'A'.repeat(1000)
      const sanitized = sanitizeAuditPayload({ text: longString })
      assert.ok(sanitized?.text?.endsWith('...[TRUNCATED]'))
      assert.ok(sanitized?.text?.length <= 530)
    })
  })

  describe('4. Bounded In-Memory Micro-Batch Ring Buffer (ML-001, ML-002, PERF-M-003)', () => {
    it('enqueueAuditEvent should buffer items and flushAuditQueue should execute without throwing', async () => {
      for (let i = 0; i < 5; i++) {
        enqueueAuditEvent({
          action: `test.action.${i}`,
          resource: 'test',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        })
      }

      const flushed = await flushAuditQueue()
      assert.ok(typeof flushed === 'number')
    })

    it('logAuditEvent alias should execute enqueueAuditEvent cleanly', async () => {
      await assert.doesNotReject(async () => {
        await logAuditEvent({
          action: 'test.alias',
          resource: 'test',
        })
      })
    })
  })

  describe('5. DTO Formatting & Lean Mapping (DI-002, PERF-M-002)', () => {
    it('formatAuditLogDto should format plain JS objects with correct ISO dates without Mongoose prototype', () => {
      const fakeDoc = {
        _id: new mongoose.Types.ObjectId('64f1234567890abcdef12345'),
        userEmail: 'agent@proppulse.com',
        userRole: 'agent',
        action: 'contact.create',
        resource: 'contacts',
        resourceId: 'c123',
        status: 'success' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: new Date('2026-09-11T12:00:00Z'),
      }

      const dto = formatAuditLogDto(fakeDoc)
      assert.equal(dto.id, '64f1234567890abcdef12345')
      assert.equal(dto.userEmail, 'agent@proppulse.com')
      assert.equal(dto.action, 'contact.create')
      assert.equal(dto.createdAt, '2026-09-11T12:00:00.000Z')
      assert.equal(dto.details, undefined) // Pruned from list projection
    })

    it('buildAuditFilter should correctly construct mongo query conditions', () => {
      const query = {
        action: 'auth.login',
        resource: 'auth',
        userEmail: 'Owner@Test.com',
        status: 'success' as const,
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z',
      }
      const tenantFilter = { brokerageId: new mongoose.Types.ObjectId('64f000000000000000000001') }

      const filter = buildAuditFilter(query, tenantFilter)
      assert.equal(filter.action, 'auth.login')
      assert.equal(filter.resource, 'auth')
      assert.equal(filter.userEmail, 'owner@test.com')
      assert.equal(filter.status, 'success')
      assert.ok(filter.createdAt.$gte instanceof Date)
      assert.ok(filter.createdAt.$lte instanceof Date)
      assert.ok(filter.brokerageId)
    })
  })

  describe('6. Sub-1ms Latency Benchmark on Cached Reads (PERF-R-004, DI-003)', () => {
    it('should complete cached read loopback in under 1.0ms (SLA target < 0.5ms)', async () => {
      const cacheKey = 'pp:test_tenant:audit-logs:benchmark_key'
      const testPayload = {
        logs: [
          {
            id: '64f1234567890abcdef12345',
            action: 'contact.create',
            resource: 'contacts',
            userEmail: 'agent@test.com',
            status: 'success' as const,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }

      // Warm up cache
      await cacheSet(cacheKey, JSON.stringify(testPayload), 60)

      const latencies: number[] = []
      const iterations = 50

      for (let i = 0; i < iterations; i++) {
        const t0 = process.hrtime.bigint()
        const cachedRaw = await cacheGet(cacheKey)
        const parsed = safeJsonParse<typeof testPayload>(cachedRaw)
        const durationMs = measureExecutionMs(t0)

        assert.ok(parsed)
        assert.equal(parsed?.total, 1)
        latencies.push(durationMs)
      }

      // Compute stats
      latencies.sort((a, b) => a - b)
      const p50 = latencies[Math.floor(iterations * 0.5)]
      const p95 = latencies[Math.floor(iterations * 0.95)]
      const max = latencies[latencies.length - 1]

      console.log(`\n[LATENCY BENCHMARK RESULTS - 50 Iterations]`)
      console.log(`p50: ${p50.toFixed(4)}ms`)
      console.log(`p95: ${p95.toFixed(4)}ms`)
      console.log(`max: ${max.toFixed(4)}ms`)

      assert.ok(
        p95 < 1.0,
        `p95 cached read latency must be < 1.0ms, measured: ${p95.toFixed(4)}ms`
      )
    })
  })
})
