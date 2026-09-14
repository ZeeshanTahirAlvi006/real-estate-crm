import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  radarService,
  prospectsL1Cache,
  dashboardL1Cache,
  cmaReportL1Cache,
  cmaHtmlL1Cache,
  activeBuyersL1Cache,
  invalidateSellerRadarCaches,
} from '../../src/features/seller-radar/radar.service.js'
import { radarController } from '../../src/features/seller-radar/radar.controller.js'
import { attomProvider, valuationL1Cache } from '../../src/features/seller-radar/attom.provider.js'
import { Property } from '../../src/models/Property.js'
import { CmaReport } from '../../src/models/CmaReport.js'
import { Contact } from '../../src/models/Contact.js'
import { Brokerage } from '../../src/models/Brokerage.js'
import { IUser } from '../../src/models/User.js'
import { buildCacheKey } from '../../src/utils/cacheHelper.js'
import { HTTP_STATUS } from '../../src/utils/constants.js'

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
    send(payload: any) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
    accepts(type: string) {
      return type === 'html'
    },
  }
  return res
}

describe('aidlc-quality-agent: Seller Radar Exhaustive Function & Sequence Latency SLO (< 10ms)', () => {
  const mockBrokerageId = new mongoose.Types.ObjectId()
  const mockUserId = new mongoose.Types.ObjectId()

  const mockUser: IUser = {
    _id: mockUserId,
    brokerageId: mockBrokerageId,
    email: 'agent@proppulse.test',
    firstName: 'Sarah',
    lastName: 'Connor',
    role: 'agent',
  } as any

  const sampleAddress = {
    street: '1200 Barton Springs Rd',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    formattedAddress: '1200 Barton Springs Rd, Austin, TX 78704',
  }

  beforeEach(() => {
    prospectsL1Cache.clear()
    dashboardL1Cache.clear()
    cmaReportL1Cache.clear()
    cmaHtmlL1Cache.clear()
    activeBuyersL1Cache.clear()
    valuationL1Cache.clear()
  })

  // =========================================================================
  // SUITE 1: INDIVIDUAL FUNCTION BENCHMARKS (ALL FUNCTIONS MUST BE < 10ms)
  // =========================================================================
  describe('Suite 1: Individual Function Benchmarks (< 10ms Limit)', () => {
    // 1. attomProvider.generateNearbyComps
    it('1. attomProvider.generateNearbyComps completes in < 10ms', () => {
      const t0 = process.hrtime.bigint()
      const comps = attomProvider.generateNearbyComps(sampleAddress, 650000, 2400, 3, 2)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `generateNearbyComps took ${deltaMs.toFixed(3)}ms (exceeded 10ms budget)`)
      assert.strictEqual(comps.length, 4)
      assert.ok(comps[0].soldPrice > 0)
    })

    // 2. attomProvider.generateDeterministicAnalysis
    it('2. attomProvider.generateDeterministicAnalysis completes in < 10ms', () => {
      const t0 = process.hrtime.bigint()
      const analysis = attomProvider.generateDeterministicAnalysis(
        sampleAddress,
        450000,
        new Date('2017-06-01'),
        3.5,
        2200,
        3,
        2
      )
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `generateDeterministicAnalysis took ${deltaMs.toFixed(3)}ms (exceeded 10ms budget)`)
      assert.ok(analysis.estimatedValue > 450000)
      assert.ok(analysis.equity > 0)
      assert.strictEqual(analysis.comps.length, 4)
    })

    // 3. attomProvider.analyzePropertyEquity (Uncached & Cached)
    it('3. attomProvider.analyzePropertyEquity completes in < 10ms (both fresh & cached)', async () => {
      // Fresh run
      const t0 = process.hrtime.bigint()
      const fresh = await attomProvider.analyzePropertyEquity(sampleAddress, 500000, new Date('2018-01-01'))
      const deltaMsFresh = Number(process.hrtime.bigint() - t0) / 1e6
      assert.ok(deltaMsFresh < 10.0, `analyzePropertyEquity fresh took ${deltaMsFresh.toFixed(3)}ms`)

      // Cached run
      const t1 = process.hrtime.bigint()
      const cached = await attomProvider.analyzePropertyEquity(sampleAddress, 500000, new Date('2018-01-01'))
      const deltaMsCached = Number(process.hrtime.bigint() - t1) / 1e6
      assert.ok(deltaMsCached < 1.0, `analyzePropertyEquity cached took ${deltaMsCached.toFixed(3)}ms`)
      assert.strictEqual(cached.estimatedValue, fresh.estimatedValue)
    })

    // 4. radarService.calculateSellPropensity
    it('4. radarService.calculateSellPropensity completes in < 10ms across boundary cases', () => {
      const cases = [
        { equityPct: 75, years: 9, rate: 3.0, equity: 800000, anniversary: true },
        { equityPct: 55, years: 14, rate: 4.5, equity: 450000, anniversary: false },
        { equityPct: 38, years: 6, rate: 6.0, equity: 200000, anniversary: false },
        { equityPct: 15, years: 1, rate: 7.0, equity: 50000, anniversary: false },
      ]

      for (const c of cases) {
        const t0 = process.hrtime.bigint()
        const result = radarService.calculateSellPropensity(c.equityPct, c.years, c.rate, c.equity, c.anniversary)
        const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

        assert.ok(deltaMs < 10.0, `calculateSellPropensity took ${deltaMs.toFixed(3)}ms`)
        assert.ok(result.score >= 10 && result.score <= 98)
        assert.ok(Array.isArray(result.signals))
        assert.ok(result.primarySignal.length > 0)
      }
    })

    // 5. radarService.renderNarrativeSnippet
    it('5. radarService.renderNarrativeSnippet formats markdown into HTML in < 10ms', () => {
      const rawMarkdown = `
        ### Executive Market Summary
        *Confidential Client Overview*
        **Executive Summary**
        The subject residence demonstrates exceptional appreciation of **$320,000**.
        - Comparable sales show high velocity in local radius.
        - Strategic recommendation: Prepare for peak spring listing.
      `
      const t0 = process.hrtime.bigint()
      const html = (radarService as any).renderNarrativeSnippet(rawMarkdown)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `renderNarrativeSnippet took ${deltaMs.toFixed(3)}ms`)
      assert.ok(html.includes('<h2 class="narrative-headline">Executive Market Summary</h2>'))
      assert.ok(html.includes('<strong class="narrative-strong">'))
    })

    // 6. radarService.renderCmaHtml
    it('6. radarService.renderCmaHtml completes in < 10ms', () => {
      const mockReport: any = {
        _id: new mongoose.Types.ObjectId(),
        shareId: 'cma_fn_bench',
        subjectProperty: {
          formattedAddress: '2400 Rio Grande St, Austin, TX',
          beds: 3,
          baths: 2,
          squareFeet: 2100,
          estimatedValue: 620000,
          equity: 350000,
          equityPercent: 56,
        },
        valuationRange: { low: 590000, target: 620000, high: 650000, confidenceScore: 92 },
        comparables: [],
        activeBuyerDemandCount: 32,
        agentBranding: {
          name: 'Sarah Connor',
          phone: '555-019-2834',
          email: 'sarah@proppulse.test',
          brokerageName: 'PropPulse Realty',
        },
        customNarrative: '### Great Property\nSolid equity growth.',
      }

      // JIT engine warmup
      radarService.renderCmaHtml({ ...mockReport, shareId: undefined })

      const t0 = process.hrtime.bigint()
      const html = radarService.renderCmaHtml(mockReport)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `renderCmaHtml took ${deltaMs.toFixed(3)}ms (budget is 10ms)`)
      assert.ok(html.includes('2400 Rio Grande St'))
    })

    // 7. radarService.calculateActiveBuyerDemand
    it('7. radarService.calculateActiveBuyerDemand completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 25, 300)

      const t0 = process.hrtime.bigint()
      const demand = await radarService.calculateActiveBuyerDemand(mockBrokerageId, 700000)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `calculateActiveBuyerDemand took ${deltaMs.toFixed(3)}ms`)
      assert.ok(demand >= 18 && demand <= 68)
    })

    // 8. radarService.analyzeProperty
    it('8. radarService.analyzeProperty completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 30, 300)

      const t0 = process.hrtime.bigint()
      const analysis = await radarService.analyzeProperty(mockUser, {
        address: sampleAddress,
        purchasePrice: 420000,
        purchaseDate: '2019-03-01',
      })
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `analyzeProperty took ${deltaMs.toFixed(3)}ms`)
      assert.ok(analysis.estimatedValue > 420000)
      assert.ok(analysis.probabilityOfSelling >= 10)
    })

    // 9. radarService.getProspects
    it('9. radarService.getProspects completes in < 10ms (cached)', async () => {
      const filters = { page: 1, limit: 10 }
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:prospects', filters)
      prospectsL1Cache.set(cacheKey, { prospects: [], total: 0, page: 1, limit: 10 }, 30)

      const t0 = process.hrtime.bigint()
      const result = await radarService.getProspects(mockUser, filters)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `getProspects took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(result.page, 1)
    })

    // 10. radarService.getDashboardMetrics
    it('10. radarService.getDashboardMetrics completes in < 10ms (cached)', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:dashboard', 'metrics')
      dashboardL1Cache.set(
        cacheKey,
        {
          totalProspects: 50,
          totalEquity: 15000000,
          avgEquity: 300000,
          avgSellProbability: 75,
          hotProspectsCount: 15,
          warmProspectsCount: 20,
          anniversariesThisMonth: 5,
          equityDistribution: { under200k: 10, between200kAnd500k: 25, above500k: 15 },
          topProspects: [],
        },
        60
      )

      const t0 = process.hrtime.bigint()
      const metrics = await radarService.getDashboardMetrics(mockUser)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `getDashboardMetrics took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(metrics.totalProspects, 50)
    })

    // 11. radarService.generateMicroCma
    it('11. radarService.generateMicroCma completes in < 10ms with mocked DB write', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 35, 300)

      const originalBrokerageFindById = Brokerage.findById
      const originalCmaCreate = CmaReport.create
      try {
        Brokerage.findById = (() => ({
          select: () => ({
            lean: async () => ({ name: 'PropPulse Realty' }),
          }),
        })) as any

        CmaReport.create = (async (doc: any) => ({
          ...doc,
          toObject: () => doc,
        })) as any

        const t0 = process.hrtime.bigint()
        const cma = await radarService.generateMicroCma(mockUser, {
          address: sampleAddress,
          customNarrative: 'Fast turnaround analysis',
        })
        const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

        assert.ok(deltaMs < 10.0, `generateMicroCma took ${deltaMs.toFixed(3)}ms`)
        assert.ok(cma.shareId.startsWith('cma_'))
        assert.ok(cma.publicUrl.includes(cma.shareId))
      } finally {
        Brokerage.findById = originalBrokerageFindById
        CmaReport.create = originalCmaCreate
      }
    })

    // 12. radarService.getCmaReport
    it('12. radarService.getCmaReport completes in < 10ms (cached & public view)', async () => {
      const mockReport = {
        _id: new mongoose.Types.ObjectId(),
        shareId: 'cma_report_get_test',
        subjectProperty: { formattedAddress: '123 Test St' },
        valuationRange: { low: 500000, target: 530000, high: 560000 },
        comparables: [],
        agentBranding: { name: 'Sarah', phone: '123', email: 's@p.test', brokerageName: 'Test' },
      }
      cmaReportL1Cache.set('cma_report_get_test', mockReport, 120)

      const t0 = process.hrtime.bigint()
      const report = await radarService.getCmaReport('cma_report_get_test', true)
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `getCmaReport took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(report.shareId, 'cma_report_get_test')
    })

    // 13. radarController.getProspects
    it('13. radarController.getProspects completes in < 10ms', async () => {
      const filters = { page: 1, limit: 10 }
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:prospects', filters)
      prospectsL1Cache.set(cacheKey, { prospects: [], total: 0, page: 1, limit: 10 }, 30)

      const req: any = { user: mockUser, query: filters }
      const res = createMockResponse()

      const t0 = process.hrtime.bigint()
      await radarController.getProspects(req, res, () => {})
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `radarController.getProspects took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(res.statusCode, 200)
    })

    // 14. radarController.getDashboard
    it('14. radarController.getDashboard completes in < 10ms', async () => {
      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:dashboard', 'metrics')
      dashboardL1Cache.set(cacheKey, { totalProspects: 10 } as any, 60)

      const req: any = { user: mockUser, query: {} }
      const res = createMockResponse()

      const t0 = process.hrtime.bigint()
      await radarController.getDashboard(req, res, () => {})
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `radarController.getDashboard took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(res.statusCode, 200)
    })

    // 15. radarController.analyze
    it('15. radarController.analyze completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 30, 300)

      const req: any = { user: mockUser, body: { address: sampleAddress } }
      const res = createMockResponse()

      const t0 = process.hrtime.bigint()
      await radarController.analyze(req, res, () => {})
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `radarController.analyze took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(res.statusCode, 200)
    })

    // 16. radarController.generateCma
    it('16. radarController.generateCma completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 30, 300)

      const originalBrokerageFindById = Brokerage.findById
      const originalCmaCreate = CmaReport.create
      try {
        Brokerage.findById = (() => ({
          select: () => ({
            lean: async () => ({ name: 'PropPulse Realty' }),
          }),
        })) as any

        CmaReport.create = (async (doc: any) => ({
          ...doc,
          toObject: () => doc,
        })) as any

        const req: any = { user: mockUser, body: { address: sampleAddress } }
        const res = createMockResponse()

        const t0 = process.hrtime.bigint()
        await radarController.generateCma(req, res, () => {})
        const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

        assert.ok(deltaMs < 10.0, `radarController.generateCma took ${deltaMs.toFixed(3)}ms`)
        assert.strictEqual(res.statusCode, 201)
      } finally {
        Brokerage.findById = originalBrokerageFindById
        CmaReport.create = originalCmaCreate
      }
    })

    // 17. radarController.getPublicCma (HTML mode)
    it('17. radarController.getPublicCma (HTML mode) completes in < 10ms', async () => {
      const mockReport = {
        _id: new mongoose.Types.ObjectId(),
        shareId: 'cma_pub_html',
        subjectProperty: { formattedAddress: '500 E 4th St, Austin, TX' },
        valuationRange: { low: 450000, target: 480000, high: 510000 },
        comparables: [],
        agentBranding: { name: 'Sarah', phone: '555-1234', email: 's@p.test', brokerageName: 'Test' },
      }
      cmaReportL1Cache.set('cma_pub_html', mockReport, 120)

      const req: any = {
        params: { id: 'cma_pub_html' },
        query: { format: 'html' },
        accepts: () => true,
      }
      const res = createMockResponse()

      const t0 = process.hrtime.bigint()
      await radarController.getPublicCma(req, res, () => {})
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `radarController.getPublicCma (HTML) took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.headers['Content-Type'], 'text/html; charset=utf-8')
    })

    // 18. radarController.getPublicCma (JSON mode)
    it('18. radarController.getPublicCma (JSON mode) completes in < 10ms', async () => {
      const mockReport = {
        _id: new mongoose.Types.ObjectId(),
        shareId: 'cma_pub_json',
        subjectProperty: { formattedAddress: '500 E 4th St, Austin, TX' },
        valuationRange: { low: 450000, target: 480000, high: 510000 },
        comparables: [],
        agentBranding: { name: 'Sarah', phone: '555-1234', email: 's@p.test', brokerageName: 'Test' },
      }
      cmaReportL1Cache.set('cma_pub_json', mockReport, 120)

      const req: any = {
        params: { id: 'cma_pub_json' },
        query: { format: 'json' },
        accepts: () => false,
      }
      const res = createMockResponse()

      const t0 = process.hrtime.bigint()
      await radarController.getPublicCma(req, res, () => {})
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `radarController.getPublicCma (JSON) took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(res.statusCode, 200)
      assert.strictEqual(res.body?.data?.shareId, 'cma_pub_json')
    })

    // 19. invalidateSellerRadarCaches
    it('19. invalidateSellerRadarCaches completes in < 10ms', async () => {
      prospectsL1Cache.set('test1', {} as any)
      dashboardL1Cache.set('test2', {} as any)
      cmaReportL1Cache.set('test3', {} as any)
      cmaHtmlL1Cache.set('test4', 'html')
      activeBuyersL1Cache.set('test5', 10)

      const t0 = process.hrtime.bigint()
      await invalidateSellerRadarCaches(mockBrokerageId.toString())
      const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6

      assert.ok(deltaMs < 10.0, `invalidateSellerRadarCaches took ${deltaMs.toFixed(3)}ms`)
      assert.strictEqual(prospectsL1Cache.size, 0)
      assert.strictEqual(dashboardL1Cache.size, 0)
      assert.strictEqual(cmaReportL1Cache.size, 0)
      assert.strictEqual(cmaHtmlL1Cache.size, 0)
    })
  })

  // =========================================================================
  // SUITE 2: FULL END-TO-END EXECUTION SEQUENCES (< 10ms PER SEQUENCE)
  // =========================================================================
  describe('Suite 2: Complete End-to-End Execution Sequences (< 10ms)', () => {
    // Sequence A: Prospect Evaluation & Analysis
    it('Sequence A: Propensity Scoring -> Valuation -> Property Analysis completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 40, 300)

      const tSeq = process.hrtime.bigint()

      // Step 1: Calculate sell propensity
      const propensity = radarService.calculateSellPropensity(65, 8.5, 3.25, 450000, true)
      assert.ok(propensity.score >= 80)

      // Step 2: Attom equity valuation
      const equityAnalysis = await attomProvider.analyzePropertyEquity(sampleAddress, 480000, new Date('2017-01-01'))
      assert.ok(equityAnalysis.estimatedValue > 480000)

      // Step 3: Full property analysis
      const analysis = await radarService.analyzeProperty(mockUser, {
        address: sampleAddress,
        purchasePrice: 480000,
        purchaseDate: '2017-01-01',
      })
      assert.ok(analysis.probabilityOfSelling > 0)

      const deltaMsSeq = Number(process.hrtime.bigint() - tSeq) / 1e6
      assert.ok(deltaMsSeq < 10.0, `Sequence A took ${deltaMsSeq.toFixed(3)}ms (exceeded 10ms budget)`)
    })

    // Sequence B: Dashboard Intelligence & Demand Calculation
    it('Sequence B: Demand Intelligence -> Dashboard Retrieval completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 38, 300)

      const cacheKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:dashboard', 'metrics')
      dashboardL1Cache.set(
        cacheKey,
        {
          totalProspects: 120,
          totalEquity: 36000000,
          avgEquity: 300000,
          avgSellProbability: 74,
          hotProspectsCount: 35,
          warmProspectsCount: 50,
          anniversariesThisMonth: 8,
          equityDistribution: { under200k: 20, between200kAnd500k: 70, above500k: 30 },
          topProspects: [],
        },
        60
      )

      const tSeq = process.hrtime.bigint()

      // Step 1: Active buyer demand
      const demand = await radarService.calculateActiveBuyerDemand(mockBrokerageId, 620000)
      assert.ok(demand >= 18)

      // Step 2: Dashboard metrics retrieval
      const metrics = await radarService.getDashboardMetrics(mockUser)
      assert.strictEqual(metrics.totalProspects, 120)

      // Step 3: Controller dispatch
      const req: any = { user: mockUser, query: {} }
      const res = createMockResponse()
      await radarController.getDashboard(req, res, () => {})
      assert.strictEqual(res.statusCode, 200)

      const deltaMsSeq = Number(process.hrtime.bigint() - tSeq) / 1e6
      assert.ok(deltaMsSeq < 10.0, `Sequence B took ${deltaMsSeq.toFixed(3)}ms (exceeded 10ms budget)`)
    })

    // Sequence C: Micro-CMA Generation -> Render -> Public View Lifecycle
    it('Sequence C: Generate CMA -> Render HTML -> Serve Public Landing Page completes in < 10ms', async () => {
      activeBuyersL1Cache.set(`active_buyers:${mockBrokerageId.toString()}`, 28, 300)

      const originalBrokerageFindById = Brokerage.findById
      const originalCmaCreate = CmaReport.create
      try {
        Brokerage.findById = (() => ({
          select: () => ({
            lean: async () => ({ name: 'PropPulse Realty' }),
          }),
        })) as any

        CmaReport.create = (async (doc: any) => ({
          ...doc,
          toObject: () => doc,
        })) as any

        const tSeq = process.hrtime.bigint()

        // Step 1: Generate CMA
        const cma = await radarService.generateMicroCma(mockUser, {
          address: sampleAddress,
          customNarrative: '### Rapid Valuation\nExcellent equity accumulation.',
        })
        assert.ok(cma.shareId.startsWith('cma_'))

        // Step 2: Render HTML
        const html = radarService.renderCmaHtml(cma as any)
        assert.ok(html.includes('1200 Barton Springs Rd'))

        // Step 3: Public View controller dispatch
        const req: any = {
          params: { id: cma.shareId },
          query: { format: 'html' },
          accepts: () => true,
        }
        const res = createMockResponse()
        await radarController.getPublicCma(req, res, () => {})
        assert.strictEqual(res.statusCode, 200)
        assert.strictEqual(res.headers['Content-Type'], 'text/html; charset=utf-8')

        const deltaMsSeq = Number(process.hrtime.bigint() - tSeq) / 1e6
        assert.ok(deltaMsSeq < 10.0, `Sequence C took ${deltaMsSeq.toFixed(3)}ms (exceeded 10ms budget)`)
      } finally {
        Brokerage.findById = originalBrokerageFindById
        CmaReport.create = originalCmaCreate
      }
    })

    // Sequence D: Cache Lifecycle & Mutation Invalidation
    it('Sequence D: Populate All L1 Caches -> Verify Hits -> Trigger Mutation Invalidation completes in < 10ms', async () => {
      const tSeq = process.hrtime.bigint()

      // 1. Populate
      const prospectsKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:prospects', {})
      prospectsL1Cache.set(prospectsKey, { prospects: [], total: 0, page: 1, limit: 10 })
      const dashKey = buildCacheKey(mockBrokerageId.toString(), 'seller-radar:dashboard', 'metrics')
      dashboardL1Cache.set(dashKey, { totalProspects: 1 } as any)
      cmaReportL1Cache.set('cma_seq_d', { shareId: 'cma_seq_d' })
      cmaHtmlL1Cache.set('cma_seq_d', '<html></html>')

      assert.strictEqual(prospectsL1Cache.size, 1)
      assert.strictEqual(dashboardL1Cache.size, 1)
      assert.strictEqual(cmaReportL1Cache.size, 1)
      assert.strictEqual(cmaHtmlL1Cache.size, 1)

      // 2. Read Hits
      assert.ok(prospectsL1Cache.get(prospectsKey) !== null)
      assert.ok(dashboardL1Cache.get(dashKey) !== null)
      assert.ok(cmaReportL1Cache.get('cma_seq_d') !== null)
      assert.ok(cmaHtmlL1Cache.get('cma_seq_d') !== null)

      // 3. Invalidate
      await invalidateSellerRadarCaches(mockBrokerageId.toString())

      assert.strictEqual(prospectsL1Cache.size, 0)
      assert.strictEqual(dashboardL1Cache.size, 0)
      assert.strictEqual(cmaReportL1Cache.size, 0)
      assert.strictEqual(cmaHtmlL1Cache.size, 0)

      const deltaMsSeq = Number(process.hrtime.bigint() - tSeq) / 1e6
      assert.ok(deltaMsSeq < 10.0, `Sequence D took ${deltaMsSeq.toFixed(3)}ms (exceeded 10ms budget)`)
    })

    // Sequence E: Security Authentication Guard Matrix
    it('Sequence E: Unauthenticated & Missing Brokerage Security Matrix completes in < 10ms', async () => {
      const tSeq = process.hrtime.bigint()

      const unauthReq: any = { user: undefined, query: {}, body: {} }
      const noBrokerageReq: any = { user: { email: 'bad@test.com' }, query: {}, body: {} }

      // Check all 5 protected controller endpoints
      const endpoints = [
        (res: any) => radarController.getProspects(unauthReq, res, () => {}),
        (res: any) => radarController.getDashboard(unauthReq, res, () => {}),
        (res: any) => radarController.analyze(unauthReq, res, () => {}),
        (res: any) => radarController.generateCma(unauthReq, res, () => {}),
        (res: any) => radarController.triggerAnniversary(unauthReq, res, () => {}),
        (res: any) => radarController.getProspects(noBrokerageReq, res, () => {}),
        (res: any) => radarController.getDashboard(noBrokerageReq, res, () => {}),
        (res: any) => radarController.analyze(noBrokerageReq, res, () => {}),
        (res: any) => radarController.generateCma(noBrokerageReq, res, () => {}),
        (res: any) => radarController.triggerAnniversary(noBrokerageReq, res, () => {}),
      ]

      for (const ep of endpoints) {
        const res = createMockResponse()
        await ep(res)
        assert.strictEqual(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
        assert.strictEqual(res.body?.success, false)
      }

      const deltaMsSeq = Number(process.hrtime.bigint() - tSeq) / 1e6
      assert.ok(deltaMsSeq < 10.0, `Sequence E took ${deltaMsSeq.toFixed(3)}ms (exceeded 10ms budget)`)
    })
  })
})
