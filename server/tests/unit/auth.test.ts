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
})
