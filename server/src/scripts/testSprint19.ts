import { radarService } from '../features/seller-radar/radar.service.js'
import { attomProvider } from '../features/seller-radar/attom.provider.js'

async function runTests() {
  console.log('====================================================')
  console.log('🧪 RUNNING SPRINT 19 VERIFICATION TESTS')
  console.log('====================================================')

  let passed = 0
  let failed = 0

  // ── Test 1: Sell Propensity Calculation ──────────────────────────
  console.log('\n[Test 1] Testing Sell Propensity Algorithm...')
  try {
    const highEquityResult = radarService.calculateSellPropensity(65, 9.5, 3.12, 520000, true)
    console.log(`  High-equity 9.5yr milestone score: ${highEquityResult.score}%`)
    console.log(`  Signals: ${highEquityResult.primarySignal}`)

    if (highEquityResult.score >= 85 && highEquityResult.signals.length >= 3) {
      console.log('  ✅ Test 1 Passed: High sell propensity correctly calculated')
      passed++
    } else {
      console.error('  ❌ Test 1 Failed: Expected score >= 85')
      failed++
    }

    const lowEquityResult = radarService.calculateSellPropensity(18, 1.8, 6.25, 60000, false)
    console.log(`  Low-equity 1.8yr score: ${lowEquityResult.score}%`)
    if (lowEquityResult.score < 50) {
      console.log('  ✅ Low-tenure low-equity correctly scored lower')
      passed++
    } else {
      console.error('  ❌ Failed: Low equity scored too high')
      failed++
    }
  } catch (err: any) {
    console.error('  ❌ Test 1 Exception:', err.message)
    failed++
  }

  // ── Test 2: Deterministic ATTOM Fallback Engine ───────────────────
  console.log('\n[Test 2] Testing ATTOM Fallback Valuation & Comps Engine...')
  try {
    const analysis = attomProvider.generateDeterministicAnalysis(
      {
        street: '1420 Highland Ave',
        city: 'Austin',
        state: 'TX',
        zipCode: '78703',
        formattedAddress: '1420 Highland Ave, Austin TX 78703',
      },
      520000,
      new Date(Date.now() - 9.2 * 365.25 * 86400 * 1000),
      3.12,
      2850,
      4,
      3
    )

    console.log(`  Estimated Market Value: $${analysis.estimatedValue.toLocaleString()}`)
    console.log(`  Valuation Range: $${analysis.valuationLow.toLocaleString()} - $${analysis.valuationHigh.toLocaleString()}`)
    console.log(`  Amortized Mortgage Balance: $${analysis.estimatedMortgageBalance.toLocaleString()}`)
    console.log(`  Calculated Net Equity: $${analysis.equity.toLocaleString()} (${analysis.equityPercent}%)`)
    console.log(`  Generated Comps Count: ${analysis.comps.length}`)

    if (
      analysis.estimatedValue > 520000 &&
      analysis.equity > 0 &&
      analysis.comps.length >= 3 &&
      analysis.valuationLow < analysis.estimatedValue &&
      analysis.valuationHigh > analysis.estimatedValue
    ) {
      console.log('  ✅ Test 2 Passed: Deterministic ATTOM engine produced realistic valuation, range & comps')
      passed++
    } else {
      console.error('  ❌ Test 2 Failed: Output values invalid')
      failed++
    }
  } catch (err: any) {
    console.error('  ❌ Test 2 Exception:', err.message)
    failed++
  }

  // ── Test 3: Micro-CMA HTML Page Generator ───────────────────────
  console.log('\n[Test 3] Testing Micro-CMA HTML Landing Page Generator...')
  try {
    const mockCma: any = {
      shareId: 'cma_test_abc123',
      subjectProperty: {
        formattedAddress: '1420 Highland Ave, Austin TX 78703',
        beds: 4,
        baths: 3,
        squareFeet: 2850,
        estimatedValue: 840000,
        equity: 520000,
        equityPercent: 62,
      },
      valuationRange: {
        low: 806000,
        target: 840000,
        high: 882000,
        confidenceScore: 94,
      },
      comparables: [
        {
          address: '1208 Pine Crest Dr, Austin TX',
          soldPrice: 825000,
          beds: 4,
          baths: 3,
          squareFeet: 2790,
          pricePerSqft: 295,
          daysOnMarket: 7,
        },
        {
          address: '1314 Oak Ridge Trail, Austin TX',
          soldPrice: 855000,
          beds: 4,
          baths: 3.5,
          squareFeet: 2920,
          pricePerSqft: 292,
          daysOnMarket: 9,
        },
      ],
      activeBuyerDemandCount: 48,
      agentBranding: {
        name: 'Hamza Farooq',
        phone: '+1 (555) 849-2041',
        email: 'hamza@almiraj.com',
        brokerageName: 'Al-Miraj Real Estate & Builders',
      },
      expiresAt: new Date(Date.now() + 60 * 86400 * 1000),
    }

    const html = radarService.renderCmaHtml(mockCma)

    const hasDoctype = html.includes('<!DOCTYPE html>')
    const hasTargetVal = html.includes('$840,000')
    const hasEquityVal = html.includes('$520,000')
    const hasComps = html.includes('1208 Pine Crest Dr')
    const hasBuyerDemand = html.includes('48 Active Pre-Approved PropPulse Buyers')
    const hasAgentCTA = html.includes('Hamza Farooq') && html.includes('wa.me')

    if (hasDoctype && hasTargetVal && hasEquityVal && hasComps && hasBuyerDemand && hasAgentCTA) {
      console.log('  ✅ Test 3 Passed: HTML Landing Page successfully generated with all required sections and interactive CTA')
      passed++
    } else {
      console.error('  ❌ Test 3 Failed: HTML output missing essential components')
      failed++
    }
  } catch (err: any) {
    console.error('  ❌ Test 3 Exception:', err.message)
    failed++
  }

  console.log('\n====================================================')
  console.log(`📊 SPRINT 19 TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
  console.log('====================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
