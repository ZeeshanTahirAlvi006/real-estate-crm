import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { IUser } from '../../src/models/User.js'
import {
  listPipelines,
  getPipelineById,
  pipelineListL1Cache,
  pipelineDetailL1Cache,
  invalidatePipelineCaches,
  getBatchStageStats,
} from '../../src/features/pipeline/pipeline.service.js'
import {
  list,
  get,
  create,
  update,
  remove,
  createStage,
  patchStage,
  patchReorder,
  removeStage,
} from '../../src/features/pipeline/pipeline.controller.js'
import { serializePipeline, PipelineResponse } from '../../src/features/pipeline/pipeline.types.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'
import { buildCacheKey } from '../../src/utils/cacheHelper.js'
import { updateDealSchema, moveDealStageSchema } from '../../src/features/deals/deal.validators.js'

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
      this.headers[name.toLowerCase()] = value
      return this
    },
  }
  return res
}

describe('Pipeline Sub-1ms Performance & Quality Validation Tests', () => {
  const brokerageId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const mockUser: IUser = {
    _id: userId,
    role: USER_ROLES.BROKERAGE_OWNER,
    brokerageId,
    email: 'owner@testbrokerage.com',
  } as unknown as IUser

  const origLog = console.log

  beforeEach(() => {
    pipelineListL1Cache.clear()
    pipelineDetailL1Cache.clear()
    console.log = () => {}
  })

  afterEach(() => {
    console.log = origLog
  })

  describe('1. Hanging Connection Bug Fix & Controller Socket Immunization', () => {
    it('list should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await list(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('get should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await get(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('create should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, body: { name: 'Residential Pipeline' }, ip: '127.0.0.1', headers: {} }
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
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() }, body: { name: 'Commercial Pipeline' }, ip: '127.0.0.1', headers: {} }
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
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await remove(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('createStage should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() }, body: { name: 'Underwriting', color: '#10b981', probability: 80 }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await createStage(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('patchStage should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString(), stageId: new mongoose.Types.ObjectId().toString() }, body: { name: 'Closing' }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await patchStage(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('patchReorder should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() }, body: { orderings: [] }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await patchReorder(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('removeStage should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString(), stageId: new mongoose.Types.ObjectId().toString() }, ip: '127.0.0.1', headers: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await removeStage(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })
  })

  describe('2. Sub-1ms Latency Budget (L1 Cached Reads)', () => {
    it('listPipelines should resolve in < 1.0ms when served from L1 cache', async () => {
      const filter = { brokerageId }
      const cacheKey = buildCacheKey(brokerageId.toString(), 'pipeline', { list: true, filter })
      const samplePipeline: PipelineResponse = {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Standard Pipeline',
        brokerageId: brokerageId.toString(),
        isDefault: true,
        stages: [
          {
            id: new mongoose.Types.ObjectId().toString(),
            name: 'Prospect',
            color: '#6366f1',
            order: 0,
            probability: 20,
            dealCount: 5,
            totalValue: 500000,
            weightedValue: 100000,
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Pre-warm L1 cache
      pipelineListL1Cache.set(cacheKey, [samplePipeline])

      // Warm up JIT execution
      await listPipelines(filter)

      const t0 = process.hrtime.bigint()
      const result = await listPipelines(filter)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.source, 'l1')
      assert.equal(result.pipelines.length, 1)
      assert.equal(result.pipelines[0].name, 'Standard Pipeline')
      assert.ok(durationMs < 1.0, `Expected L1 cached read < 1.0ms, but took ${durationMs.toFixed(3)}ms`)
    })

    it('getPipelineById should resolve in < 1.0ms when served from L1 cache', async () => {
      const pipelineId = new mongoose.Types.ObjectId().toString()
      const cacheKey = buildCacheKey(brokerageId.toString(), 'pipeline', { id: pipelineId })
      const samplePipeline: PipelineResponse = {
        id: pipelineId,
        name: 'Luxury Residential',
        brokerageId: brokerageId.toString(),
        isDefault: false,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Pre-warm L1 cache
      pipelineDetailL1Cache.set(cacheKey, samplePipeline)

      // Warm up JIT execution
      await getPipelineById(pipelineId, mockUser)

      const t0 = process.hrtime.bigint()
      const result = await getPipelineById(pipelineId, mockUser)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.source, 'l1')
      assert.equal(result.pipeline.id, pipelineId)
      assert.equal(result.pipeline.name, 'Luxury Residential')
      assert.ok(durationMs < 1.0, `Expected L1 detail read < 1.0ms, but took ${durationMs.toFixed(3)}ms`)
    })

    it('100 concurrent L1 cached list reads should all complete in < 1.0ms average', async () => {
      const filter = { brokerageId }
      const cacheKey = buildCacheKey(brokerageId.toString(), 'pipeline', { list: true, filter })
      pipelineListL1Cache.set(cacheKey, [])

      const iterations = 100
      const t0 = process.hrtime.bigint()
      const promises = Array.from({ length: iterations }, () => listPipelines(filter))
      const results = await Promise.all(promises)
      const totalDurationMs = Number(process.hrtime.bigint() - t0) / 1e6
      const avgDurationMs = totalDurationMs / iterations

      assert.equal(results.length, 100)
      for (const res of results) {
        assert.equal(res.source, 'l1')
      }
      assert.ok(avgDurationMs < 1.0, `Expected avg < 1.0ms under concurrency, took ${avgDurationMs.toFixed(4)}ms`)
    })
  })

  describe('3. Deterministic Cache Invalidation & Telemetry Headers', () => {
    it('invalidatePipelineCaches should completely flush L1 caches', async () => {
      const cacheKey = buildCacheKey(brokerageId.toString(), 'pipeline', { test: 1 })
      pipelineListL1Cache.set(cacheKey, [])
      pipelineDetailL1Cache.set(cacheKey, {} as any)

      assert.equal(pipelineListL1Cache.has(cacheKey), true)
      assert.equal(pipelineDetailL1Cache.has(cacheKey), true)

      await invalidatePipelineCaches(brokerageId.toString())

      assert.equal(pipelineListL1Cache.has(cacheKey), false)
      assert.equal(pipelineDetailL1Cache.has(cacheKey), false)
    })

    it('controller list should set X-Cache and X-Response-Time headers on L1 hits', async () => {
      const filter = { brokerageId }
      const cacheKey = buildCacheKey(brokerageId.toString(), 'pipeline', { list: true, filter })
      pipelineListL1Cache.set(cacheKey, [])

      const req: any = { user: mockUser, tenantFilter: filter }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await list(req, res, next)

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['x-cache'], 'L1-HIT')
      assert.ok(res.headers['x-response-time'], 'X-Response-Time header must be present')
      assert.equal(nextCalled, false)
    })
  })

  describe('4. Single-Pass Batch Aggregator & Serialization Logic', () => {
    it('getBatchStageStats should return empty map for empty pipeline IDs array', async () => {
      const stats = await getBatchStageStats([])
      assert.equal(stats.size, 0)
    })

    it('serializePipeline should sort stages by order and compute weightedValue accurately', () => {
      const mockDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Investment Pipeline',
        brokerageId: brokerageId,
        isDefault: true,
        stages: [
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Closing',
            color: '#10b981',
            order: 2,
            probability: 90,
          },
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Lead',
            color: '#6366f1',
            order: 0,
            probability: 10,
          },
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Negotiation',
            color: '#f59e0b',
            order: 1,
            probability: 50,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const stageStatsMap = new Map<string, { dealCount: number; totalValue: number }>()
      stageStatsMap.set(mockDoc.stages[2]._id.toString(), { dealCount: 2, totalValue: 400000 })

      const serialized = serializePipeline(mockDoc, stageStatsMap)

      assert.equal(serialized.stages.length, 3)
      assert.equal(serialized.stages[0].name, 'Lead')
      assert.equal(serialized.stages[0].order, 0)
      assert.equal(serialized.stages[1].name, 'Negotiation')
      assert.equal(serialized.stages[1].order, 1)
      assert.equal(serialized.stages[1].dealCount, 2)
      assert.equal(serialized.stages[1].totalValue, 400000)
      assert.equal(serialized.stages[1].weightedValue, 200000) // 400000 * 50%
      assert.equal(serialized.stages[2].name, 'Closing')
      assert.equal(serialized.stages[2].order, 2)
    })
  })

  describe('5. Error Handling & Validation Boundaries', () => {
    it('getPipelineById should reject invalid ObjectId with 400 Bad Request', async () => {
      await assert.rejects(
        async () => {
          await getPipelineById('invalid-id-format', mockUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST)
          assert.equal(err.message, 'Invalid pipeline ID')
          return true
        }
      )
    })
  })

  describe('6. Cross-Pipeline Deal Movement Validation', () => {
    it('updateDealSchema should accept pipelineId and stageId for cross-pipeline moves', () => {
      const targetPipelineId = new mongoose.Types.ObjectId().toString()
      const targetStageId = new mongoose.Types.ObjectId().toString()

      const parsed = updateDealSchema.safeParse({
        pipelineId: targetPipelineId,
        stageId: targetStageId,
        propertyAddress: '123 Main St, Austin TX',
        dealValue: 750000,
        notes: 'Transferred from Buyer to Closing Pipeline',
      })

      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.pipelineId, targetPipelineId)
        assert.equal(parsed.data.stageId, targetStageId)
        assert.equal(parsed.data.propertyAddress, '123 Main St, Austin TX')
      }
    })

    it('moveDealStageSchema should accept optional pipelineId for cross-pipeline stage transitions', () => {
      const targetPipelineId = new mongoose.Types.ObjectId().toString()
      const targetStageId = new mongoose.Types.ObjectId().toString()

      const parsed = moveDealStageSchema.safeParse({
        stageId: targetStageId,
        pipelineId: targetPipelineId,
      })

      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.stageId, targetStageId)
        assert.equal(parsed.data.pipelineId, targetPipelineId)
      }
    })
  })
})
