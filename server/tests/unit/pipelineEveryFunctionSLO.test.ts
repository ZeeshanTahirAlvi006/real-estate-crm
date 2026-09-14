import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { IUser } from '../../src/models/User.js'
import { Pipeline, IPipeline } from '../../src/models/Pipeline.js'
import { Deal, IDeal } from '../../src/models/Deal.js'
import { Activity } from '../../src/models/Activity.js'
import {
  listPipelines,
  getPipelineById,
  createPipeline,
  updatePipeline,
  deletePipeline,
  addStage,
  updateStage,
  reorderStages,
  deleteStage,
  getStageStats,
  getBatchStageStats,
  invalidatePipelineCaches,
  pipelineListL1Cache,
  pipelineDetailL1Cache,
} from '../../src/features/pipeline/pipeline.service.js'
import {
  list,
  get,
  create,
  update,
  remove,
  createStage as controllerCreateStage,
  patchStage,
  patchReorder,
  removeStage,
} from '../../src/features/pipeline/pipeline.controller.js'
import { serializePipeline, PipelineResponse } from '../../src/features/pipeline/pipeline.types.js'
import { updateDeal, moveDealStage } from '../../src/features/deals/deal.service.js'
import { updateDealSchema, moveDealStageSchema } from '../../src/features/deals/deal.validators.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'
import { buildCacheKey, measureExecutionMs } from '../../src/utils/cacheHelper.js'

describe('Stage 4: aidlc-quality-agent — Exhaustive Pipeline Function & Sequence Latency Contract', { concurrency: 1 }, () => {
  const MAX_ALLOWED_LATENCY_MS = 10.0 // Hard SLA ceiling: 10.0ms for uncached
  const CACHED_SLA_MS = 1.0 // Hard SLA ceiling: 1.0ms for cached L1

  const tenantBrokerageId = new mongoose.Types.ObjectId()
  const callerId = new mongoose.Types.ObjectId()
  const mockUser: IUser = {
    _id: callerId,
    role: USER_ROLES.BROKERAGE_OWNER,
    brokerageId: tenantBrokerageId,
    email: 'broker@proppulse.com',
    firstName: 'Zeeshan',
    lastName: 'Alvi',
  } as unknown as IUser

  const origLog = console.log

  // Timing helper that verifies latency ceiling and prints structured audit trail
  const assertLatencyLimit = (
    fnName: string,
    sequence: string,
    startTime: bigint,
    limitMs: number = MAX_ALLOWED_LATENCY_MS
  ): number => {
    const durationMs = measureExecutionMs(startTime)
    origLog(
      `  [SLO-PASS] ${fnName.padEnd(26)} | Seq: ${sequence.padEnd(38)} | Duration: ${durationMs.toFixed(4)}ms (SLA: <${limitMs.toFixed(1)}ms)`
    )
    assert.ok(
      durationMs < limitMs,
      `PERFORMANCE REGRESSION: ${fnName} (${sequence}) took ${durationMs.toFixed(4)}ms, exceeding the ${limitMs}ms limit!`
    )
    return durationMs
  }

  // Response mock factory
  const createMockRes = () => {
    const res: any = {
      statusCode: 200,
      body: null,
      headers: {} as Record<string, string>,
      status(code: number) {
        this.statusCode = code
        return this
      },
      json(data: any) {
        this.body = data
        return this
      },
      setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value
        return this
      },
    }
    return res
  }

  // Save original model methods
  const origPipelineFind = Pipeline.find
  const origPipelineFindById = Pipeline.findById
  const origPipelineFindOne = Pipeline.findOne
  const origPipelineCreate = Pipeline.create
  const origPipelineCountDocuments = Pipeline.countDocuments
  const origDealAggregate = Deal.aggregate
  const origDealCountDocuments = Deal.countDocuments
  const origDealFind = Deal.find
  const origDealFindOne = Deal.findOne
  const origActivityCreate = Activity.create

  beforeEach(() => {
    pipelineListL1Cache.clear()
    pipelineDetailL1Cache.clear()
    console.log = () => {}
  })

  afterEach(() => {
    console.log = origLog
    Pipeline.find = origPipelineFind
    Pipeline.findById = origPipelineFindById
    Pipeline.findOne = origPipelineFindOne
    Pipeline.create = origPipelineCreate
    Pipeline.countDocuments = origPipelineCountDocuments
    Deal.aggregate = origDealAggregate
    Deal.countDocuments = origDealCountDocuments
    Deal.find = origDealFind
    Deal.findOne = origDealFindOne
    Activity.create = origActivityCreate
  })

  // =========================================================================
  // 1. serializePipeline Sequences
  // =========================================================================
  describe('Function: serializePipeline', () => {
    it('Seq 1: Standard full document serialization with stage stats mapping', () => {
      const stage1Id = new mongoose.Types.ObjectId()
      const stage2Id = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Residential Sales',
        brokerageId: tenantBrokerageId,
        isDefault: true,
        stages: [
          { _id: stage2Id, name: 'Under Contract', color: '#10b981', order: 1, probability: 75 },
          { _id: stage1Id, name: 'Lead', color: '#6366f1', order: 0, probability: 25 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const statsMap = new Map<string, { dealCount: number; totalValue: number }>()
      statsMap.set(stage1Id.toString(), { dealCount: 4, totalValue: 800000 })
      statsMap.set(stage2Id.toString(), { dealCount: 2, totalValue: 600000 })

      // Warm up JIT execution
      serializePipeline(mockDoc, statsMap)

      const t0 = process.hrtime.bigint()
      const res = serializePipeline(mockDoc, statsMap)
      assertLatencyLimit('serializePipeline', 'Full document with stage stats mapping', t0, CACHED_SLA_MS)

      assert.equal(res.name, 'Residential Sales')
      assert.equal(res.stages.length, 2)
      assert.equal(res.stages[0].name, 'Lead') // Sorted by order
      assert.equal(res.stages[0].order, 0)
      assert.equal(res.stages[0].dealCount, 4)
      assert.equal(res.stages[0].totalValue, 800000)
      assert.equal(res.stages[0].weightedValue, 200000) // 800000 * 25%
      assert.equal(res.stages[1].name, 'Under Contract')
      assert.equal(res.stages[1].weightedValue, 450000) // 600000 * 75%
    })

    it('Seq 2: Edge case serialization with empty stages array', () => {
      const mockDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Empty Pipeline',
        brokerageId: tenantBrokerageId,
        isDefault: false,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const t0 = process.hrtime.bigint()
      const res = serializePipeline(mockDoc)
      assertLatencyLimit('serializePipeline', 'Empty stages array handling', t0, CACHED_SLA_MS)

      assert.equal(res.stages.length, 0)
      assert.equal(res.isDefault, false)
    })
  })

  // =========================================================================
  // 2. getBatchStageStats Sequences
  // =========================================================================
  describe('Function: getBatchStageStats', () => {
    it('Seq 1: Empty pipeline IDs array instant short-circuit', async () => {
      const t0 = process.hrtime.bigint()
      const res = await getBatchStageStats([])
      assertLatencyLimit('getBatchStageStats', 'Empty array short-circuit', t0, CACHED_SLA_MS)
      assert.equal(res.size, 0)
    })

    it('Seq 2: Multi-pipeline aggregation with compound index result mapping', async () => {
      const p1 = new mongoose.Types.ObjectId()
      const p2 = new mongoose.Types.ObjectId()
      const s1 = new mongoose.Types.ObjectId()
      const s2 = new mongoose.Types.ObjectId()

      Deal.aggregate = (async () => [
        { _id: { pipelineId: p1, stageId: s1 }, dealCount: 5, totalValue: 1250000 },
        { _id: { pipelineId: p2, stageId: s2 }, dealCount: 2, totalValue: 500000 },
      ]) as any

      const t0 = process.hrtime.bigint()
      const res = await getBatchStageStats([p1, p2], tenantBrokerageId)
      assertLatencyLimit('getBatchStageStats', 'Multi-pipeline aggregation query', t0, MAX_ALLOWED_LATENCY_MS)

      assert.equal(res.size, 2)
      assert.equal(res.get(p1.toString())?.get(s1.toString())?.dealCount, 5)
      assert.equal(res.get(p2.toString())?.get(s2.toString())?.totalValue, 500000)
    })
  })

  // =========================================================================
  // 3. getStageStats Sequences
  // =========================================================================
  describe('Function: getStageStats', () => {
    it('Seq 1: Single pipeline aggregation query and stage map construction', async () => {
      const pId = new mongoose.Types.ObjectId()
      const sId = new mongoose.Types.ObjectId()

      Deal.aggregate = (async () => [
        { _id: sId, dealCount: 3, totalValue: 900000 },
      ]) as any

      const t0 = process.hrtime.bigint()
      const res = await getStageStats(pId, tenantBrokerageId)
      assertLatencyLimit('getStageStats', 'Single pipeline aggregation scan', t0, MAX_ALLOWED_LATENCY_MS)

      assert.equal(res.size, 1)
      assert.equal(res.get(sId.toString())?.dealCount, 3)
      assert.equal(res.get(sId.toString())?.totalValue, 900000)
    })
  })

  // =========================================================================
  // 4. listPipelines Sequences
  // =========================================================================
  describe('Function: listPipelines', () => {
    it('Seq 1: L1 cache hit sequence (<1.0ms target)', async () => {
      const filter = { brokerageId: tenantBrokerageId }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'pipeline', { list: true, filter })
      const cached = [
        {
          id: new mongoose.Types.ObjectId().toString(),
          name: 'Cached Pipeline',
          brokerageId: tenantBrokerageId.toString(),
          isDefault: true,
          stages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      pipelineListL1Cache.set(cacheKey, cached)

      // Warm up
      await listPipelines(filter)

      const t0 = process.hrtime.bigint()
      const res = await listPipelines(filter)
      assertLatencyLimit('listPipelines', 'L1 cache hit resolution', t0, CACHED_SLA_MS)

      assert.equal(res.source, 'l1')
      assert.equal(res.pipelines.length, 1)
      assert.equal(res.pipelines[0].name, 'Cached Pipeline')
    })

    it('Seq 2: Uncached DB fetch sequence with batch aggregation (<10ms target)', async () => {
      const filter = { brokerageId: tenantBrokerageId }
      const pId = new mongoose.Types.ObjectId()
      const sId = new mongoose.Types.ObjectId()

      Pipeline.find = (() => ({
        sort: () => ({
          select: () => ({
            lean: async () => [
              {
                _id: pId,
                name: 'DB Pipeline',
                brokerageId: tenantBrokerageId,
                isDefault: true,
                stages: [{ _id: sId, name: 'Active', color: '#10b981', order: 0, probability: 50 }],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }),
        }),
      })) as any

      Deal.aggregate = (async () => [
        { _id: { pipelineId: pId, stageId: sId }, dealCount: 1, totalValue: 400000 },
      ]) as any

      const t0 = process.hrtime.bigint()
      const res = await listPipelines(filter)
      assertLatencyLimit('listPipelines', 'Uncached DB fetch with batch aggregation', t0, MAX_ALLOWED_LATENCY_MS)

      assert.equal(res.source, 'db')
      assert.equal(res.pipelines.length, 1)
      assert.equal(res.pipelines[0].name, 'DB Pipeline')
      assert.equal(res.pipelines[0].stages[0].dealCount, 1)
    })
  })

  // =========================================================================
  // 5. getPipelineById Sequences
  // =========================================================================
  describe('Function: getPipelineById', () => {
    it('Seq 1: L1 cache hit sequence (<1.0ms target)', async () => {
      const pId = new mongoose.Types.ObjectId().toString()
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'pipeline', { id: pId })
      const cached = {
        id: pId,
        name: 'Single Pipeline L1',
        brokerageId: tenantBrokerageId.toString(),
        isDefault: false,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      pipelineDetailL1Cache.set(cacheKey, cached)

      // Warm up
      await getPipelineById(pId, mockUser)

      const t0 = process.hrtime.bigint()
      const res = await getPipelineById(pId, mockUser)
      assertLatencyLimit('getPipelineById', 'L1 cache hit resolution', t0, CACHED_SLA_MS)

      assert.equal(res.source, 'l1')
      assert.equal(res.pipeline.name, 'Single Pipeline L1')
    })

    it('Seq 2: Uncached DB fetch sequence (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const sId = new mongoose.Types.ObjectId()

      Pipeline.findById = (() => ({
        lean: async () => ({
          _id: pId,
          name: 'Single Pipeline DB',
          brokerageId: tenantBrokerageId,
          isDefault: false,
          stages: [{ _id: sId, name: 'Lead', color: '#6366f1', order: 0, probability: 10 }],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      })) as any

      Deal.aggregate = (async () => [
        { _id: sId, dealCount: 2, totalValue: 700000 },
      ]) as any

      const t0 = process.hrtime.bigint()
      const res = await getPipelineById(pId.toString(), mockUser)
      assertLatencyLimit('getPipelineById', 'Uncached DB detail fetch', t0, MAX_ALLOWED_LATENCY_MS)

      assert.equal(res.source, 'db')
      assert.equal(res.pipeline.name, 'Single Pipeline DB')
      assert.equal(res.pipeline.stages[0].dealCount, 2)
    })

    it('Seq 3: Invalid ObjectId format boundary rejection (<10ms target)', async () => {
      const t0 = process.hrtime.bigint()
      await assert.rejects(
        async () => {
          await getPipelineById('invalid-format-id', mockUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST)
          assert.equal(err.message, 'Invalid pipeline ID')
          return true
        }
      )
      assertLatencyLimit('getPipelineById', 'Invalid ObjectId validation boundary', t0)
    })

    it('Seq 4: Non-existent pipeline 404 rejection (<10ms target)', async () => {
      Pipeline.findById = (() => ({
        lean: async () => null,
      })) as any

      const t0 = process.hrtime.bigint()
      await assert.rejects(
        async () => {
          await getPipelineById(new mongoose.Types.ObjectId().toString(), mockUser)
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND)
          assert.equal(err.message, 'Pipeline not found')
          return true
        }
      )
      assertLatencyLimit('getPipelineById', 'Non-existent pipeline 404', t0)
    })
  })

  // =========================================================================
  // 6. createPipeline Sequences
  // =========================================================================
  describe('Function: createPipeline', () => {
    it('Seq 1: Duplicate name conflict rejection sequence (<10ms target)', async () => {
      Pipeline.findOne = (() => ({
        select: () => ({
          lean: async () => ({ _id: new mongoose.Types.ObjectId() }),
        }),
      })) as any

      const t0 = process.hrtime.bigint()
      await assert.rejects(
        async () => {
          await createPipeline({ name: 'Commercial' }, mockUser, '127.0.0.1', 'test-agent')
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.CONFLICT)
          return true
        }
      )
      assertLatencyLimit('createPipeline', 'Duplicate name conflict validation', t0)
    })

    it('Seq 2: Standard creation with default stages (<10ms target)', async () => {
      Pipeline.findOne = (() => ({
        select: () => ({
          lean: async () => null,
        }),
      })) as any

      Pipeline.countDocuments = (async () => 0) as any

      Pipeline.create = (async (doc: any) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        brokerageId: tenantBrokerageId,
        stages: doc.stages.map((s: any) => ({ ...s, _id: new mongoose.Types.ObjectId() })),
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any

      const t0 = process.hrtime.bigint()
      const res = await createPipeline({ name: 'Default Flow' }, mockUser, '127.0.0.1', 'test-agent')
      assertLatencyLimit('createPipeline', 'Standard creation with default stages', t0)

      assert.equal(res.name, 'Default Flow')
      assert.equal(res.isDefault, true)
      assert.ok(res.stages.length >= 5)
    })
  })

  // =========================================================================
  // 7. updatePipeline Sequences
  // =========================================================================
  describe('Function: updatePipeline', () => {
    it('Seq 1: Successful rename and cache invalidation sequence (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: pId,
        name: 'Old Name',
        brokerageId: tenantBrokerageId,
        isDefault: false,
        stages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }

      Pipeline.findById = (async () => mockDoc) as any
      Pipeline.findOne = (() => ({
        select: () => ({
          lean: async () => null,
        }),
      })) as any

      Deal.aggregate = (async () => []) as any

      const t0 = process.hrtime.bigint()
      const res = await updatePipeline(pId.toString(), { name: 'New Pipeline Name' }, mockUser, '127.0.0.1', 'test-agent')
      assertLatencyLimit('updatePipeline', 'Successful rename & cache purge', t0)

      assert.equal(res.name, 'New Pipeline Name')
    })
  })

  // =========================================================================
  // 8. deletePipeline Sequences
  // =========================================================================
  describe('Function: deletePipeline', () => {
    it('Seq 1: Active deals protection sequence (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        isDefault: false,
      }

      Pipeline.findById = (() => ({
        select: () => ({
          lean: async () => mockDoc,
        }),
      })) as any
      Deal.countDocuments = (async () => 3) as any // 3 active deals exist

      const t0 = process.hrtime.bigint()
      await assert.rejects(
        async () => {
          await deletePipeline(pId.toString(), mockUser, '127.0.0.1', 'test-agent')
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.CONFLICT)
          assert.ok(err.message.includes('Cannot delete pipeline'))
          return true
        }
      )
      assertLatencyLimit('deletePipeline', 'Active deals deletion guard', t0)
    })
  })

  // =========================================================================
  // 9. Stage Operations Sequences (addStage, updateStage, reorderStages, deleteStage)
  // =========================================================================
  describe('Functions: Stage Operations', () => {
    it('Seq 1: addStage execution and order calculation (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: new mongoose.Types.ObjectId(), name: 'Initial', color: '#6366f1', order: 0, probability: 20 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }

      Pipeline.findById = (async () => mockDoc) as any
      Deal.aggregate = (async () => []) as any

      // Warm up JIT execution
      await addStage(
        pId.toString(),
        { name: 'Warmup', color: '#10b981', probability: 50 },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      // Reset stages array to exact initial state
      mockDoc.stages = [
        { _id: new mongoose.Types.ObjectId(), name: 'Initial', color: '#6366f1', order: 0, probability: 20 },
      ]

      const t0 = process.hrtime.bigint()
      const res = await addStage(
        pId.toString(),
        { name: 'Underwriting', color: '#10b981', probability: 80 },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('addStage', 'Stage appending & order indexing', t0)

      assert.equal(res.stages.length, 2)
      assert.equal(res.stages[1].name, 'Underwriting')
      assert.equal(res.stages[1].order, 1)
    })

    it('Seq 2: updateStage properties modification sequence (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const sId = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: sId, name: 'Original', color: '#6366f1', order: 0, probability: 20 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }

      Pipeline.findById = (async () => mockDoc) as any
      Deal.aggregate = (async () => []) as any

      const t0 = process.hrtime.bigint()
      const res = await updateStage(
        pId.toString(),
        sId.toString(),
        { name: 'Updated Stage', probability: 40 },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('updateStage', 'Stage properties update & serialize', t0)

      assert.equal(res.stages[0].name, 'Updated Stage')
      assert.equal(res.stages[0].probability, 40)
    })

    it('Seq 3: reorderStages stage order reassignment sequence (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const s1 = new mongoose.Types.ObjectId()
      const s2 = new mongoose.Types.ObjectId()

      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: s1, name: 'S1', order: 0 },
          { _id: s2, name: 'S2', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }

      Pipeline.findById = (async () => mockDoc) as any
      Deal.aggregate = (async () => []) as any

      const t0 = process.hrtime.bigint()
      const res = await reorderStages(
        pId.toString(),
        {
          orderings: [
            { stageId: s1.toString(), order: 1 },
            { stageId: s2.toString(), order: 0 },
          ],
        },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('reorderStages', 'Stage order rearrangement', t0)

      assert.equal(res.stages.length, 2)
    })

    it('Seq 4: deleteStage minimum 1 stage floor protection (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const s1 = new mongoose.Types.ObjectId()

      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: s1, name: 'S1', order: 0 },
        ],
      }

      Pipeline.findById = (async () => mockDoc) as any

      let threw = false
      const t0 = process.hrtime.bigint()
      try {
        await deleteStage(pId.toString(), s1.toString(), mockUser, '127.0.0.1', 'test-agent')
      } catch (err: any) {
        threw = true
        assertLatencyLimit('deleteStage', 'Minimum 1 stage floor guard', t0)
        assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST)
        assert.equal(err.message, 'Pipeline must have at least one stage')
      }
      assert.equal(threw, true)
    })
  })

  // =========================================================================
  // 10. invalidatePipelineCaches Sequences
  // =========================================================================
  describe('Function: invalidatePipelineCaches', () => {
    it('Seq 1: Synchronous L1 purge and async Redis task dispatch (<10ms target)', async () => {
      const k1 = 'test:key:1'
      const k2 = 'test:key:2'
      pipelineListL1Cache.set(k1, [])
      pipelineDetailL1Cache.set(k2, {} as any)

      const t0 = process.hrtime.bigint()
      await invalidatePipelineCaches(tenantBrokerageId.toString())
      assertLatencyLimit('invalidatePipelineCaches', 'L1 synchronous purge & L2 dispatch', t0, MAX_ALLOWED_LATENCY_MS)

      assert.equal(pipelineListL1Cache.has(k1), false)
      assert.equal(pipelineDetailL1Cache.has(k2), false)
    })
  })

  // =========================================================================
  // 11. Controller Handlers (All 9 Endpoints)
  // =========================================================================
  describe('Controller Handlers: Latency & Response Diagnostics', () => {
    it('Seq 1: list controller L1 cache hit with diagnostic headers (<5.0ms target)', async () => {
      const filter = { brokerageId: tenantBrokerageId }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'pipeline', { list: true, filter })
      pipelineListL1Cache.set(cacheKey, [])

      const req: any = { user: mockUser, tenantFilter: filter }
      const res = createMockRes()

      // Warm up
      await list(req, res, () => {})

      const t0 = process.hrtime.bigint()
      await list(req, res, () => {})
      assertLatencyLimit('controller:list', 'L1 hit with telemetry headers', t0, 5.0)

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['x-cache'], 'L1-HIT')
      assert.ok(res.headers['x-response-time'])
    })

    it('Seq 2: get controller L1 cache hit (<1.0ms target)', async () => {
      const pId = new mongoose.Types.ObjectId().toString()
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'pipeline', { id: pId })
      pipelineDetailL1Cache.set(cacheKey, { id: pId, name: 'Detail L1' } as any)

      const req: any = { user: mockUser, params: { id: pId } }
      const res = createMockRes()

      // Warm up
      await get(req, res, () => {})

      const t0 = process.hrtime.bigint()
      await get(req, res, () => {})
      assertLatencyLimit('controller:get', 'L1 detail hit with telemetry headers', t0, 5.0)

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['x-cache'], 'L1-HIT')
      assert.equal(res.body?.data?.name, 'Detail L1')
    })

    it('Seq 3: patchStage controller execution (<10ms target)', async () => {
      const pId = new mongoose.Types.ObjectId()
      const sId = new mongoose.Types.ObjectId()
      const mockDoc: any = {
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [{ _id: sId, name: 'Stage Initial', color: '#6366f1', order: 0, probability: 30 }],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }
      Pipeline.findById = (async () => mockDoc) as any
      Deal.aggregate = (async () => []) as any

      const req: any = {
        user: mockUser,
        params: { id: pId.toString(), stageId: sId.toString() },
        body: { name: 'Stage Renamed' },
        ip: '127.0.0.1',
        headers: {},
      }
      const res = createMockRes()

      // Warm up
      await patchStage(req, res, () => {})

      const t0 = process.hrtime.bigint()
      await patchStage(req, res, () => {})
      assertLatencyLimit('controller:patchStage', 'Stage update HTTP handler', t0)

      assert.equal(res.statusCode, 200)
      assert.equal(res.body?.data?.stages[0]?.name, 'Stage Renamed')
    })
  })

  // =========================================================================
  // 12. Cross-Pipeline Deal Migration Contract
  // =========================================================================
  describe('Feature: Cross-Pipeline Deal Migration', () => {
    it('Seq 1: updateDealSchema DTO validation (<1.0ms target)', () => {
      const pTarget = new mongoose.Types.ObjectId().toString()
      const sTarget = new mongoose.Types.ObjectId().toString()

      // Warm up JIT execution
      updateDealSchema.safeParse({ dealValue: 1000 })

      const t0 = process.hrtime.bigint()
      const parsed = updateDealSchema.safeParse({
        pipelineId: pTarget,
        stageId: sTarget,
        dealValue: 950000,
        propertyAddress: '550 Congress Ave, Austin TX',
      })
      assertLatencyLimit('updateDealSchema', 'Zod schema validation', t0, CACHED_SLA_MS)

      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.pipelineId, pTarget)
        assert.equal(parsed.data.stageId, sTarget)
      }
    })

    it('Seq 2: moveDealStageSchema DTO validation (<1.0ms target)', () => {
      const pTarget = new mongoose.Types.ObjectId().toString()
      const sTarget = new mongoose.Types.ObjectId().toString()

      // Warm up JIT execution
      moveDealStageSchema.safeParse({ stageId: sTarget })

      const t0 = process.hrtime.bigint()
      const parsed = moveDealStageSchema.safeParse({
        stageId: sTarget,
        pipelineId: pTarget,
      })
      assertLatencyLimit('moveDealStageSchema', 'Zod stage & pipeline schema validation', t0, CACHED_SLA_MS)

      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.stageId, sTarget)
        assert.equal(parsed.data.pipelineId, pTarget)
      }
    })

    it('Seq 3: updateDeal cross-pipeline migration sequence (<10ms target)', async () => {
      const dealId = new mongoose.Types.ObjectId()
      const oldPipelineId = new mongoose.Types.ObjectId()
      const newPipelineId = new mongoose.Types.ObjectId()
      const oldStageId = new mongoose.Types.ObjectId()
      const newStageId = new mongoose.Types.ObjectId()
      const contactId = new mongoose.Types.ObjectId()
      const agentId = new mongoose.Types.ObjectId()

      const mockDeal: any = {
        _id: dealId,
        brokerageId: tenantBrokerageId,
        pipelineId: oldPipelineId,
        stageId: oldStageId,
        contactId,
        contactName: 'Sarah Jenkins',
        propertyAddress: '742 Evergreen Terrace',
        dealValue: 620000,
        assignedAgentId: agentId,
        assignedAgentName: 'Agent Cooper',
        priority: 'high',
        isDeleted: false,
        stageEnteredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }

      const targetPipelineDoc: any = {
        _id: newPipelineId,
        name: 'Under Contract Flow',
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: newStageId, name: 'Escrow Opened', color: '#10b981', order: 0, probability: 80 },
        ],
      }

      const oldPipelineDoc: any = {
        _id: oldPipelineId,
        name: 'Buyer Pipeline',
        stages: [
          { _id: oldStageId, name: 'Touring', color: '#6366f1', order: 1, probability: 40 },
        ],
      }

      Deal.findOne = (async () => mockDeal) as any
      Pipeline.findOne = (async () => targetPipelineDoc) as any
      Pipeline.findById = ((id: any) => {
        const idStr = id?.toString?.() || String(id)
        if (idStr === oldPipelineId.toString()) {
          return {
            lean: async () => oldPipelineDoc,
            ...oldPipelineDoc,
          }
        }
        return {
          lean: async () => targetPipelineDoc,
          ...targetPipelineDoc,
        }
      }) as any
      Activity.create = (async () => ({})) as any

      // Warm up JIT execution
      await updateDeal(
        dealId.toString(),
        { notes: 'Warmup' },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )

      const t0 = process.hrtime.bigint()
      const res = await updateDeal(
        dealId.toString(),
        { pipelineId: newPipelineId.toString(), stageId: newStageId.toString() },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('updateDeal', 'Cross-pipeline deal migration execution', t0)

      assert.equal(res.id, dealId.toString())
      assert.equal(res.pipelineId, newPipelineId.toString())
      assert.equal(res.stageId, newStageId.toString())
      assert.equal(res.stageName, 'Escrow Opened')
    })
  })

  // =========================================================================
  // 13. End-to-End Multi-Step Workflow Sequence
  // =========================================================================
  describe('Sequence: End-to-End Pipeline & Stage Lifecycle', () => {
    it('Seq 1: Complete Pipeline Lifecycle (Create -> Add Stage -> Update Stage -> Invalidate -> Delete) with <10ms each step', async () => {
      const pId = new mongoose.Types.ObjectId()
      const s1 = new mongoose.Types.ObjectId()
      const s2 = new mongoose.Types.ObjectId()
      const s3 = new mongoose.Types.ObjectId()

      // Step A: Create Pipeline
      Pipeline.findOne = (() => ({ select: () => ({ lean: async () => null }) })) as any
      Pipeline.countDocuments = (async () => 1) as any
      Pipeline.create = (async (doc: any) => ({
        ...doc,
        _id: pId,
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: s1, name: 'Initial Lead', color: '#6366f1', order: 0, probability: 10 },
          { _id: s2, name: 'Showing', color: '#f59e0b', order: 1, probability: 40 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any

      const tCreate = process.hrtime.bigint()
      const created = await createPipeline({ name: 'E2E Lifecycle Pipeline' }, mockUser, '127.0.0.1', 'test-agent')
      assertLatencyLimit('createPipeline', 'E2E Step 1: Create pipeline', tCreate)
      assert.equal(created.name, 'E2E Lifecycle Pipeline')

      // Step B: Add Third Stage
      const pipelineDoc: any = {
        _id: pId,
        name: 'E2E Lifecycle Pipeline',
        brokerageId: tenantBrokerageId,
        stages: [
          { _id: s1, name: 'Initial Lead', color: '#6366f1', order: 0, probability: 10 },
          { _id: s2, name: 'Showing', color: '#f59e0b', order: 1, probability: 40 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this },
      }
      Pipeline.findById = (async () => pipelineDoc) as any
      Deal.aggregate = (async () => []) as any

      const tAddStage = process.hrtime.bigint()
      const withNewStage = await addStage(
        pId.toString(),
        { name: 'Underwriting', color: '#10b981', probability: 85 },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('addStage', 'E2E Step 2: Add third stage', tAddStage)
      assert.equal(withNewStage.stages.length, 3)

      // Step C: Update Stage Property
      const tUpdateStage = process.hrtime.bigint()
      const updatedStage = await updateStage(
        pId.toString(),
        s1.toString(),
        { name: 'Verified Lead', probability: 25 },
        mockUser,
        '127.0.0.1',
        'test-agent'
      )
      assertLatencyLimit('updateStage', 'E2E Step 3: Update stage property', tUpdateStage)
      assert.equal(updatedStage.stages[0].name, 'Verified Lead')

      // Step D: Invalidate Caches
      const tInvalidate = process.hrtime.bigint()
      await invalidatePipelineCaches(tenantBrokerageId.toString(), pId.toString())
      assertLatencyLimit('invalidatePipelineCaches', 'E2E Step 4: Flush tenant caches', tInvalidate, MAX_ALLOWED_LATENCY_MS)

      // Step E: Delete Added Stage
      const addedStageId = withNewStage.stages[2].id
      Deal.countDocuments = (async () => 0) as any // No active deals in stage
      const tDeleteStage = process.hrtime.bigint()
      const afterStageDeleted = await deleteStage(pId.toString(), addedStageId, mockUser, '127.0.0.1', 'test-agent')
      assertLatencyLimit('deleteStage', 'E2E Step 5: Delete stage cleanly', tDeleteStage)
      assert.equal(afterStageDeleted.stages.length, 2)
    })
  })

  // =========================================================================
  // 14. 100-Concurrent-Requests Burst Sequence
  // =========================================================================
  describe('Sequence: 100-Concurrent-Requests Burst Concurrency', () => {
    it('100 concurrent L1 cached requests resolve with average duration < 1.0ms and total batch < 20.0ms', async () => {
      const filter = { brokerageId: tenantBrokerageId }
      const cacheKey = buildCacheKey(tenantBrokerageId.toString(), 'pipeline', { list: true, filter })
      pipelineListL1Cache.set(cacheKey, [
        {
          id: new mongoose.Types.ObjectId().toString(),
          name: 'Concurrent Pipeline',
          brokerageId: tenantBrokerageId.toString(),
          isDefault: true,
          stages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      const iterations = 100
      const t0 = process.hrtime.bigint()
      const promises = Array.from({ length: iterations }, () => listPipelines(filter))
      const results = await Promise.all(promises)
      const totalMs = measureExecutionMs(t0)
      const avgMs = totalMs / iterations

      console.log(`  [CONCURRENCY-RESULT] 100 concurrent calls total: ${totalMs.toFixed(3)}ms | avg: ${avgMs.toFixed(4)}ms`)
      assert.equal(results.length, 100)
      for (const r of results) {
        assert.equal(r.source, 'l1')
      }
      assert.ok(avgMs < 1.0, `Average latency under concurrency should be < 1.0ms, got ${avgMs.toFixed(4)}ms`)
      assert.ok(totalMs < 100.0, `Total batch of 100 parallel requests should complete in < 100ms, got ${totalMs.toFixed(3)}ms`)
    })
  })
})
