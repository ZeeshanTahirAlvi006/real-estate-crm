import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { complianceRoutes } from '../../src/features/compliance/compliance.routes.js'
import { errorHandler } from '../../src/middleware/errorHandler.js'
import { env } from '../../src/config/env.js'
import { USER_ROLES } from '../../src/utils/constants.js'

describe('Compliance & TCPA Integration Tests', () => {
  const app = express()
  app.use(cookieParser('test-cookie-secret'))
  app.use(express.json())

  // Mount compliance routes under /api/compliance
  app.use('/api/compliance', complianceRoutes)
  app.use(errorHandler)

  // Generate valid test JWT token
  const testBrokerageId = '654321654321654321654321'
  const token = jwt.sign(
    {
      userId: 'usr-agent-001',
      email: 'agent@testcompliance.com',
      role: USER_ROLES.AGENT,
      brokerageId: testBrokerageId,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  )

  it('should flag simulated Federal DNC numbers ending in 9999', async () => {
    const res = await request(app)
      .post('/api/compliance/tcpa/dnc-check')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1 (555) 777-9999' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.isClean, false)
    assert.equal(res.body.data.dncStatus, 'dnc_federal')
    assert.equal(res.body.data.canCall, false)
  })

  it('should approve clean non-DNC phone numbers', async () => {
    const res = await request(app)
      .post('/api/compliance/tcpa/dnc-check')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+1 (555) 777-1234' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.isClean, true)
    assert.equal(res.body.data.dncStatus, 'clean')
    assert.equal(res.body.data.canText, true)
  })

  it('should reject DNC check with invalid or too short phone numbers', async () => {
    const res = await request(app)
      .post('/api/compliance/tcpa/dnc-check')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '12' })

    assert.equal(res.status, 422)
    assert.equal(res.body.success, false)
  })

  it('should scan text and detect Fair Housing prohibited terms', async () => {
    const res = await request(app)
      .post('/api/compliance/fair-housing/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Beautiful suburban home in a Christian neighborhood, no kids allowed.' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.isCompliant, false)
    assert.ok(res.body.data.totalViolations >= 2)
    assert.ok(res.body.data.cleanedText)
  })

  it('should approve compliant listing copy through Fair Housing scan', async () => {
    const res = await request(app)
      .post('/api/compliance/fair-housing/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Spacious 3-bedroom home with modern kitchen, granite counters, and open layout.' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.isCompliant, true)
    assert.equal(res.body.data.totalViolations, 0)
  })

  it('should enforce authentication on compliance endpoints', async () => {
    const res = await request(app)
      .post('/api/compliance/tcpa/dnc-check')
      .send({ phone: '+15557771234' })

    assert.equal(res.status, 401)
  })
})
