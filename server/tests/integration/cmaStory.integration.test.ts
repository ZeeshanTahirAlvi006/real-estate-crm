import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { radarRoutes } from '../../src/features/seller-radar/radar.routes.js'
import { errorHandler } from '../../src/middleware/errorHandler.js'
import { env } from '../../src/config/env.js'
import { USER_ROLES } from '../../src/utils/constants.js'

describe('Sprint 24 — CMA AI Storytelling Integration Tests', () => {
  const app = express()
  app.use(cookieParser('test-cookie-secret'))
  app.use(express.json())

  // Mount seller radar routes under /api/seller-radar
  app.use('/api/seller-radar', radarRoutes)
  app.use(errorHandler)

  const testBrokerageId = '654321654321654321654321'
  const token = jwt.sign(
    {
      userId: 'usr-agent-cma-001',
      email: 'cma.agent@proppulse.com',
      role: USER_ROLES.AGENT,
      brokerageId: testBrokerageId,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  )

  const validSubject = {
    formattedAddress: '450 Sunset Blvd, Beverly Hills, CA 90210',
    beds: 4,
    baths: 3,
    squareFeet: 3200,
    estimatedValue: 1850000,
    purchasePrice: 1300000,
    purchaseDate: '2019-06-01T00:00:00.000Z',
    estimatedMortgageBalance: 780000,
    equity: 1070000,
  }

  const validComps = [
    {
      address: '462 Sunset Blvd',
      soldPrice: 1920000,
      beds: 4,
      baths: 3.5,
      squareFeet: 3300,
      pricePerSqft: 581,
      daysOnMarket: 14,
    },
    {
      address: '420 Canyon Rd',
      soldPrice: 1810000,
      beds: 4,
      baths: 3,
      squareFeet: 3100,
      pricePerSqft: 583,
      daysOnMarket: 9,
    },
  ]

  it('should reject unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/seller-radar/cma/narrative')
      .send({
        mode: 'seller',
        subjectProperty: validSubject,
        comparables: validComps,
      })

    assert.equal(res.status, 401)
    assert.equal(res.body.success, false)
  })

  it('should reject invalid mode with 422 validation error', async () => {
    const res = await request(app)
      .post('/api/seller-radar/cma/narrative')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'invalid_mode',
        subjectProperty: validSubject,
        comparables: validComps,
      })

    assert.equal(res.status, 422)
    assert.equal(res.body.success, false)
  })

  it('should successfully synthesize a seller narrative via POST /api/seller-radar/cma/narrative', async () => {
    const res = await request(app)
      .post('/api/seller-radar/cma/narrative')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'seller',
        subjectProperty: validSubject,
        comparables: validComps,
        valuationRange: {
          low: 1775000,
          target: 1850000,
          high: 1940000,
        },
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.mode, 'seller')
    assert.ok(res.body.data.headline)
    assert.ok(res.body.data.appreciationStory)
    assert.ok(res.body.data.compsAnalysis)
    assert.ok(res.body.data.formattedHtml.includes('cma-story-card'))
    assert.ok(res.body.data.formattedMarkdown.includes('Executive Summary'))
    assert.equal(res.body.data.compliance.passed, true)
    assert.ok(res.body.data.metrics.appreciationTotalDollar > 0)
  })

  it('should successfully synthesize a buyer narrative via POST /api/seller-radar/cma/narrative', async () => {
    const res = await request(app)
      .post('/api/seller-radar/cma/narrative')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'buyer',
        subjectProperty: validSubject,
        comparables: validComps,
        valuationRange: {
          low: 1775000,
          target: 1850000,
          high: 1940000,
        },
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.mode, 'buyer')
    assert.ok(res.body.data.headline)
    assert.ok(res.body.data.recommendedStrategy)
    assert.equal(res.body.data.compliance.passed, true)
  })
})
