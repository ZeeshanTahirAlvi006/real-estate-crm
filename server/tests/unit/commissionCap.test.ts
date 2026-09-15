import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { computeCommissionSplit } from '../../src/features/commissions/commission.service.js'
import {
  updateBrokerageCapSchema,
  updateAgentCapSchema,
  calculateCommissionSchema,
} from '../../src/features/commissions/commission.validators.js'
import { commissionController } from '../../src/features/commissions/commission.controller.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'
import { IUser } from '../../src/models/User.js'

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

describe('Commission Cap & Cascading Rules Unit Tests', () => {
  const origLog = console.log

  beforeEach(() => {
    console.log = () => {}
  })

  afterEach(() => {
    console.log = origLog
  })

  describe('1. Mathematical Clamping & Anti-Overflow Guard', () => {
    it('should calculate standard split when prior YTD + deal brokerage cut is below cap', () => {
      // Sale: $500,000 @ 3% = $15,000 GCI
      // Franchise 0%, Referral 0% -> adjustedGCI = $15,000
      // 80/20 split -> Brokerage cut = $3,000, Agent Gross = $12,000
      // Prior YTD = $10,000, Cap = $18,000 -> Remaining cap = $8,000
      // Since $3,000 <= $8,000, no clamping occurs
      const result = computeCommissionSplit(
        {
          salePrice: 500000,
          commissionRate: 3.0,
          splitModel: 'capped',
          splitPercentAgent: 80,
          capThreshold: 18000,
          franchiseFeePercent: 0,
          referralFeePercent: 0,
          tcFee: 0,
          eoInsuranceFee: 0,
          deskFee: 0,
        },
        10000, // priorYtdContribution
        100000 // priorGCI
      )

      assert.equal(result.grossCommission, 15000)
      assert.equal(result.adjustedGCI, 15000)
      assert.equal(result.brokerageContributionThisDeal, 3000)
      assert.equal(result.agentGrossPayout, 12000)
      assert.equal(result.newYtdContribution, 13000)
      assert.equal(result.capRemaining, 5000)
      assert.equal(result.isCapped, false)
      assert.equal(result.effectiveAgentSplit, 80)
      assert.equal(result.effectiveBrokerageSplit, 20)
    })

    it('should clamp brokerage cut to exact remaining cap on crossover deal', () => {
      // Sale: $1,000,000 @ 3% = $30,000 GCI
      // Franchise 0%, Referral 0% -> adjustedGCI = $30,000
      // 80/20 split -> Raw brokerage cut would be $6,000
      // Prior YTD = $15,000, Cap = $18,000 -> Remaining cap = $3,000
      // Broker cut MUST clamp to $3,000! Agent receives $27,000 (effective 90% split!)
      const result = computeCommissionSplit(
        {
          salePrice: 1000000,
          commissionRate: 3.0,
          splitModel: 'capped',
          splitPercentAgent: 80,
          capThreshold: 18000,
          franchiseFeePercent: 0,
          referralFeePercent: 0,
          tcFee: 0,
          eoInsuranceFee: 0,
          deskFee: 0,
        },
        15000, // priorYtdContribution
        200000
      )

      assert.equal(result.grossCommission, 30000)
      assert.equal(result.adjustedGCI, 30000)
      assert.equal(result.brokerageContributionThisDeal, 3000, 'Brokerage cut must be clamped to remaining cap of $3,000')
      assert.equal(result.agentGrossPayout, 27000, 'Agent receives remainder of adjusted GCI ($27,000)')
      assert.equal(result.newYtdContribution, 18000, 'New YTD contribution reaches exactly $18,000')
      assert.equal(result.capRemaining, 0, 'Cap remaining must be 0')
      assert.equal(result.isCapped, true, 'Agent is marked as capped')
      assert.equal(result.effectiveBrokerageSplit, 10, 'Effective brokerage split is 3000 / 30000 = 10%')
      assert.equal(result.effectiveAgentSplit, 90, 'Effective agent split is 90%')
    })

    it('should give agent 100% split when agent is already 100% capped', () => {
      // Prior YTD = $18,000, Cap = $18,000 -> Remaining cap = $0
      // Deal GCI = $20,000. Brokerage cut must be $0. Agent receives $20,000.
      const result = computeCommissionSplit(
        {
          salePrice: 666667,
          commissionRate: 3.0,
          splitModel: 'capped',
          splitPercentAgent: 80,
          capThreshold: 18000,
          franchiseFeePercent: 0,
          referralFeePercent: 0,
          tcFee: 0,
          eoInsuranceFee: 0,
          deskFee: 0,
        },
        18000, // already at cap
        300000
      )

      assert.equal(result.brokerageContributionThisDeal, 0, 'Brokerage cut must be $0 once capped')
      assert.equal(result.agentGrossPayout, result.adjustedGCI, 'Agent receives 100% of adjusted GCI')
      assert.equal(result.effectiveBrokerageSplit, 0)
      assert.equal(result.effectiveAgentSplit, 100)
      assert.equal(result.isCapped, true)
      assert.equal(result.newYtdContribution, 18000)
      assert.equal(result.capRemaining, 0)
    })

    it('should gracefully handle and clamp legacy over-cap prior YTD data', () => {
      // If legacy prior YTD was already $22,000 on an $18,000 cap
      const result = computeCommissionSplit(
        {
          salePrice: 500000,
          commissionRate: 3.0,
          splitModel: 'capped',
          splitPercentAgent: 80,
          capThreshold: 18000,
          franchiseFeePercent: 0,
          referralFeePercent: 0,
          tcFee: 0,
          eoInsuranceFee: 0,
          deskFee: 0,
        },
        22000, // over-cap prior
        400000
      )

      assert.equal(result.brokerageContributionThisDeal, 0, 'Brokerage cut must remain 0')
      assert.equal(result.newYtdContribution, 18000, 'New YTD contribution is clamped back to capThreshold')
      assert.equal(result.capRemaining, 0)
      assert.equal(result.isCapped, true)
    })

    it('should enforce universal cap clamp even if splitModel is fixed or tiered', () => {
      // Under fixed model, if capThreshold > 0 and prior is near cap, clamp must still apply!
      const resultFixed = computeCommissionSplit(
        {
          salePrice: 500000,
          commissionRate: 3.0,
          splitModel: 'fixed',
          splitPercentAgent: 80,
          capThreshold: 18000,
          franchiseFeePercent: 0,
          referralFeePercent: 0,
          tcFee: 0,
          eoInsuranceFee: 0,
          deskFee: 0,
        },
        17000, // $1,000 remaining
        200000
      )

      // Raw 20% cut of $15,000 is $3,000, but only $1,000 remaining
      assert.equal(resultFixed.brokerageContributionThisDeal, 1000, 'Fixed model must respect cap clamping')
      assert.equal(resultFixed.agentGrossPayout, 14000)
      assert.equal(resultFixed.isCapped, true)
      assert.equal(resultFixed.newYtdContribution, 18000)
    })

    it('should correctly deduct post-split fees without exceeding agent net earnings', () => {
      const result = computeCommissionSplit(
        {
          salePrice: 100000,
          commissionRate: 1.0, // $1,000 gross
          splitModel: 'capped',
          splitPercentAgent: 80,
          capThreshold: 18000,
          tcFee: 400,
          eoInsuranceFee: 200,
          deskFee: 100,
        },
        0,
        0
      )

      assert.equal(result.grossCommission, 1000)
      // Franchise 6% = 60, Adjusted GCI = 940
      assert.equal(result.franchiseDeduction, 60)
      assert.equal(result.adjustedGCI, 940)
      // Brokerage 20% of 940 = 188
      assert.equal(result.brokerageContributionThisDeal, 188)
      // Agent gross = 940 - 188 = 752
      assert.equal(result.agentGrossPayout, 752)
      // Post split fees: 400 + 200 + 100 = 700
      assert.equal(result.totalPostSplitDeductions, 700)
      // Agent net: 752 - 700 = 52
      assert.equal(result.agentNetPayout, 52)
    })
  })

  describe('2. Performance & Sub-Millisecond SLO Benchmark', () => {
    it('computeCommissionSplit should execute in <0.05ms per calculation', () => {
      const iterations = 1000
      const t0 = process.hrtime.bigint()

      for (let i = 0; i < iterations; i++) {
        computeCommissionSplit(
          {
            salePrice: 500000 + i * 100,
            commissionRate: 3.0,
            splitModel: 'capped',
            splitPercentAgent: 80,
            capThreshold: 18000,
            franchiseFeePercent: 6.0,
            referralFeePercent: 25.0,
            tcFee: 395,
            eoInsuranceFee: 150,
            deskFee: 100,
          },
          i * 15,
          i * 200
        )
      }

      const t1 = process.hrtime.bigint()
      const totalMs = Number(t1 - t0) / 1e6
      const avgMs = totalMs / iterations

      assert.ok(avgMs < 0.05, `Average calculation time ${avgMs.toFixed(4)}ms exceeds 0.05ms limit`)
    })
  })

  describe('3. Zod Schema Validation Guardrails', () => {
    it('updateBrokerageCapSchema should accept valid cap settings', () => {
      const valid = updateBrokerageCapSchema.safeParse({
        defaultCommissionCap: 25000,
        defaultCommissionSplitAgent: 85,
      })
      assert.equal(valid.success, true)
      if (valid.success) {
        assert.equal(valid.data.defaultCommissionCap, 25000)
        assert.equal(valid.data.defaultCommissionSplitAgent, 85)
      }
    })

    it('updateBrokerageCapSchema should reject negative or oversized cap values', () => {
      const negativeCap = updateBrokerageCapSchema.safeParse({
        defaultCommissionCap: -500,
      })
      assert.equal(negativeCap.success, false)

      const excessiveCap = updateBrokerageCapSchema.safeParse({
        defaultCommissionCap: 20000000, // max is 10,000,000
      })
      assert.equal(excessiveCap.success, false)

      const invalidSplit = updateBrokerageCapSchema.safeParse({
        defaultCommissionSplitAgent: 105, // max is 100
      })
      assert.equal(invalidSplit.success, false)
    })

    it('updateAgentCapSchema should accept valid agent overrides and clear-cap sentinel', () => {
      const validOverride = updateAgentCapSchema.safeParse({
        commissionCap: 20000,
        commissionSplitPercent: 85,
        commissionModel: 'capped',
      })
      assert.equal(validOverride.success, true)

      const validClear = updateAgentCapSchema.safeParse({
        commissionCap: 0, // clears override
      })
      assert.equal(validClear.success, true)
    })

    it('calculateCommissionSchema should default splitModel to capped and allow optional capThreshold', () => {
      const parsed = calculateCommissionSchema.safeParse({
        salePrice: 750000,
      })
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.splitModel, 'capped')
        assert.equal(parsed.data.capThreshold, undefined, 'capThreshold is optional to enable cascading')
      }
    })
  })

  describe('4. Controller Security & RBAC Enforcement', () => {
    it('getCapSettings should return 401 when req.user is absent', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await commissionController.getCapSettings(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('updateBrokerageCap should return 401 when req.user is absent', async () => {
      const req: any = { user: undefined, body: { defaultCommissionCap: 20000 } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await commissionController.updateBrokerageCap(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('updateAgentCap should return 401 when req.user is absent', async () => {
      const req: any = { user: undefined, params: { agentId: '123' }, body: { commissionCap: 20000 } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => { nextCalled = true }

      await commissionController.updateAgentCap(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })
  })
})
