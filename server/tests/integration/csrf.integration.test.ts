import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import { csrfProtection } from '../../src/middleware/csrfProtection.js'

describe('CSRF Protection Integration Tests', () => {
  const app = express()
  app.use(cookieParser('test-cookie-secret'))
  app.use(express.json())
  app.use(csrfProtection)

  app.get('/test-safe', (_req, res) => {
    res.json({ message: 'safe' })
  })

  app.post('/test-mutate', (_req, res) => {
    res.json({ message: 'mutated' })
  })

  app.post('/api/leads/webhook/zillow', (_req, res) => {
    res.json({ message: 'webhook received' })
  })

  it('should automatically set XSRF-TOKEN cookie on safe GET requests', async () => {
    const res = await request(app).get('/test-safe')
    assert.equal(res.status, 200)

    const cookies = res.headers['set-cookie']
    assert.ok(cookies)
    const xsrfCookie = (cookies as unknown as string[]).find((c: string) => c.includes('XSRF-TOKEN'))
    assert.ok(xsrfCookie)
  })

  it('should reject state mutations if XSRF-TOKEN cookie exists but header is missing', async () => {
    // Initial GET to acquire cookie
    const getRes = await request(app).get('/test-safe')
    const cookies = getRes.headers['set-cookie']

    // POST without header
    const postRes = await request(app)
      .post('/test-mutate')
      .set('Cookie', cookies)
      .send({ name: 'New Entry' })

    assert.equal(postRes.status, 403)
    assert.equal(postRes.body.code, 'CSRF_VALIDATION_FAILED')
  })

  it('should accept state mutations when X-XSRF-Token matches the cookie', async () => {
    // Initial GET to acquire token
    const getRes = await request(app).get('/test-safe')
    const cookieHeader = getRes.headers['set-cookie']
    const match = (cookieHeader as unknown as string[])[0].match(/XSRF-TOKEN=([^;]+)/)
    const token = match ? match[1] : ''

    assert.ok(token)

    // POST with matching header
    const postRes = await request(app)
      .post('/test-mutate')
      .set('Cookie', cookieHeader)
      .set('X-XSRF-Token', token)
      .send({ name: 'New Entry' })

    assert.equal(postRes.status, 200)
    assert.equal(postRes.body.message, 'mutated')
  })

  it('should bypass CSRF protection for whitelisted webhook routes', async () => {
    const res = await request(app)
      .post('/api/leads/webhook/zillow')
      .send({ lead: 'Jane Doe' })

    assert.equal(res.status, 200)
    assert.equal(res.body.message, 'webhook received')
  })

  it('should bypass CSRF protection when Authorization: Bearer token is provided', async () => {
    const res = await request(app)
      .post('/test-mutate')
      .set('Authorization', 'Bearer dummy-token')
      .send({ name: 'Direct API Call' })

    assert.equal(res.status, 200)
    assert.equal(res.body.message, 'mutated')
  })
})
