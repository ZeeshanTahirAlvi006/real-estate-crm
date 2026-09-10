import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  safeJsonParse,
  measureExecutionMs,
  recordDbMetric,
  getDashboardCacheKey,
  getLeadPortalCacheKey,
} from '../../src/utils/cacheHelper.js'
import { Contact } from '../../src/models/Contact.js'
import { User, IUser } from '../../src/models/User.js'
import { Deal } from '../../src/models/Deal.js'
import { getLeadPortal, updateLeadPortalProfile } from '../../src/features/dashboard/dashboard.service.js'

describe('Dashboard Sub-1ms & Declarative Performance Audit Unit Tests', () => {
  describe('Resilience & Cache Utilities (DI-003, PERF-R-004)', () => {
    it('safeJsonParse should parse valid JSON strings correctly', () => {
      const payload = { totalContacts: 150, newLeadsThisWeek: 12, activeDeals: 5 }
      const jsonStr = JSON.stringify(payload)
      const parsed = safeJsonParse<typeof payload>(jsonStr)
      assert.deepEqual(parsed, payload)
    })

    it('safeJsonParse should return null for null or undefined input', () => {
      assert.equal(safeJsonParse(null), null)
      assert.equal(safeJsonParse(undefined as any), null)
      assert.equal(safeJsonParse(''), null)
    })

    it('safeJsonParse should gracefully handle corrupted JSON without throwing (DI-003)', () => {
      const malformedPayloads = [
        '{ corrupted: json',
        '{"partial": true, ',
        'undefined',
        '<html>500 Internal Error</html>',
      ]

      for (const malformed of malformedPayloads) {
        assert.doesNotThrow(() => {
          const result = safeJsonParse(malformed)
          assert.equal(result, null)
        })
      }
    })

    it('getDashboardCacheKey should be deterministic regardless of object key order', () => {
      const filter1 = { brokerageId: 'b123', isDeleted: false }
      const filter2 = { isDeleted: false, brokerageId: 'b123' }

      const key1 = getDashboardCacheKey('kpis', filter1)
      const key2 = getDashboardCacheKey('kpis', filter2)

      assert.equal(key1, key2)
      assert.ok(key1.startsWith('dashboard:kpis:'))
    })

    it('getLeadPortalCacheKey should produce expected user-scoped key', () => {
      const userId = '64f1234567890abcdef12345'
      const key = getLeadPortalCacheKey(userId)
      assert.equal(key, `dashboard:leadPortal:${userId}`)
    })
  })

  describe('High-Resolution Telemetry Instrumentation (PERF-M-004)', () => {
    it('measureExecutionMs should return accurate float milliseconds', () => {
      const start = process.hrtime.bigint()
      // Small busy loop to consume time
      let count = 0
      for (let i = 0; i < 10000; i++) {
        count += i
      }
      assert.ok(count > 0)
      const elapsed = measureExecutionMs(start)
      assert.equal(typeof elapsed, 'number')
      assert.ok(elapsed >= 0)
    })

    it('recordDbMetric should track elapsed time and return duration in ms', () => {
      const start = process.hrtime.bigint()
      const elapsed = recordDbMetric('testOperation', start, 100)
      assert.equal(typeof elapsed, 'number')
      assert.ok(elapsed >= 0)
    })
  })

  describe('Compound Covering Index Verification (PERF-M-001)', () => {
    it('Contact schema should include compound covering index on brokerageId, isDeleted, leadScore', () => {
      const indexes = Contact.schema.indexes()
      const hasLeadScoreIndex = indexes.some(([fields]) => {
        return (
          fields.brokerageId === 1 &&
          fields.isDeleted === 1 &&
          fields.leadScore === 1
        )
      })
      assert.ok(
        hasLeadScoreIndex,
        'Expected Contact schema to have compound index on { brokerageId: 1, isDeleted: 1, leadScore: 1 }'
      )
    })

    it('User schema should include compound index on brokerageId, isActive', () => {
      const indexes = User.schema.indexes()
      const hasActiveUserIndex = indexes.some(([fields]) => {
        return fields.brokerageId === 1 && fields.isActive === 1
      })
      assert.ok(
        hasActiveUserIndex,
        'Expected User schema to have compound index on { brokerageId: 1, isActive: 1 }'
      )
    })

    it('Deal schema should include compound indexes for dealValue and contactId lookups', () => {
      const indexes = Deal.schema.indexes()
      const hasDealValueIndex = indexes.some(([fields]) => {
        return fields.brokerageId === 1 && fields.isDeleted === 1 && fields.dealValue === 1
      })
      const hasContactIdIndex = indexes.some(([fields]) => {
        return fields.contactId === 1 && fields.brokerageId === 1 && fields.isDeleted === 1
      })
      assert.ok(hasDealValueIndex, 'Expected Deal schema to have compound index on { brokerageId: 1, isDeleted: 1, dealValue: 1 }')
      assert.ok(hasContactIdIndex, 'Expected Deal schema to have compound index on { contactId: 1, brokerageId: 1, isDeleted: 1 }')
    })
  })

  describe('Multi-Tenant Access Enforcement in Lead Portal', () => {
    it('should reject non-lead roles with 403 Forbidden', async () => {
      const agentUser = {
        _id: new mongoose.Types.ObjectId(),
        role: 'agent',
        brokerageId: new mongoose.Types.ObjectId(),
      } as unknown as IUser

      await assert.rejects(
        async () => {
          await getLeadPortal(agentUser)
        },
        {
          message: 'Only leads can access the lead portal',
          statusCode: 403,
        }
      )
    })

    it('should reject updateLeadPortalProfile for non-lead roles with 403', async () => {
      const brokerUser = {
        _id: new mongoose.Types.ObjectId(),
        role: 'brokerage_owner',
        brokerageId: new mongoose.Types.ObjectId(),
      } as unknown as IUser

      await assert.rejects(
        async () => {
          await updateLeadPortalProfile(brokerUser, { firstName: 'Updated' })
        },
        {
          message: 'Only leads can access client portal settings',
          statusCode: 403,
        }
      )
    })
  })
})
