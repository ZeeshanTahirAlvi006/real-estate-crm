import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Brokerage } from '../../src/models/Brokerage.js'
import { IUser } from '../../src/models/User.js'
import {
  listAllBrokerages,
  getBrokerageDetail,
  brokeragesL1Cache,
  brokerageDetailL1Cache,
  invalidateBrokerageCaches,
} from '../../src/features/brokerages/brokerage.service.js'
import {
  getDetail,
  create,
  update,
  remove,
} from '../../src/features/brokerages/brokerage.controller.js'
import { verifyBrokerageAccess } from '../../src/middleware/tenantScope.js'
import { listBrokeragesQuerySchema } from '../../src/features/brokerages/brokerage.validators.js'
import { buildCacheKey } from '../../src/utils/cacheHelper.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'

// Mock Response Factory
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
  return res
}

describe('Brokerage Sub-1ms Performance & Architectural Resilience Tests', () => {
  beforeEach(() => {
    brokeragesL1Cache.clear()
    brokerageDetailL1Cache.clear()
  })

  describe('1. Hanging Connection Bug Fix & Controller Immunization', () => {
    it('getDetail should immediately return HTTP 401 when req.user is missing (no hanging socket)', async () => {
      const req: any = { user: undefined, params: { id: '64f1234567890abcdef12345' } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await getDetail(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('create should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, body: { name: 'Acme Brokerage' }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await create(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('update should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: '64f1234567890abcdef12345' }, body: { name: 'Updated' }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await update(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('remove should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: '64f1234567890abcdef12345' }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await remove(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })
  })

  describe('2. Multi-Tenant Null Pointer Immunization (tenantScope)', () => {
    it('verifyBrokerageAccess should safely return false when user.brokerageId is undefined (no TypeError)', () => {
      const userWithoutBrokerage = {
        role: USER_ROLES.AGENT,
        brokerageId: undefined,
      } as unknown as IUser

      const targetBrokerageId = new mongoose.Types.ObjectId()
      assert.doesNotThrow(() => {
        const hasAccess = verifyBrokerageAccess(userWithoutBrokerage, targetBrokerageId)
        assert.equal(hasAccess, false)
      })
    })

    it('verifyBrokerageAccess should safely return false when resourceBrokerageId is null or empty', () => {
      const user = {
        role: USER_ROLES.AGENT,
        brokerageId: new mongoose.Types.ObjectId(),
      } as unknown as IUser

      assert.doesNotThrow(() => {
        const hasAccess = verifyBrokerageAccess(user, null as any)
        assert.equal(hasAccess, false)
      })
    })

    it('verifyBrokerageAccess should grant universal access to super_admin even without brokerageId', () => {
      const superAdmin = {
        role: USER_ROLES.SUPER_ADMIN,
        brokerageId: undefined,
      } as unknown as IUser

      const targetBrokerageId = new mongoose.Types.ObjectId()
      const hasAccess = verifyBrokerageAccess(superAdmin, targetBrokerageId)
      assert.equal(hasAccess, true)
    })

    it('verifyBrokerageAccess should match correctly when user.brokerageId matches resourceBrokerageId', () => {
      const brokerageId = new mongoose.Types.ObjectId()
      const owner = {
        role: USER_ROLES.BROKERAGE_OWNER,
        brokerageId,
      } as unknown as IUser

      assert.equal(verifyBrokerageAccess(owner, brokerageId), true)
      assert.equal(verifyBrokerageAccess(owner, brokerageId.toString()), true)
      assert.equal(verifyBrokerageAccess(owner, new mongoose.Types.ObjectId()), false)
    })
  })

  describe('3. Strict ObjectId Validation (DI-001)', () => {
    it('getBrokerageDetail should reject invalid ObjectId string with 404', async () => {
      const caller = {
        role: USER_ROLES.SUPER_ADMIN,
      } as IUser

      await assert.rejects(
        async () => {
          await getBrokerageDetail('invalid-id-string', caller)
        },
        {
          message: 'Brokerage not found',
          statusCode: HTTP_STATUS.NOT_FOUND,
        }
      )
    })
  })

  describe('4. Compound Covering Indexes Verification (PERF-M-001)', () => {
    it('Brokerage schema must include compound index on { isActive: 1, createdAt: -1 }', () => {
      const indexes = Brokerage.schema.indexes()
      const hasCompoundIndex = indexes.some(([fields]) => {
        return fields.isActive === 1 && fields.createdAt === -1
      })
      assert.ok(
        hasCompoundIndex,
        'Expected Brokerage schema to have compound index on { isActive: 1, createdAt: -1 }'
      )
    })

    it('Brokerage schema must include sort index on { createdAt: -1 }', () => {
      const indexes = Brokerage.schema.indexes()
      const hasSortIndex = indexes.some(([fields]) => {
        return fields.createdAt === -1 && Object.keys(fields).length === 1
      })
      assert.ok(
        hasSortIndex,
        'Expected Brokerage schema to have sort index on { createdAt: -1 }'
      )
    })

    it('Brokerage subdomain must enforce uniqueness and sparse indexing', () => {
      const subdomainConfig = (Brokerage.schema.paths as any).subdomain
      assert.ok(subdomainConfig, 'Expected subdomain path to exist on schema')
      assert.equal(subdomainConfig._index?.unique, true)
      assert.equal(subdomainConfig._index?.sparse, true)
    })
  })

  describe('5. Two-Tier Caching & Sub-1ms Read Performance SLO', () => {
    it('listAllBrokerages should serve repeat queries from L1 cache in < 1.0ms', async () => {
      const cacheKey = buildCacheKey('global', 'brokerages', {
        page: 1,
        limit: 25,
        search: '',
        isActive: 'all',
      })

      const mockPayload = {
        brokerages: [
          {
            id: '64f1234567890abcdef12345',
            name: 'Apex Realty',
            subdomain: 'apex',
            plan: 'growth' as const,
            timezone: 'America/New_York',
            isActive: true,
            memberCount: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        total: 1,
      }

      // Pre-warm L1 cache
      brokeragesL1Cache.set(cacheKey, mockPayload, 60)

      const t0 = process.hrtime.bigint()
      const result = await listAllBrokerages({ page: 1, limit: 25 })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.source, 'l1')
      assert.equal(result.total, 1)
      assert.equal(result.brokerages.length, 1)
      assert.equal(result.brokerages[0].name, 'Apex Realty')
      assert.ok(elapsedMs < 1.0, `Expected L1 cache hit in < 1.0ms, got ${elapsedMs.toFixed(3)}ms`)
    })

    it('getBrokerageDetail should serve repeat queries from L1 cache in < 1.0ms', async () => {
      const callerId = new mongoose.Types.ObjectId()
      const brokerageId = new mongoose.Types.ObjectId().toString()
      const caller = {
        _id: callerId,
        role: USER_ROLES.SUPER_ADMIN,
      } as IUser

      const cacheKey = buildCacheKey(brokerageId, 'brokerage', { id: brokerageId })
      const mockBrokerage = {
        id: brokerageId,
        name: 'Prime Properties',
        subdomain: 'prime',
        plan: 'pro' as const,
        timezone: 'America/New_York',
        isActive: true,
        memberCount: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Pre-warm detail L1 cache
      brokerageDetailL1Cache.set(cacheKey, mockBrokerage, 60)

      const t0 = process.hrtime.bigint()
      const result = await getBrokerageDetail(brokerageId, caller)
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.source, 'l1')
      assert.equal(result.brokerage.name, 'Prime Properties')
      assert.equal(result.brokerage.memberCount, 12)
      assert.ok(elapsedMs < 1.0, `Expected detail L1 cache hit in < 1.0ms, got ${elapsedMs.toFixed(3)}ms`)
    })
  })

  describe('6. Deterministic Cache Invalidation', () => {
    it('invalidateBrokerageCaches should clear L1 cache entries', async () => {
      const listKey = buildCacheKey('global', 'brokerages', { page: 1, limit: 25, search: '', isActive: 'all' })
      const detailKey = buildCacheKey('b123', 'brokerage', { id: 'b123' })

      brokeragesL1Cache.set(listKey, { brokerages: [], total: 0 }, 60)
      brokerageDetailL1Cache.set(detailKey, {} as any, 60)

      assert.ok(brokeragesL1Cache.has(listKey))
      assert.ok(brokerageDetailL1Cache.has(detailKey))

      await invalidateBrokerageCaches('b123')

      assert.equal(brokeragesL1Cache.has(listKey), false)
      assert.equal(brokerageDetailL1Cache.has(detailKey), false)
    })
  })

  describe('7. Query Validation & Bounded Pagination (PERF-M-002)', () => {
    it('listBrokeragesQuerySchema should clamp limit to maximum 100', () => {
      const parsed = listBrokeragesQuerySchema.parse({ page: '1', limit: '500' })
      assert.equal(parsed.page, 1)
      assert.equal(parsed.limit, 100)
    })

    it('listBrokeragesQuerySchema should parse valid page and limit defaults', () => {
      const parsed = listBrokeragesQuerySchema.parse({})
      assert.equal(parsed.page, 1)
      assert.equal(parsed.limit, 25)
      assert.equal(parsed.search, undefined)
      assert.equal(parsed.isActive, undefined)
    })

    it('listBrokeragesQuerySchema should coerce isActive string to boolean', () => {
      const parsedTrue = listBrokeragesQuerySchema.parse({ isActive: 'true' })
      assert.equal(parsedTrue.isActive, true)

      const parsedFalse = listBrokeragesQuerySchema.parse({ isActive: 'false' })
      assert.equal(parsedFalse.isActive, false)
    })
  })
})
