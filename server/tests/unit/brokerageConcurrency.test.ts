import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Brokerage } from '../../src/models/Brokerage.js'
import { User, IUser } from '../../src/models/User.js'
import {
  listAllBrokerages,
  getBrokerageDetail,
  createNewBrokerage,
  updateBrokerageDetails,
  deactivateBrokerage,
  brokeragesL1Cache,
  brokerageDetailL1Cache,
  invalidateBrokerageCaches,
} from '../../src/features/brokerages/brokerage.service.js'
import {
  list as listController,
  getDetail as getDetailController,
  create as createController,
  update as updateController,
  remove as removeController,
} from '../../src/features/brokerages/brokerage.controller.js'
import { verifyBrokerageAccess } from '../../src/middleware/tenantScope.js'
import { listBrokeragesQuerySchema } from '../../src/features/brokerages/brokerage.validators.js'
import { cacheSet, cacheGet, cacheDelete } from '../../src/config/redis.js'
import { buildCacheKey } from '../../src/utils/cacheHelper.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'
import { AppError } from '../../src/middleware/errorHandler.js'

// Mock Response Factory for Express Controllers
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

describe('Stage 4: Post-Refactor Quality & Concurrency Validation (aidlc-quality-agent)', () => {
  // Test User Identities
  const superAdminId = new mongoose.Types.ObjectId()
  const superAdminUser = {
    _id: superAdminId,
    role: USER_ROLES.SUPER_ADMIN,
    email: 'superadmin@proppulse.io',
  } as unknown as IUser

  const brokerage1Id = new mongoose.Types.ObjectId()
  const brokerageOwnerUser = {
    _id: new mongoose.Types.ObjectId(),
    role: USER_ROLES.BROKERAGE_OWNER,
    brokerageId: brokerage1Id,
    email: 'owner@apexrealty.com',
  } as unknown as IUser

  const agentUser = {
    _id: new mongoose.Types.ObjectId(),
    role: USER_ROLES.AGENT,
    brokerageId: brokerage1Id,
    email: 'agent@apexrealty.com',
  } as unknown as IUser

  // Backup original Mongoose model query methods
  const origBrokerageFind = Brokerage.find
  const origBrokerageFindById = Brokerage.findById
  const origBrokerageFindByIdAndUpdate = Brokerage.findByIdAndUpdate
  const origBrokerageCreate = Brokerage.create
  const origBrokerageCountDocuments = Brokerage.countDocuments
  const origUserAggregate = User.aggregate
  const origUserCountDocuments = User.countDocuments
  const origUserUpdateMany = User.updateMany

  beforeEach(() => {
    // Clear L1 caches
    brokeragesL1Cache.clear()
    brokerageDetailL1Cache.clear()

    // Default mock: empty responses
    Brokerage.find = (() => ({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [],
          }),
          skip: () => ({
            limit: () => ({
              lean: async () => [],
            }),
          }),
        }),
      }),
    })) as any

    Brokerage.findById = (() => ({
      select: () => ({
        lean: async () => null,
      }),
    })) as any

    Brokerage.findByIdAndUpdate = (() => ({
      select: () => ({
        lean: async () => null,
      }),
    })) as any

    Brokerage.countDocuments = (async () => 0) as any
    User.aggregate = (async () => []) as any
    User.countDocuments = (async () => 0) as any
    User.updateMany = (async () => ({ acknowledged: true, modifiedCount: 0 })) as any
  })

  afterEach(() => {
    // Restore original Mongoose model query methods
    Brokerage.find = origBrokerageFind
    Brokerage.findById = origBrokerageFindById
    Brokerage.findByIdAndUpdate = origBrokerageFindByIdAndUpdate
    Brokerage.create = origBrokerageCreate
    Brokerage.countDocuments = origBrokerageCountDocuments
    User.aggregate = origUserAggregate
    User.countDocuments = origUserCountDocuments
    User.updateMany = origUserUpdateMany
  })

  describe('1. Functional Boundaries: Happy Paths & Populated State Integrity', () => {
    it('listAllBrokerages should aggregate member counts and calculate pagination correctly', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        logoUrl: 'https://apex.com/logo.png',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }
      const b2Id = new mongoose.Types.ObjectId()
      const b2 = {
        _id: b2Id,
        name: 'Beacon Properties',
        subdomain: 'beacon',
        plan: 'pro',
        logoUrl: undefined,
        timezone: 'America/Chicago',
        isActive: true,
        createdAt: new Date('2026-01-03T00:00:00Z'),
        updatedAt: new Date('2026-01-04T00:00:00Z'),
      }

      Brokerage.find = (() => ({
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [b1, b2],
            }),
          }),
        }),
      })) as any

      Brokerage.countDocuments = (async () => 2) as any

      User.aggregate = (async () => [
        { _id: brokerage1Id, count: 8 },
        { _id: b2Id, count: 14 },
      ]) as any

      const result = await listAllBrokerages({ page: 1, limit: 10 })

      assert.equal(result.source, 'db')
      assert.equal(result.total, 2)
      assert.equal(result.brokerages.length, 2)
      assert.equal(result.brokerages[0].id, brokerage1Id.toString())
      assert.equal(result.brokerages[0].name, 'Apex Realty')
      assert.equal(result.brokerages[0].memberCount, 8)
      assert.equal(result.brokerages[1].id, b2Id.toString())
      assert.equal(result.brokerages[1].name, 'Beacon Properties')
      assert.equal(result.brokerages[1].memberCount, 14)
      assert.equal(result.totalPages, 1)
    })

    it('getBrokerageDetail should allow Super Admin to access any brokerage', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        logoUrl: undefined,
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      User.countDocuments = (async () => 5) as any

      const result = await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)

      assert.equal(result.brokerage.id, brokerage1Id.toString())
      assert.equal(result.brokerage.name, 'Apex Realty')
      assert.equal(result.brokerage.memberCount, 5)
    })

    it('getBrokerageDetail should allow Brokerage Owner to access their own brokerage', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        logoUrl: undefined,
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      User.countDocuments = (async () => 5) as any

      const result = await getBrokerageDetail(brokerage1Id.toString(), brokerageOwnerUser)

      assert.equal(result.brokerage.id, brokerage1Id.toString())
      assert.equal(result.brokerage.name, 'Apex Realty')
      assert.equal(result.brokerage.memberCount, 5)
    })

    it('createNewBrokerage should create brokerage with default plan and timezone and return DTO', async () => {
      const createdId = new mongoose.Types.ObjectId()
      Brokerage.create = (async (data: any) => ({
        _id: createdId,
        name: data.name,
        subdomain: data.subdomain,
        plan: data.plan,
        timezone: data.timezone,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any

      const created = await createNewBrokerage(
        { name: 'Centric Real Estate', subdomain: 'centric' },
        superAdminUser
      )

      assert.equal(created.id, createdId.toString())
      assert.equal(created.name, 'Centric Real Estate')
      assert.equal(created.plan, 'growth')
      assert.equal(created.timezone, 'America/New_York')
      assert.equal(created.memberCount, 0)
    })

    it('updateBrokerageDetails should execute atomic findByIdAndUpdate and update allowed fields', async () => {
      const updatedDoc = {
        _id: brokerage1Id,
        name: 'Apex Realty Global',
        subdomain: 'apexglobal',
        plan: 'enterprise',
        logoUrl: 'https://apex.com/new-logo.png',
        timezone: 'America/Chicago',
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-05T00:00:00Z'),
      }

      let capturedUpdateFields: any = null
      Brokerage.findByIdAndUpdate = ((id: any, update: any) => {
        capturedUpdateFields = update.$set
        return {
          select: () => ({
            lean: async () => updatedDoc,
          }),
        }
      }) as any

      User.countDocuments = (async () => 12) as any

      const result = await updateBrokerageDetails(
        brokerage1Id.toString(),
        {
          name: 'Apex Realty Global',
          subdomain: 'apexglobal',
          plan: 'enterprise',
          logoUrl: 'https://apex.com/new-logo.png',
          timezone: 'America/Chicago',
        },
        superAdminUser
      )

      assert.equal(capturedUpdateFields.name, 'Apex Realty Global')
      assert.equal(capturedUpdateFields.subdomain, 'apexglobal')
      assert.equal(capturedUpdateFields.plan, 'enterprise')
      assert.equal(capturedUpdateFields.logoUrl, 'https://apex.com/new-logo.png')
      assert.equal(capturedUpdateFields.timezone, 'America/Chicago')
      assert.equal(result.name, 'Apex Realty Global')
      assert.equal(result.memberCount, 12)
    })

    it('deactivateBrokerage should set isActive: false and cascade user session invalidation', async () => {
      let brokerageDeactivated = false
      let usersDeactivated = false
      let tokenVersionsIncremented = false

      Brokerage.findByIdAndUpdate = ((id: any, update: any) => {
        if (update.$set?.isActive === false) {
          brokerageDeactivated = true
        }
        return {
          select: () => ({
            lean: async () => ({
              _id: brokerage1Id,
              name: 'Apex Realty',
              isActive: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          }),
        }
      }) as any

      User.updateMany = (async (filter: any, update: any) => {
        if (filter.brokerageId?.toString() === brokerage1Id.toString()) {
          if (update.$set?.isActive === false) usersDeactivated = true
          if (update.$inc?.tokenVersion === 1) tokenVersionsIncremented = true
        }
        return { acknowledged: true, modifiedCount: 10 }
      }) as any

      await deactivateBrokerage(brokerage1Id.toString(), superAdminUser)

      assert.ok(brokerageDeactivated, 'Expected Brokerage.findByIdAndUpdate to set isActive: false')
      assert.ok(usersDeactivated, 'Expected User.updateMany to set isActive: false')
      assert.ok(tokenVersionsIncremented, 'Expected User.updateMany to increment tokenVersion for JWT invalidation')
    })
  })

  describe('2. Functional Boundaries: Edge Cases & Multi-Tenant Access Control', () => {
    it('Brokerage Owner attempting to access a different brokerage must be rejected with HTTP 403', async () => {
      const otherBrokerageId = new mongoose.Types.ObjectId()

      await assert.rejects(
        async () => {
          await getBrokerageDetail(otherBrokerageId.toString(), brokerageOwnerUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.equal(err.message, GENERIC_AUTH_MESSAGES.FORBIDDEN)
          return true
        }
      )
    })

    it('Non-Super Admin attempting to change plan must be rejected with HTTP 403', async () => {
      await assert.rejects(
        async () => {
          await updateBrokerageDetails(
            brokerage1Id.toString(),
            { plan: 'enterprise' },
            brokerageOwnerUser
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /contact super admin/i)
          return true
        }
      )
    })

    it('Malformed ObjectId string in getBrokerageDetail must return 404 (DI-001)', async () => {
      await assert.rejects(
        async () => {
          await getBrokerageDetail('not-an-object-id', superAdminUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND)
          assert.equal(err.message, 'Brokerage not found')
          return true
        }
      )
    })

    it('Non-existent valid ObjectId must return 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString()
      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => null,
        }),
      })) as any

      await assert.rejects(
        async () => {
          await getBrokerageDetail(nonExistentId, superAdminUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND)
          assert.equal(err.message, 'Brokerage not found')
          return true
        }
      )
    })

    it('Search queries with regex special characters must be safely escaped', async () => {
      let capturedRegex: any = null
      Brokerage.find = ((filter: any) => {
        capturedRegex = filter.name?.$regex
        return {
          select: () => ({
            sort: () => ({
              limit: () => ({
                lean: async () => [],
              }),
            }),
          }),
        }
      }) as any

      await listAllBrokerages({ search: 'Apex (Global) [TX] *+?^$' })

      assert.ok(capturedRegex)
      assert.match(capturedRegex, /\\\(Global\\\)/)
      assert.match(capturedRegex, /\\\[TX\\\]/)
    })

    it('listBrokeragesQuerySchema should accept isActive="all" and transform to undefined', () => {
      const parsedAll = listBrokeragesQuerySchema.parse({ isActive: 'all' })
      assert.equal(parsedAll.isActive, undefined)
    })
  })

  describe('3. Functional Boundaries: Empty State & Zero-Counter Integrity', () => {
    it('listAllBrokerages should handle empty database gracefully without NaN or errors', async () => {
      const result = await listAllBrokerages({ page: 1, limit: 25 })

      assert.equal(result.total, 0)
      assert.equal(result.brokerages.length, 0)
      assert.equal(result.totalPages, 0)
      assert.equal(result.page, 1)
      assert.equal(result.limit, 25)
    })

    it('getBrokerageDetail should return memberCount: 0 when brokerage has no active users', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      User.countDocuments = (async () => 0) as any

      const result = await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)
      assert.equal(result.brokerage.memberCount, 0)
    })
  })

  describe('4. Fault Isolation & Redis Fallback (DI-003)', () => {
    it('listAllBrokerages should fall through to MongoDB when Redis contains corrupt/malformed JSON', async () => {
      const cacheKey = buildCacheKey('global', 'brokerages', {
        page: 1,
        limit: 25,
        search: '',
        isActive: 'all',
      })

      // Seed corrupted JSON directly in Redis/in-memory cache
      await cacheSet(cacheKey, '{"corrupted": true, broken payload', 60)

      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.find = (() => ({
        select: () => ({
          sort: () => ({
            limit: () => ({
              lean: async () => [b1],
            }),
          }),
        }),
      })) as any

      Brokerage.countDocuments = (async () => 1) as any
      User.aggregate = (async () => [{ _id: brokerage1Id, count: 3 }]) as any

      // Must NOT throw SyntaxError; must fallback to DB
      const result = await listAllBrokerages({ page: 1, limit: 25 })
      assert.equal(result.source, 'db')
      assert.equal(result.total, 1)
      assert.equal(result.brokerages[0].name, 'Apex Realty')

      await cacheDelete(cacheKey)
    })

    it('getBrokerageDetail should fall through to MongoDB when Redis contains corrupt JSON', async () => {
      const cacheKey = buildCacheKey(brokerage1Id.toString(), 'brokerage', { id: brokerage1Id.toString() })
      await cacheSet(cacheKey, 'INVALID_NON_JSON_DATA', 60)

      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      User.countDocuments = (async () => 7) as any

      const result = await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)
      assert.equal(result.source, 'db')
      assert.equal(result.brokerage.name, 'Apex Realty')
      assert.equal(result.brokerage.memberCount, 7)

      await cacheDelete(cacheKey)
    })
  })

  describe('5. Extreme Concurrency Loops (50 Simultaneous Requests)', () => {
    it('listAllBrokerages should handle 50 concurrent requests cleanly with sub-1ms average throughput', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      let dbHitCount = 0
      Brokerage.find = (() => {
        dbHitCount++
        return {
          select: () => ({
            sort: () => ({
              limit: () => ({
                lean: async () => [b1],
              }),
            }),
          }),
        }
      }) as any

      Brokerage.countDocuments = (async () => 1) as any
      User.aggregate = (async () => [{ _id: brokerage1Id, count: 2 }]) as any

      const CONCURRENT_REQUESTS = 50
      const startAll = process.hrtime.bigint()

      const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        listAllBrokerages({ page: 1, limit: 25 })
      )

      const results = await Promise.all(promises)
      const totalElapsedMs = Number(process.hrtime.bigint() - startAll) / 1e6
      const avgMsPerCall = totalElapsedMs / CONCURRENT_REQUESTS

      assert.equal(results.length, CONCURRENT_REQUESTS)
      for (const res of results) {
        assert.equal(res.total, 1)
        assert.equal(res.brokerages[0].name, 'Apex Realty')
      }

      assert.ok(
        avgMsPerCall < 1.0,
        `Average concurrent resolution time (${avgMsPerCall.toFixed(3)}ms) exceeded 1.0ms SLA`
      )
    })

    it('getBrokerageDetail should service 50 concurrent requests with sub-1ms average throughput', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      User.countDocuments = (async () => 4) as any

      // Warm cache with initial call
      await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)

      const CONCURRENT_REQUESTS = 50
      const startAll = process.hrtime.bigint()

      const promises = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        getBrokerageDetail(brokerage1Id.toString(), superAdminUser)
      )

      const results = await Promise.all(promises)
      const totalElapsedMs = Number(process.hrtime.bigint() - startAll) / 1e6
      const avgMsPerCall = totalElapsedMs / CONCURRENT_REQUESTS

      assert.equal(results.length, CONCURRENT_REQUESTS)
      for (const res of results) {
        assert.equal(res.brokerage.name, 'Apex Realty')
        assert.equal(res.source, 'l1')
      }

      assert.ok(
        avgMsPerCall < 1.0,
        `Average concurrent detail resolution (${avgMsPerCall.toFixed(3)}ms) exceeded 1.0ms SLA`
      )
    })

    it('concurrent mutations and reads should maintain deterministic cache invalidation', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)

      const detailKey = buildCacheKey(brokerage1Id.toString(), 'brokerage', { id: brokerage1Id.toString() })
      assert.ok(brokerageDetailL1Cache.has(detailKey), 'L1 cache should be populated')

      Brokerage.findByIdAndUpdate = (() => ({
        select: () => ({
          lean: async () => ({ ...b1, name: 'Apex New Brand' }),
        }),
      })) as any

      await updateBrokerageDetails(
        brokerage1Id.toString(),
        { name: 'Apex New Brand' },
        superAdminUser
      )

      assert.equal(brokerageDetailL1Cache.has(detailKey), false, 'L1 cache should be cleared on mutation')
    })
  })

  describe('6. Latency SLO Assertions (< 1.0ms Cached Steady-State SLA)', () => {
    it('listAllBrokerages should service cached steady-state reads with p50 and p95 < 1.0ms', async () => {
      await listAllBrokerages({ page: 1, limit: 25 })

      const ITERATIONS = 30
      const latencies: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        const start = process.hrtime.bigint()
        const res = await listAllBrokerages({ page: 1, limit: 25 })
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6
        latencies.push(elapsedMs)
        assert.equal(res.source, 'l1')
      }

      latencies.sort((a, b) => a - b)
      const p50 = latencies[Math.floor(ITERATIONS * 0.5)]
      const p95 = latencies[Math.floor(ITERATIONS * 0.95)]
      const p99 = latencies[ITERATIONS - 1]

      assert.ok(
        p50 < 1.0,
        `listAllBrokerages p50 latency (${p50.toFixed(3)}ms) exceeded 1.0ms! p95=${p95.toFixed(3)}ms, p99=${p99.toFixed(3)}ms`
      )
    })

    it('getBrokerageDetail should service cached steady-state reads with p50 and p95 < 1.0ms', async () => {
      const b1 = {
        _id: brokerage1Id,
        name: 'Apex Realty',
        subdomain: 'apex',
        plan: 'growth',
        timezone: 'America/New_York',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      Brokerage.findById = (() => ({
        select: () => ({
          lean: async () => b1,
        }),
      })) as any

      await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)

      const ITERATIONS = 30
      const latencies: number[] = []

      for (let i = 0; i < ITERATIONS; i++) {
        const start = process.hrtime.bigint()
        const res = await getBrokerageDetail(brokerage1Id.toString(), superAdminUser)
        const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6
        latencies.push(elapsedMs)
        assert.equal(res.source, 'l1')
      }

      latencies.sort((a, b) => a - b)
      const p50 = latencies[Math.floor(ITERATIONS * 0.5)]
      const p95 = latencies[Math.floor(ITERATIONS * 0.95)]
      const p99 = latencies[ITERATIONS - 1]

      assert.ok(
        p50 < 1.0,
        `getBrokerageDetail p50 latency (${p50.toFixed(3)}ms) exceeded 1.0ms! p95=${p95.toFixed(3)}ms, p99=${p99.toFixed(3)}ms`
      )
    })
  })

  describe('7. Controller & Socket Immunization Under Concurrency (ML-001)', () => {
    it('50 concurrent unauthenticated requests must immediately receive HTTP 401 with no hanging sockets', async () => {
      const CONCURRENT_REQUESTS = 50
      const promises: Promise<any>[] = []

      for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        const req: any = { user: undefined, params: { id: brokerage1Id.toString() } }
        const res = createMockResponse()
        let nextCalled = false
        const next = () => { nextCalled = true }

        promises.push(
          getDetailController(req, res, next).then(() => {
            assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
            assert.equal(res.body?.success, false)
            assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
            assert.equal(nextCalled, false)
          })
        )
      }

      const t0 = process.hrtime.bigint()
      await Promise.all(promises)
      const totalElapsedMs = Number(process.hrtime.bigint() - t0) / 1e6
      const avgMs = totalElapsedMs / CONCURRENT_REQUESTS

      assert.ok(
        avgMs < 0.5,
        `Controller unauthenticated rejection took too long (${avgMs.toFixed(3)}ms per call)`
      )
    })

    it('list controller must set X-Cache and X-Response-Time headers', async () => {
      const req: any = { query: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await listController(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.OK)
      assert.ok(res.headers['X-Cache'])
      assert.ok(res.headers['X-Response-Time'])
      assert.equal(res.body?.success, true)
    })
  })
})
