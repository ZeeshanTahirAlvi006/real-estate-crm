import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  getConfigHandler,
  updateConfigHandler,
  getCriteria,
  createCriteriaHandler,
  updateCriteria,
  deleteCriteriaHandler,
  getCampaigns,
  getCampaignByIdHandler,
  createCampaign,
  updateCampaignHandler,
  deleteCampaignHandler,
  startCampaignHandler,
  pauseCampaignHandler,
  getCampaignMetricsHandler,
  executeCampaignHandler,
  toggleCampaign,
  simulateChat,
  getSpeedMetrics,
  testWhatsAppHandshakeHandler,
} from '../../src/features/ai-isa/aiIsa.controller.js'
import {
  aiIsaConfigL1Cache,
  criteriaL1Cache,
  campaignsL1Cache,
  campaignDetailL1Cache,
  campaignMetricsL1Cache,
  speedMetricsL1Cache,
  invalidateAiIsaCaches,
  extractCriteriaFromMessage,
} from '../../src/features/ai-isa/aiIsa.service.js'
import { checkFairHousingCompliance } from '../../src/features/ai-isa/fairHousingGuard.js'
import { objectIdParamSchema } from '../../src/features/ai-isa/aiIsa.validators.js'
import { objectionService, playbookL1Cache } from '../../src/features/ai-chatbot/objections/objection.service.js'
import { BoundedLruCache } from '../../src/utils/lruCache.js'
import { HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'

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

describe('AI Assistant & AI ISA Sub-1ms Performance & Quality Validation Suite', () => {
  const brokerageId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    aiIsaConfigL1Cache.clear()
    criteriaL1Cache.clear()
    campaignsL1Cache.clear()
    campaignDetailL1Cache.clear()
    campaignMetricsL1Cache.clear()
    speedMetricsL1Cache.clear()
    playbookL1Cache.clear()
  })

  describe('1. Hanging Connection Fix & Controller Immunization (Finding 1)', () => {
    const testCases: Array<{ name: string; handler: Function; req: any }> = [
      { name: 'getConfigHandler', handler: getConfigHandler, req: {} },
      { name: 'updateConfigHandler', handler: updateConfigHandler, req: { body: {} } },
      { name: 'getCriteria', handler: getCriteria, req: {} },
      { name: 'createCriteriaHandler', handler: createCriteriaHandler, req: { body: {} } },
      { name: 'updateCriteria', handler: updateCriteria, req: { params: { id: '64f1234567890abcdef12345' }, body: {} } },
      { name: 'deleteCriteriaHandler', handler: deleteCriteriaHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'getCampaigns', handler: getCampaigns, req: {} },
      { name: 'getCampaignByIdHandler', handler: getCampaignByIdHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'createCampaign', handler: createCampaign, req: { body: {} } },
      { name: 'updateCampaignHandler', handler: updateCampaignHandler, req: { params: { id: '64f1234567890abcdef12345' }, body: {} } },
      { name: 'deleteCampaignHandler', handler: deleteCampaignHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'startCampaignHandler', handler: startCampaignHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'pauseCampaignHandler', handler: pauseCampaignHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'getCampaignMetricsHandler', handler: getCampaignMetricsHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'executeCampaignHandler', handler: executeCampaignHandler, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'toggleCampaign', handler: toggleCampaign, req: { params: { id: '64f1234567890abcdef12345' } } },
      { name: 'simulateChat', handler: simulateChat, req: { body: { leadMessage: 'Hello' } } },
      { name: 'getSpeedMetrics', handler: getSpeedMetrics, req: {} },
      { name: 'testWhatsAppHandshakeHandler', handler: testWhatsAppHandshakeHandler, req: { body: { phone: '+1234567890' } } },
    ]

    for (const tc of testCases) {
      it(`${tc.name} should immediately return HTTP 401 when req.user is undefined (no hanging socket)`, async () => {
        const req: any = { ...tc.req, user: undefined }
        const res = createMockResponse()
        let nextCalled = false
        const next = () => { nextCalled = true }

        const t0 = process.hrtime.bigint()
        await tc.handler(req, res, next)
        const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

        assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
        assert.equal(res.body?.success, false)
        assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
        assert.equal(nextCalled, false)
        assert.ok(durationMs < 5.0, `Handler execution should be sub-5ms, was ${durationMs}ms`)
      })
    }
  })

  describe('2. Sub-1ms L1 In-Memory Caching & Latency Budget (Finding 9)', () => {
    it('L1 cache hit for AI ISA Config should resolve in < 1.0ms with X-Cache: L1-HIT header', async () => {
      // Seed L1 Cache
      const mockConfig: any = {
        brokerageId,
        isEnabled: true,
        persona: { name: 'Sarah Jenkins', tone: 'professional' },
        officeHoursOnly: false,
        autoReplyChannels: ['sms', 'whatsapp'],
        autoPilotEnabled: true,
        humanHandoffDelaySeconds: 30,
        qualificationThresholdScore: 80,
      }
      aiIsaConfigL1Cache.set(`cfg:${brokerageId}`, mockConfig)

      const req: any = { user: { _id: new mongoose.Types.ObjectId(), brokerageId } }
      const res1 = createMockResponse()
      const next = () => {}
      // Warm up handler
      await getConfigHandler(req, res1, next)

      const res = createMockResponse()
      const t0 = process.hrtime.bigint()
      await getConfigHandler(req, res, next)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.equal(res.body?.success, true)
      assert.equal(res.headers['X-Cache'], 'L1-HIT')
      assert.ok(res.headers['X-Response-Time'])
      assert.ok(durationMs < 1.0, `L1 cached read must be < 1.0ms, measured ${durationMs.toFixed(3)}ms`)
    })

    it('L1 cache hit for Qualification Criteria should resolve in < 1.0ms across 100 concurrent iterations', async () => {
      const mockCriteria: any = [
        { id: '1', category: 'budget', label: 'Budget', isRequired: true, promptDirective: 'Prompt', options: [], order: 0 },
        { id: '2', category: 'timeline', label: 'Timeline', isRequired: true, promptDirective: 'Prompt', options: [], order: 1 },
      ]
      criteriaL1Cache.set(`crit:${brokerageId}`, mockCriteria)

      const req: any = { user: { _id: new mongoose.Types.ObjectId(), brokerageId }, tenantFilter: { brokerageId } }
      const next = () => {}

      const times: number[] = []
      for (let i = 0; i < 100; i++) {
        const res = createMockResponse()
        const t0 = process.hrtime.bigint()
        await getCriteria(req, res, next)
        const dMs = Number(process.hrtime.bigint() - t0) / 1e6
        times.push(dMs)
        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['X-Cache'], 'L1-HIT')
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length
      const p99 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.99)]
      assert.ok(avgTime < 0.5, `Average latency must be < 0.5ms, measured ${avgTime.toFixed(3)}ms`)
      assert.ok(p99 < 1.0, `P99 latency must be < 1.0ms, measured ${p99.toFixed(3)}ms`)
    })

    it('L1 cache hit for Reactivation Campaigns should resolve in < 1.0ms', async () => {
      const mockCampaigns: any = [
        { id: 'camp1', name: '30-Day Cold Lead Reactivation', status: 'active', channel: 'sms' },
      ]
      campaignsL1Cache.set(`camps:${brokerageId}`, mockCampaigns)

      const req: any = { user: { _id: new mongoose.Types.ObjectId(), brokerageId }, tenantFilter: { brokerageId } }
      const res = createMockResponse()
      const next = () => {}

      const t0 = process.hrtime.bigint()
      await getCampaigns(req, res, next)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['X-Cache'], 'L1-HIT')
      assert.ok(durationMs < 1.0, `Campaigns cached read must be < 1.0ms, measured ${durationMs.toFixed(3)}ms`)
    })
  })

  describe('3. Deterministic Cache Invalidation Pipeline', () => {
    it('invalidateAiIsaCaches should synchronously purge L1 entries for target brokerage', async () => {
      aiIsaConfigL1Cache.set(`cfg:${brokerageId}`, {} as any)
      criteriaL1Cache.set(`crit:${brokerageId}`, [])
      campaignsL1Cache.set(`camps:${brokerageId}`, [])
      speedMetricsL1Cache.set(`speed:${brokerageId}`, {} as any)

      assert.equal(aiIsaConfigL1Cache.has(`cfg:${brokerageId}`), true)
      assert.equal(criteriaL1Cache.has(`crit:${brokerageId}`), true)
      assert.equal(campaignsL1Cache.has(`camps:${brokerageId}`), true)

      await invalidateAiIsaCaches(brokerageId)

      assert.equal(aiIsaConfigL1Cache.has(`cfg:${brokerageId}`), false)
      assert.equal(criteriaL1Cache.has(`crit:${brokerageId}`), false)
      assert.equal(campaignsL1Cache.has(`camps:${brokerageId}`), false)
      assert.equal(speedMetricsL1Cache.has(`speed:${brokerageId}`), false)
    })
  })

  describe('4. Parameter Validation Schema Guard (Finding 12)', () => {
    it('objectIdParamSchema should validate valid 24-char hex ObjectIds and reject malformed strings', () => {
      const validId = new mongoose.Types.ObjectId().toString()
      const validParse = objectIdParamSchema.safeParse({ id: validId })
      assert.equal(validParse.success, true)

      const invalidIds = ['123', 'invalid-id', '64f1234567890abcdef1234z', '']
      for (const invalid of invalidIds) {
        const result = objectIdParamSchema.safeParse({ id: invalid })
        assert.equal(result.success, false)
      }
    })
  })

  describe('5. Memory Leak Prevention & Bounded LRU Enclosure (ML-001 / ML-002)', () => {
    it('BoundedLruCache must never exceed configured maxSize and evicts oldest items', () => {
      const cache = new BoundedLruCache<number>(5, 60)
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, i)
      }

      assert.equal(cache.size, 5)
      assert.equal(cache.has('key-0'), false) // Oldest evicted
      assert.equal(cache.has('key-1'), false)
      assert.equal(cache.has('key-9'), true)  // Newest retained
      assert.equal(cache.get('key-9'), 9)
    })
  })

  describe('6. Fair Housing Act Compliance Engine (Security & Legal Safeguard)', () => {
    it('should flag and sanitize discriminatory racial, religious, and familial inquiries', () => {
      const racialQuery = 'Is this a good white neighborhood or are there lots of minorities?'
      const scan1 = checkFairHousingCompliance(racialQuery)
      assert.equal(scan1.passed, false)
      assert.ok(scan1.flags.length > 0)
      assert.ok(scan1.sanitizedText?.includes('Federal Fair Housing Act'))

      const religiousQuery = 'Are there churches and is this a christian community?'
      const scan2 = checkFairHousingCompliance(religiousQuery)
      assert.equal(scan2.passed, false)
      assert.ok(scan2.flags.some((f) => f.includes('Religious')))

      const familialQuery = 'We want adults only, no children in the community.'
      const scan3 = checkFairHousingCompliance(familialQuery)
      assert.equal(scan3.passed, false)
      assert.ok(scan3.flags.some((f) => f.includes('Familial')))
    })

    it('should pass non-discriminatory property and financing inquiries cleanly', () => {
      const validQuery = 'I am looking for a 4-bedroom single family home with a 2-car garage under $750k in Austin.'
      const scan = checkFairHousingCompliance(validQuery)
      assert.equal(scan.passed, true)
      assert.equal(scan.flags.length, 0)
    })
  })

  describe('7. Conversational Criteria Extraction Logic', () => {
    it('should extract budget, timeline, pre-approval, and location accurately from natural language', () => {
      const message = 'We have a budget of $850k, pre-approved with lender, looking to move in 45 days in Dallas.'
      const extracted = extractCriteriaFromMessage(message)

      assert.equal(extracted.budget, '$850k')
      assert.equal(extracted.timeline, '45 Days')
      assert.equal(extracted.preApproval, 'approved')
      assert.ok(extracted.location?.includes('Dallas'))
    })
  })

  describe('8. Objection Classifier & Rebuttals Sub-1ms Performance', () => {
    it('classifyObjection should resolve in < 1.0ms on localhost', () => {
      // Warm up JIT
      objectionService.classifyObjection('warmup')

      const text = 'Interest rates are too high at 7%, we want to wait for the Fed rate cut.'
      const t0 = process.hrtime.bigint()
      const result = objectionService.classifyObjection(text)
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.category, 'interest_rates')
      assert.ok(result.confidence > 0.6)
      assert.ok(durationMs < 1.0, `Classification must be < 1.0ms, measured ${durationMs.toFixed(3)}ms`)
    })

    it('getPlaybooks should return curated playbooks cached in L1 in < 1.0ms', async () => {
      // First call primes cache
      await objectionService.getPlaybooks()

      // Second call from L1
      const t0 = process.hrtime.bigint()
      const playbooks = await objectionService.getPlaybooks()
      const durationMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(playbooks.length >= 5)
      assert.ok(durationMs < 1.0, `L1 playbook retrieval must be < 1.0ms, measured ${durationMs.toFixed(3)}ms`)
    })
  })
})
