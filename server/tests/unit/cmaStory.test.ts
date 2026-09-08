import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cmaStoryService } from '../../src/features/seller-radar/cma-ai/cmaStory.service.js'
import { CmaSubjectPropertyInput, CmaComparableInput } from '../../src/features/seller-radar/cma-ai/cmaStory.types.js'

describe('Sprint 24 — CMA AI Storytelling & Equity Narrative Engine Unit Tests', () => {
  const mockSubject: CmaSubjectPropertyInput = {
    formattedAddress: '742 Evergreen Terrace, Springfield, OR 97477',
    beds: 4,
    baths: 2.5,
    squareFeet: 2400,
    propertyType: 'single_family',
    purchaseDate: '2020-01-15T00:00:00.000Z',
    purchasePrice: 500000,
    estimatedValue: 750000,
    estimatedMortgageBalance: 360000,
    equity: 390000,
    equityPercent: 52,
  }

  const mockComps: CmaComparableInput[] = [
    {
      address: '748 Evergreen Terrace',
      soldPrice: 760000,
      beds: 4,
      baths: 2.5,
      squareFeet: 2450,
      pricePerSqft: 310,
      daysOnMarket: 8,
      distanceMiles: 0.1,
    },
    {
      address: '712 Elm Street',
      soldPrice: 740000,
      beds: 4,
      baths: 2,
      squareFeet: 2350,
      pricePerSqft: 315,
      daysOnMarket: 12,
      distanceMiles: 0.3,
    },
    {
      address: '805 Oak Valley Way',
      soldPrice: 775000,
      beds: 4,
      baths: 3,
      squareFeet: 2500,
      pricePerSqft: 310,
      daysOnMarket: 9,
      distanceMiles: 0.5,
    },
  ]

  it('should accurately calculate mathematical financial and submarket metrics', () => {
    const metrics = cmaStoryService.calculateMetrics(mockSubject, mockComps)

    // Check appreciation metrics
    assert.equal(metrics.appreciationTotalDollar, 250000)
    assert.equal(metrics.appreciationTotalPercent, 50)
    assert.ok(metrics.appreciationAnnualCagr > 5 && metrics.appreciationAnnualCagr < 15)
    assert.ok(metrics.monthlyEquityAccrual > 0)
    assert.ok(metrics.holdingPeriodYears > 4)

    // Check comp metrics
    assert.equal(metrics.compCount, 3)
    assert.equal(metrics.medianSoldPrice, 760000)
    assert.ok(metrics.avgCompPriceSqft >= 310 && metrics.avgCompPriceSqft <= 315)
    assert.ok(metrics.avgDaysOnMarket <= 14)
    assert.equal(metrics.marketVelocity, 'Fast (Seller-Favorable)')
  })

  it('should generate a high-impact Seller Mode narrative with equity appreciation', () => {
    const metrics = cmaStoryService.calculateMetrics(mockSubject, mockComps)
    const story = cmaStoryService.generateDeterministicFallback('seller', mockSubject, mockComps, metrics, {
      low: 720000,
      target: 750000,
      high: 780000,
    })

    assert.ok(story.headline.includes('$750,000') || story.headline.includes('Valuation Analysis'))
    assert.ok(story.appreciationStory.includes('$250,000') || story.appreciationStory.includes('50.0%'))
    assert.ok(story.compsAnalysis.includes('748 Evergreen Terrace'))
    assert.ok(story.recommendedStrategy.includes('seller net proceeds') || story.recommendedStrategy.includes('target band'))
  })

  it('should generate a data-backed Buyer Mode narrative with fair market valuation corridor', () => {
    const metrics = cmaStoryService.calculateMetrics(mockSubject, mockComps)
    const story = cmaStoryService.generateDeterministicFallback('buyer', mockSubject, mockComps, metrics, {
      low: 720000,
      target: 750000,
      high: 780000,
    })

    assert.ok(story.headline.includes('Buyer Advisory') || story.headline.includes('Fair Market'))
    assert.ok(story.executiveSummary.includes('$720,000') && story.executiveSummary.includes('$780,000'))
    assert.ok(story.compsAnalysis.includes('748 Evergreen Terrace'))
    assert.ok(story.recommendedStrategy.includes('appraisal shortfalls') || story.recommendedStrategy.includes('proposals'))
  })

  it('should synthesize a full CmaStoryOutput with formatted HTML and Markdown snippets', async () => {
    const output = await cmaStoryService.generateNarrative({
      mode: 'seller',
      subjectProperty: mockSubject,
      comparables: mockComps,
      valuationRange: { low: 720000, target: 750000, high: 780000 },
      tone: 'consultative',
    })

    assert.equal(output.mode, 'seller')
    assert.ok(output.headline.length > 10)
    assert.ok(output.appreciationStory.length > 20)
    assert.ok(output.formattedHtml.includes('cma-story-card'))
    assert.ok(output.formattedMarkdown.includes('###'))
    assert.equal(output.compliance.passed, true)
    assert.equal(output.compliance.flags.length, 0)
    assert.ok(output.metrics.avgCompPriceSqft > 0)
  })

  it('should maintain strict Fair Housing compliance without protected class violations', async () => {
    const output = await cmaStoryService.generateNarrative({
      mode: 'buyer',
      subjectProperty: mockSubject,
      comparables: mockComps,
      valuationRange: { low: 720000, target: 750000, high: 780000 },
    })

    const fullContent = `${output.headline} ${output.executiveSummary} ${output.appreciationStory} ${output.compsAnalysis} ${output.recommendedStrategy}`

    // Verify no protected-class terms appear
    assert.equal(/\b(race|racial|caucasian|african american|church|synagogue|no kids|adults only)\b/i.test(fullContent), false)
    assert.equal(output.compliance.passed, true)
  })
})
