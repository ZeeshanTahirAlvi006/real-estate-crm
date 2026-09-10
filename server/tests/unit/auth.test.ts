import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { env } from '../../src/config/env.js'

describe('Auth Unit Tests', () => {
  it('should securely hash password with bcrypt salt rounds', async () => {
    const raw = 'SuperSecret123!'
    const hash = await bcrypt.hash(raw, 10)

    assert.notEqual(raw, hash)
    const matches = await bcrypt.compare(raw, hash)
    assert.equal(matches, true)

    const wrongMatches = await bcrypt.compare('WrongPassword!', hash)
    assert.equal(wrongMatches, false)
  })

  it('should sign and verify valid JWT access tokens', () => {
    const payload = {
      id: 'usr-12345',
      email: 'agent@proppulse.test',
      role: 'agent',
      brokerageId: 'brok-99999',
    }

    const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' })
    assert.ok(token)

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as typeof payload
    assert.equal(decoded.id, payload.id)
    assert.equal(decoded.email, payload.email)
    assert.equal(decoded.role, payload.role)
    assert.equal(decoded.brokerageId, payload.brokerageId)
  })

  it('should reject invalid or tampered JWT access tokens', () => {
    const payload = { id: 'usr-fake' }
    const token = jwt.sign(payload, 'wrong-secret-key', { expiresIn: '1h' })

    assert.throws(() => {
      jwt.verify(token, env.JWT_ACCESS_SECRET)
    }, /invalid signature/)
  })

  it('should sign and verify valid JWT refresh tokens', () => {
    const payload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'owner@almiraj.com',
      role: 'brokerage_owner',
      brokerageId: '507f1f77bcf86cd799439012',
      tokenVersion: 1,
    }

    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
    assert.ok(token)

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as typeof payload
    assert.equal(decoded.userId, payload.userId)
    assert.equal(decoded.email, payload.email)
    assert.equal(decoded.tokenVersion, 1)
  })

  it('should safely format user responses with date objects or strings without crashing', async () => {
    const { formatUserResponse } = await import('../../src/features/auth/auth.service.js')

    // Scenario A: Standard Mongoose Date instances
    const userWithDates = {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Al',
      lastName: 'Miraj',
      email: 'owner@almiraj.com',
      role: 'brokerage_owner',
      brokerageId: '507f1f77bcf86cd799439012',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastActiveAt: new Date('2026-09-10T12:00:00.000Z'),
    }

    const formattedA = formatUserResponse(userWithDates, 'Al-Miraj Realty')
    assert.equal(formattedA.createdAt, '2026-01-01T00:00:00.000Z')
    assert.equal(formattedA.lastActiveAt, '2026-09-10T12:00:00.000Z')
    assert.equal(formattedA.brokerageName, 'Al-Miraj Realty')

    // Scenario B: Redis / JSON deserialized pre-formatted string dates
    const userWithStrings = {
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Al',
      lastName: 'Miraj',
      email: 'owner@almiraj.com',
      role: 'brokerage_owner',
      brokerageId: '507f1f77bcf86cd799439012',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      lastActiveAt: '2026-09-10T12:00:00.000Z',
    }

    const formattedB = formatUserResponse(userWithStrings)
    assert.equal(formattedB.createdAt, '2026-01-01T00:00:00.000Z')
    assert.equal(formattedB.lastActiveAt, '2026-09-10T12:00:00.000Z')
  })

  it('should reject registration if brokerage name already exists under an active brokerage owner', async () => {
    const { registerUser } = await import('../../src/features/auth/auth.service.js')
    const { cacheSet, cacheDelete } = await import('../../src/config/redis.js')
    const mongoose = (await import('mongoose')).default

    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(env.MONGODB_URI)
      } catch {}
    }

    // Scenario A: DB Hit rejection with case-insensitive matching
    if (mongoose.connection.readyState === 1) {
      await assert.rejects(
        async () => {
          await registerUser({
            firstName: 'Duplicate',
            lastName: 'Tester',
            email: 'duplicate.brokerage.tester@almirajrealty.pk',
            password: 'Password!123',
            brokerageName: 'al-miraj real estate & builders', // case-insensitive test
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, 409)
          assert.match(err.message, /already exists under an active brokerage owner/i)
          return true
        }
      )
    }

    // Scenario B: Redis Fast-Path Hit (< 0.1ms)
    const testBrokerageKey = 'auth:brokerage:owner:apex test realty'
    await cacheSet(testBrokerageKey, 'fake-owner-id-12345', 60)

    try {
      await assert.rejects(
        async () => {
          await registerUser({
            firstName: 'Fast',
            lastName: 'Cache',
            email: 'fastcache@test.com',
            password: 'Password!123',
            brokerageName: 'Apex Test Realty',
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, 409)
          assert.match(err.message, /already exists under an active brokerage owner/i)
          return true
        }
      )
    } finally {
      await cacheDelete(testBrokerageKey)
    }
  })
})

