import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { objectionService } from '../../src/features/ai-chatbot/objections/objection.service.js'

describe('Objection Classifier & Rebuttals Unit Tests', () => {
  it('should accurately classify interest rate objections', () => {
    const text = 'Mortgage rates are over 7%, our monthly payments would be way too high right now.'
    const result = objectionService.classifyObjection(text)

    assert.equal(result.category, 'interest_rates')
    assert.ok(result.confidence > 0.6)
    assert.ok(result.detectedPhrases.length > 0)
    assert.ok(result.detectedPhrases.some((p) => p.includes('rate') || p.includes('7%') || p.includes('monthly payment')))
  })

  it('should accurately classify market crash and bubble objections', () => {
    const text = 'We think the housing market is in a bubble and prices will crash 20% like in 2008.'
    const result = objectionService.classifyObjection(text)

    assert.equal(result.category, 'market_crash')
    assert.ok(result.confidence > 0.6)
    assert.ok(result.detectedPhrases.some((p) => p.includes('crash') || p.includes('bubble') || p.includes('2008')))
  })

  it('should accurately classify commission fee objections', () => {
    const text = 'Why should I pay 6% commission fee when a discount broker like Redfin will list it for less?'
    const result = objectionService.classifyObjection(text)

    assert.equal(result.category, 'commission_fees')
    assert.ok(result.confidence > 0.6)
    assert.ok(result.detectedPhrases.some((p) => p.includes('commission') || p.includes('discount broker') || p.includes('redfin')))
  })

  it('should accurately classify aggressive lowball offer objections', () => {
    const text = 'The house has been on the market for 60 days, let us submit a lowball offer 50k less than asking.'
    const result = objectionService.classifyObjection(text)

    assert.equal(result.category, 'lowball_offers')
    assert.ok(result.confidence > 0.6)
    assert.ok(result.detectedPhrases.some((p) => p.includes('lowball') || p.includes('50k less')))
  })

  it('should accurately classify timing indecision and delay objections', () => {
    const text = 'We are not ready to commit yet, we want to wait until spring to start making offers.'
    const result = objectionService.classifyObjection(text)

    assert.equal(result.category, 'timing_delay')
    assert.ok(result.confidence > 0.6)
    assert.ok(result.detectedPhrases.some((p) => p.includes('wait until spring') || p.includes('not ready')))
  })

  it('should generate 3 distinct rebuttal angles with required fields', async () => {
    const response = await objectionService.generateRebuttals({
      messageText: 'Mortgage rates are 7%, we want to wait until the Fed lowers interest rates.',
      category: 'interest_rates',
    })

    assert.equal(response.category, 'interest_rates')
    assert.ok(response.rebuttals.analytical.script.length > 50)
    assert.ok(response.rebuttals.empathetic.script.length > 50)
    assert.ok(response.rebuttals.urgency.script.length > 50)
    assert.equal(response.fairHousingPassed, true)
  })

  it('should provide default curated playbooks across all objection categories', async () => {
    const playbooks = await objectionService.getPlaybooks()
    assert.ok(playbooks.length >= 5)

    const categories = playbooks.map((p) => p.category)
    assert.ok(categories.includes('interest_rates'))
    assert.ok(categories.includes('market_crash'))
    assert.ok(categories.includes('commission_fees'))
    assert.ok(categories.includes('lowball_offers'))
    assert.ok(categories.includes('timing_delay'))
  })
})
