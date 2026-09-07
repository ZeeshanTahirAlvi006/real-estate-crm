import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import { chatbotRoutes } from '../../src/features/ai-chatbot/chatbot.routes.js'
import { errorHandler } from '../../src/middleware/errorHandler.js'
import { env } from '../../src/config/env.js'
import { USER_ROLES } from '../../src/utils/constants.js'

describe('Objection Copilot Integration Tests', () => {
  const app = express()
  app.use(cookieParser('test-cookie-secret'))
  app.use(express.json())

  // Mount chatbot routes under /api/chatbot
  app.use('/api/chatbot', chatbotRoutes)
  app.use(errorHandler)

  // Test JWT token
  const testBrokerageId = '654321654321654321654321'
  const token = jwt.sign(
    {
      userId: 'usr-agent-002',
      email: 'agent2@testplaybook.com',
      role: USER_ROLES.AGENT,
      brokerageId: testBrokerageId,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  )

  it('should classify interest rate objection via /api/chatbot/objections/classify', async () => {
    const res = await request(app)
      .post('/api/chatbot/objections/classify')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'The interest rates are 7.5%, the cost to borrow is too high.' })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.category, 'interest_rates')
    assert.ok(res.body.data.confidence > 0.5)
    assert.ok(res.body.data.detectedPhrases.length > 0)
  })

  it('should generate 3 rebuttal angles via /api/chatbot/objections/rebuttal', async () => {
    const res = await request(app)
      .post('/api/chatbot/objections/rebuttal')
      .set('Authorization', `Bearer ${token}`)
      .send({
        messageText: 'Why should we pay 6% commission when discount brokers charge 1%?',
        category: 'commission_fees',
        leadContext: { name: 'Sarah', isSeller: true },
      })

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.data.category, 'commission_fees')
    assert.ok(res.body.data.rebuttals.analytical)
    assert.ok(res.body.data.rebuttals.empathetic)
    assert.ok(res.body.data.rebuttals.urgency)
  })

  it('should retrieve curated objection playbooks via /api/chatbot/objections/playbook', async () => {
    const res = await request(app)
      .get('/api/chatbot/objections/playbook')
      .set('Authorization', `Bearer ${token}`)

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.ok(Array.isArray(res.body.data))
    assert.ok(res.body.data.length >= 5)
  })

  it('should reject unauthenticated calls with 401', async () => {
    const res = await request(app)
      .post('/api/chatbot/objections/classify')
      .send({ text: 'Some text' })

    assert.equal(res.status, 401)
  })
})
