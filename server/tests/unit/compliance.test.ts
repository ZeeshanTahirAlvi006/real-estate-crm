import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { complianceService } from '../../src/features/compliance/compliance.service.js'

describe('Compliance & TCPA Unit Tests', () => {
  it('should detect familial status Fair Housing violations', () => {
    const text = 'Beautiful apartment, no kids allowed.'
    const report = complianceService.scanListingContent(text)

    assert.equal(report.isCompliant, false)
    assert.ok(report.totalViolations > 0)
    const violation = report.violations.find((v) => v.phrase.toLowerCase().includes('no kids'))
    assert.ok(violation)
    assert.equal(violation.severity, 'high')
  })

  it('should detect religious demographic steering violations', () => {
    const text = 'Spacious house located in a quiet Christian neighborhood near the church.'
    const report = complianceService.scanListingContent(text)

    assert.equal(report.isCompliant, false)
    assert.ok(report.violations.some((v) => v.phrase.toLowerCase().includes('christian neighborhood')))
  })

  it('should generate compliant replacement copy', () => {
    const text = 'Cozy starter home, perfect for singles with no kids.'
    const report = complianceService.scanListingContent(text)

    assert.equal(report.isCompliant, false)
    assert.ok(report.cleanedText)
    assert.ok(!report.cleanedText.includes('no kids'))
  })

  it('should approve fully compliant listing copy', () => {
    const text = 'Stunning 4-bedroom contemporary home featuring open floor plan, chef kitchen, and private backyard.'
    const report = complianceService.scanListingContent(text)

    assert.equal(report.isCompliant, true)
    assert.equal(report.totalViolations, 0)
  })

  it('should correctly flag simulated Federal DNC numbers ending in 9999', async () => {
    const result = await complianceService.checkPhoneNumber('+1 (555) 345-9999')
    assert.equal(result.isClean, false)
    assert.equal(result.dncStatus, 'dnc_federal')
    assert.equal(result.canCall, false)
    assert.equal(result.canText, false)
  })

  it('should approve standard clean non-DNC phone numbers', async () => {
    const result = await complianceService.checkPhoneNumber('+1 (555) 345-1234')
    assert.equal(result.isClean, true)
    assert.equal(result.dncStatus, 'clean')
    assert.equal(result.canText, true)
  })
})
