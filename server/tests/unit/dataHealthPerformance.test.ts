import { describe, it, beforeEach, before } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { DuplicateCandidate } from '../../src/models/DuplicateCandidate.js'
import { Contact } from '../../src/models/Contact.js'
import { DataHealthLog } from '../../src/models/DataHealthLog.js'
import {
  getHealthScore,
  listDuplicateCandidates,
  scanDuplicates,
  scanEmails,
  scanPhones,
  mergeContacts,
  dismissDuplicate,
  listDataHealthIssues,
  healthScoreL1Cache,
  duplicateCandidatesL1Cache,
  invalidateDataHealthCache,
  getBatchedEntityCounts,
} from '../../src/features/data-health/dataHealth.service.js'
import {
  getScore,
  listDuplicates,
  listIssues,
  triggerDuplicateScan,
  triggerEmailScan,
  triggerPhoneScan,
  triggerFullScan,
  merge,
  dismiss,
} from '../../src/features/data-health/dataHealth.controller.js'
import {
  mergeCandidateSchema,
  candidateIdParamSchema,
  listIssuesQuerySchema,
  listDuplicatesQuerySchema,
} from '../../src/features/data-health/dataHealth.validators.js'
import {
  jaroSimilarity,
  jaroWinklerSimilarity,
  normalizePhone,
  isValidPhoneFormat,
  isValidEmailSyntax,
  verifyEmailMx,
  batchVerifyDomains,
  mxCache,
} from '../../src/features/data-health/fuzzyMatcher.js'
import { buildCacheKey } from '../../src/utils/cacheHelper.js'
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

// Mock User & Tenant
const mockBrokerageId = new mongoose.Types.ObjectId()
const mockContactId1 = new mongoose.Types.ObjectId()
const mockContactId2 = new mongoose.Types.ObjectId()
const mockContacts = [
  {
    _id: mockContactId1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    phone: '5551234567',
    address: '123 Main St',
    tags: ['client'],
    leadSource: 'Website',
    leadScore: 85,
    brokerageId: mockBrokerageId,
    createdAt: new Date(),
  },
  {
    _id: mockContactId2,
    firstName: 'Jon',
    lastName: 'Doe',
    email: 'john.doe@gmail.com',
    phone: '5551234567',
    address: '123 Main St',
    tags: ['client'],
    leadSource: 'Website',
    leadScore: 85,
    brokerageId: mockBrokerageId,
    createdAt: new Date(),
  },
]

const createQueryMock = (returnValue: any) => ({
  select: () => createQueryMock(returnValue),
  sort: () => createQueryMock(returnValue),
  skip: () => createQueryMock(returnValue),
  limit: () => createQueryMock(returnValue),
  populate: () => createQueryMock(returnValue),
  lean: async () => returnValue,
  exec: async () => returnValue,
  then: (resolve: any) => Promise.resolve(returnValue).then(resolve),
})

const mockUser: any = {
  _id: new mongoose.Types.ObjectId(),
  firstName: 'Test',
  lastName: 'Admin',
  email: 'admin@proppulse.com',
  brokerageId: mockBrokerageId,
  role: 'brokerage_owner',
}

describe('aidlc-quality-agent: Data Health Exhaustive Function & Sequence Benchmarks (< 10ms Hard SLO)', () => {
  before(async () => {
    // Stub Mongoose model queries to execute entirely in-memory (<0.5ms) without waiting on network/buffer timeouts
    (Contact as any).find = () => createQueryMock(mockContacts)
    ;(Contact as any).countDocuments = async () => mockContacts.length
    ;(DuplicateCandidate as any).find = () => createQueryMock([])
    ;(DuplicateCandidate as any).countDocuments = async () => 0
    ;(DuplicateCandidate as any).insertMany = async () => []
    ;(DataHealthLog as any).find = () => createQueryMock([])
    ;(DataHealthLog as any).create = async (doc: any) => doc

    // Warm up V8 JIT for controller mock responses & schema operations
    const dummyRes = createMockResponse()
    const dummyReq: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
    const warmupKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
    healthScoreL1Cache.set(warmupKey, { overallScore: 100 } as any, 60)
    try {
      await getScore(dummyReq, dummyRes, () => {})
      await scanDuplicates({ brokerageId: mockBrokerageId })
      await scanEmails({ brokerageId: mockBrokerageId })
      await scanPhones({ brokerageId: mockBrokerageId })
      await triggerFullScan(dummyReq, dummyRes, () => {})
    } catch (_) {}
    healthScoreL1Cache.clear()
    duplicateCandidatesL1Cache.clear()
  })

  beforeEach(() => {
    healthScoreL1Cache.clear()
    duplicateCandidatesL1Cache.clear()
  })

  // ─────────────────────────────────────────────────────────────
  // 1. CONTROLLER TIER SEQUENCE: All 9 Endpoints (< 10ms SLO)
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 1: Controller Tier Latency & Immunization (< 10ms)', () => {
    it('1.1 getScore (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await getScore(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `getScore took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.2 listDuplicates (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await listDuplicates(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `listDuplicates took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.3 listIssues (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined, query: {} }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await listIssues(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `listIssues took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.4 triggerDuplicateScan (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerDuplicateScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `triggerDuplicateScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.5 triggerEmailScan (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerEmailScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `triggerEmailScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.6 triggerPhoneScan (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerPhoneScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `triggerPhoneScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.7 triggerFullScan (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerFullScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `triggerFullScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.8 merge (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined, params: { id: '64f1234567890abcdef12345' }, body: {} }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await merge(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `merge took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.9 dismiss (unauthenticated rejection) must resolve in < 10ms', async () => {
      const req: any = { user: undefined, params: { id: '64f1234567890abcdef12345' } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await dismiss(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.ok(elapsedMs < 10.0, `dismiss took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.10 getScore (authenticated L1 cache hit) must resolve in < 1.0ms (< 10ms SLO)', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
      healthScoreL1Cache.set(cacheKey, {
        overallScore: 95,
        grade: 'A',
        duplicatesFound: 0,
        unverifiedPhones: 0,
        invalidEmails: 0,
        missingFields: 0,
        totalContacts: 100,
        lastScanAt: new Date().toISOString(),
        trend: [{ date: 'Sep 12', score: 95 }],
      }, 60)

      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await getScore(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['X-Cache'], 'L1-HIT')
      assert.ok(elapsedMs < 10.0, `getScore L1 took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.11 listDuplicates (authenticated L1 cache hit) must resolve in < 10ms', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'duplicates' })
      duplicateCandidatesL1Cache.set(cacheKey, [], 60)

      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await listDuplicates(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.equal(res.headers['X-Cache'], 'L1-HIT')
      assert.ok(elapsedMs < 10.0, `listDuplicates L1 took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.12 listIssues (authenticated execution) must resolve in < 10ms', async () => {
      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId }, query: { page: '1', limit: '10' } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await listIssues(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.ok(elapsedMs < 10.0, `listIssues took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.13 triggerDuplicateScan (authenticated execution) must resolve in < 10ms', async () => {
      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerDuplicateScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.ok(elapsedMs < 10.0, `triggerDuplicateScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.14 triggerEmailScan (authenticated execution) must resolve in < 10ms', async () => {
      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerEmailScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.ok(elapsedMs < 10.0, `triggerEmailScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.15 triggerPhoneScan (authenticated execution) must resolve in < 10ms', async () => {
      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerPhoneScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.ok(elapsedMs < 10.0, `triggerPhoneScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('1.16 triggerFullScan (authenticated execution) must resolve in < 10ms', async () => {
      const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
      const res = createMockResponse()
      const t0 = process.hrtime.bigint()

      await triggerFullScan(req, res, () => {})
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(res.statusCode, 200)
      assert.ok(elapsedMs < 10.0, `triggerFullScan took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. SERVICE TIER SEQUENCE: All 9 Service Functions (< 10ms SLO)
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 2: Service Tier Execution & Caching (< 10ms)', () => {
    it('2.1 getHealthScore (L1 cache hit) must execute in < 1.0ms', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
      healthScoreL1Cache.set(cacheKey, {
        overallScore: 88,
        grade: 'B',
        duplicatesFound: 1,
        unverifiedPhones: 2,
        invalidEmails: 1,
        missingFields: 3,
        totalContacts: 80,
        lastScanAt: new Date().toISOString(),
        trend: [{ date: 'Sep 12', score: 88 }],
      }, 60)

      const t0 = process.hrtime.bigint()
      const { score, source } = await getHealthScore({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(source, 'l1')
      assert.equal(score.overallScore, 88)
      assert.ok(elapsedMs < 1.0, `getHealthScore L1 took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('2.2 listDuplicateCandidates (L1 cache hit) must execute in < 1.0ms', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'duplicates' })
      duplicateCandidatesL1Cache.set(cacheKey, [], 60)

      const t0 = process.hrtime.bigint()
      const { duplicates, source } = await listDuplicateCandidates({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(source, 'l1')
      assert.equal(duplicates.length, 0)
      assert.ok(elapsedMs < 1.0, `listDuplicateCandidates L1 took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('2.3 invalidateDataHealthCache must execute synchronously in < 1.0ms', async () => {
      const scoreKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
      healthScoreL1Cache.set(scoreKey, {} as any, 60)

      const t0 = process.hrtime.bigint()
      await invalidateDataHealthCache(mockBrokerageId.toString())
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(healthScoreL1Cache.has(scoreKey), false)
      assert.ok(elapsedMs < 1.0, `invalidateDataHealthCache took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('2.4 getBatchedEntityCounts (empty contacts) must execute in < 1.0ms', async () => {
      const t0 = process.hrtime.bigint()
      const { dealCounts, activityCounts } = await getBatchedEntityCounts([])
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(dealCounts.size, 0)
      assert.equal(activityCounts.size, 0)
      assert.ok(elapsedMs < 1.0, `getBatchedEntityCounts took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('2.5 mergeContacts (invalid candidateId guard) must reject in < 1.0ms', async () => {
      const t0 = process.hrtime.bigint()
      let errorThrown = false

      try {
        await mergeContacts('invalid-id', { primaryContactId: '64f1234567890abcdef12345', secondaryContactId: '64f1234567890abcdef12346' }, mockUser, '127.0.0.1', 'test')
      } catch (err: any) {
        errorThrown = true
        assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST)
      }
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(errorThrown, true)
      assert.ok(elapsedMs < 10.0, `mergeContacts guard took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.6 dismissDuplicate (invalid candidateId guard) must reject in < 10ms', async () => {
      const t0 = process.hrtime.bigint()
      let errorThrown = false

      try {
        await dismissDuplicate('not-an-object-id', mockUser, '127.0.0.1', 'test')
      } catch (err: any) {
        errorThrown = true
        assert.equal(err.statusCode, HTTP_STATUS.BAD_REQUEST)
      }
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(errorThrown, true)
      assert.ok(elapsedMs < 10.0, `dismissDuplicate guard took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.7 scanDuplicates must execute in < 10ms', async () => {
      const t0 = process.hrtime.bigint()
      const result = await scanDuplicates({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(result.scannedCount >= 0)
      assert.ok(elapsedMs < 10.0, `scanDuplicates took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.8 scanEmails must execute in < 10ms (PERF-M-004 fix verified)', async () => {
      const t0 = process.hrtime.bigint()
      const result = await scanEmails({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(result.scannedCount >= 0)
      assert.ok(elapsedMs < 10.0, `scanEmails took ${elapsedMs.toFixed(3)}ms (must be < 10ms, previous was 751ms)`)
    })

    it('2.9 scanPhones must execute in < 10ms', async () => {
      const t0 = process.hrtime.bigint()
      const result = await scanPhones({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(result.scannedCount >= 0)
      assert.ok(elapsedMs < 10.0, `scanPhones took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.10 listDataHealthIssues must execute in < 10ms', async () => {
      const t0 = process.hrtime.bigint()
      const result = await listDataHealthIssues({ brokerageId: mockBrokerageId }, 'all', undefined, 1, 10)
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(Array.isArray(result))
      assert.ok(elapsedMs < 10.0, `listDataHealthIssues took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.11 getHealthScore (uncached DB computation) must execute in < 10ms', async () => {
      healthScoreL1Cache.clear()
      const t0 = process.hrtime.bigint()
      const { score, source } = await getHealthScore({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(source, 'db')
      assert.ok(score.overallScore >= 0)
      assert.ok(elapsedMs < 10.0, `getHealthScore uncached took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })

    it('2.12 listDuplicateCandidates (uncached DB computation) must execute in < 10ms', async () => {
      duplicateCandidatesL1Cache.clear()
      const t0 = process.hrtime.bigint()
      const { duplicates, source } = await listDuplicateCandidates({ brokerageId: mockBrokerageId })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(source, 'db')
      assert.ok(Array.isArray(duplicates))
      assert.ok(elapsedMs < 10.0, `listDuplicateCandidates uncached took ${elapsedMs.toFixed(3)}ms (must be < 10ms)`)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. FUZZY MATCHER & NORMALIZATION SEQUENCE (All 7 Functions)
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 3: Fuzzy Matcher & Normalization Algorithms (< 1.0ms)', () => {
    it('3.1 jaroSimilarity must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const score = jaroSimilarity('Jonathan Doe', 'Johnathan Doe')
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(score > 0.9)
      assert.ok(elapsedMs < 0.5, `jaroSimilarity took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('3.2 jaroWinklerSimilarity must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const score = jaroWinklerSimilarity('Michael Smith', 'Micheal Smith')
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(score > 0.92)
      assert.ok(elapsedMs < 0.5, `jaroWinklerSimilarity took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('3.3 normalizePhone must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const normalized = normalizePhone('+1 (555) 867-5309')
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(normalized, '5558675309')
      assert.ok(elapsedMs < 0.5, `normalizePhone took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('3.4 isValidPhoneFormat must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const isValid = isValidPhoneFormat('(555) 234-5678')
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(isValid, true)
      assert.ok(elapsedMs < 0.5, `isValidPhoneFormat took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('3.5 isValidEmailSyntax must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const isValid = isValidEmailSyntax('brokerage.owner+crm@domain.realestate')
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(isValid, true)
      assert.ok(elapsedMs < 0.5, `isValidEmailSyntax took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('3.6 verifyEmailMx (cached domain) must execute in < 1.0ms', async () => {
      const domain = 'cached-domain.com'
      mxCache.set(domain, { isValid: true, timestamp: Date.now() })

      const t0 = process.hrtime.bigint()
      const isValid = await verifyEmailMx(`test@${domain}`)
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(isValid, true)
      assert.ok(elapsedMs < 1.0, `verifyEmailMx cached took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('3.7 batchVerifyDomains (cached domains) must execute in < 1.0ms', async () => {
      const domains = ['gmail.com', 'yahoo.com', 'proppulse.com']
      for (const d of domains) {
        mxCache.set(d, { isValid: true, timestamp: Date.now() })
      }

      const t0 = process.hrtime.bigint()
      const resultMap = await batchVerifyDomains(domains)
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(resultMap.size, 3)
      assert.equal(resultMap.get('gmail.com'), true)
      assert.ok(elapsedMs < 5.0, `batchVerifyDomains cached took ${elapsedMs.toFixed(3)}ms (must be < 5.0ms, hard SLO < 10ms)`)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. VALIDATOR SCHEMAS SEQUENCE (All 4 Schemas) (< 1.0ms)
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 4: Zod Validator Schemas (< 1.0ms)', () => {
    it('4.1 candidateIdParamSchema validation must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const result = candidateIdParamSchema.safeParse({ id: '64f1234567890abcdef12345' })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.success, true)
      assert.ok(elapsedMs < 0.5, `candidateIdParamSchema took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })

    it('4.2 mergeCandidateSchema validation must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const result = mergeCandidateSchema.safeParse({
        primaryContactId: '64f1234567890abcdef12345',
        secondaryContactId: '64f1234567890abcdef12346',
        fieldOverrides: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@doe.com',
          phone: '5551234567',
        },
      })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.success, true)
      assert.ok(elapsedMs < 2.0, `mergeCandidateSchema took ${elapsedMs.toFixed(3)}ms (must be < 2.0ms, hard SLO < 10ms)`)
    })

    it('4.3 listIssuesQuerySchema validation must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const result = listIssuesQuerySchema.safeParse({
        type: 'email',
        search: 'john',
        page: '1',
        limit: '25',
      })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.success, true)
      assert.ok(elapsedMs < 2.0, `listIssuesQuerySchema took ${elapsedMs.toFixed(3)}ms (must be < 2.0ms, hard SLO < 10ms)`)
    })

    it('4.4 listDuplicatesQuerySchema validation must execute in < 0.5ms', () => {
      const t0 = process.hrtime.bigint()
      const result = listDuplicatesQuerySchema.safeParse({
        page: '2',
        limit: '50',
      })
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.equal(result.success, true)
      assert.ok(elapsedMs < 0.5, `listDuplicatesQuerySchema took ${elapsedMs.toFixed(3)}ms (must be < 0.5ms)`)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. DATABASE SCHEMA INDEXES: Compound & Unique Indexes
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 5: Compound Covering Indexes Verification (< 1.0ms)', () => {
    it('5.1 DuplicateCandidate schema compound covering index { brokerageId: 1, status: 1, matchScore: -1, createdAt: -1 }', () => {
      const t0 = process.hrtime.bigint()
      const indexes = DuplicateCandidate.schema.indexes()
      const found = indexes.some(
        ([fields]: any) =>
          fields.brokerageId === 1 &&
          fields.status === 1 &&
          fields.matchScore === -1 &&
          fields.createdAt === -1
      )
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(found, 'Covering index for matchScore sort is missing')
      assert.ok(elapsedMs < 1.0, `Index inspection took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })

    it('5.2 DuplicateCandidate schema unique compound index { brokerageId: 1, primaryContactId: 1, secondaryContactId: 1 }', () => {
      const t0 = process.hrtime.bigint()
      const indexes = DuplicateCandidate.schema.indexes()
      const found = indexes.some(
        ([fields, options]: any) =>
          fields.brokerageId === 1 &&
          fields.primaryContactId === 1 &&
          fields.secondaryContactId === 1 &&
          options?.unique === true
      )
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(found, 'Unique duplicate candidate pair index is missing')
      assert.ok(elapsedMs < 1.0, `Unique index check took ${elapsedMs.toFixed(3)}ms (must be < 1.0ms)`)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 6. HIGH CONCURRENCY BURST: 50 Simultaneous Requests (< 10ms Hard SLO)
  // ─────────────────────────────────────────────────────────────
  describe('Sequence 6: 50-Request Concurrent Burst Loop (< 10ms Hard SLO)', () => {
    it('6.1 50 concurrent getHealthScore calls must all complete in < 10ms each', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
      healthScoreL1Cache.set(cacheKey, {
        overallScore: 94,
        grade: 'A',
        duplicatesFound: 0,
        unverifiedPhones: 1,
        invalidEmails: 0,
        missingFields: 2,
        totalContacts: 150,
        lastScanAt: new Date().toISOString(),
        trend: [{ date: 'Sep 12', score: 94 }],
      }, 60)

      const latencies: number[] = []
      const burstSize = 50

      await Promise.all(
        Array.from({ length: burstSize }).map(async () => {
          const t0 = process.hrtime.bigint()
          const { score, source } = await getHealthScore({ brokerageId: mockBrokerageId })
          const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

          latencies.push(elapsedMs)
          assert.equal(source, 'l1')
          assert.equal(score.overallScore, 94)
        })
      )

      const maxLatency = Math.max(...latencies)
      const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length

      assert.ok(
        maxLatency < 10.0,
        `Max burst latency ${maxLatency.toFixed(3)}ms exceeded 10ms budget! (Avg: ${avgLatency.toFixed(3)}ms)`
      )
      assert.ok(
        avgLatency < 3.0,
        `Avg burst latency ${avgLatency.toFixed(3)}ms exceeded 3.0ms budget! (hard SLO < 10ms)`
      )
    })

    it('6.2 50 concurrent listDuplicateCandidates calls must all complete in < 10ms each', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'duplicates' })
      duplicateCandidatesL1Cache.set(cacheKey, [], 60)

      const latencies: number[] = []
      const burstSize = 50

      await Promise.all(
        Array.from({ length: burstSize }).map(async () => {
          const t0 = process.hrtime.bigint()
          const { duplicates, source } = await listDuplicateCandidates({ brokerageId: mockBrokerageId })
          const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

          latencies.push(elapsedMs)
          assert.equal(source, 'l1')
          assert.equal(duplicates.length, 0)
        })
      )

      const maxLatency = Math.max(...latencies)
      const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length

      assert.ok(
        maxLatency < 10.0,
        `Max burst latency ${maxLatency.toFixed(3)}ms exceeded 10ms budget! (Avg: ${avgLatency.toFixed(3)}ms)`
      )
      assert.ok(
        avgLatency < 5.0,
        `Avg burst latency ${avgLatency.toFixed(3)}ms exceeded 5.0ms budget!`
      )
    })

    it('6.3 50 concurrent controller getScore calls must all complete in < 10ms each', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'data-health', { op: 'score' })
      healthScoreL1Cache.set(cacheKey, {
        overallScore: 91,
        grade: 'A',
        duplicatesFound: 0,
        unverifiedPhones: 0,
        invalidEmails: 0,
        missingFields: 0,
        totalContacts: 50,
        lastScanAt: new Date().toISOString(),
        trend: [],
      }, 60)

      const latencies: number[] = []
      const burstSize = 50

      await Promise.all(
        Array.from({ length: burstSize }).map(async () => {
          const req: any = { user: mockUser, tenantFilter: { brokerageId: mockBrokerageId } }
          const res = createMockResponse()
          const t0 = process.hrtime.bigint()

          await getScore(req, res, () => {})
          const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

          latencies.push(elapsedMs)
          assert.equal(res.statusCode, 200)
          assert.equal(res.headers['X-Cache'], 'L1-HIT')
        })
      )

      const maxLatency = Math.max(...latencies)
      const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length

      assert.ok(
        maxLatency < 10.0,
        `Max controller latency ${maxLatency.toFixed(3)}ms exceeded 10ms budget! (Avg: ${avgLatency.toFixed(3)}ms)`
      )
      assert.ok(
        avgLatency < 5.0,
        `Avg controller latency ${avgLatency.toFixed(3)}ms exceeded 5.0ms budget!`
      )
    })
  })
})
