import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import { logout } from '../../src/features/auth/auth.controller.js'
import { COOKIE_NAMES } from '../../src/utils/constants.js'

describe('Auth Logout Integration Tests', () => {
  const app = express()
  app.use(cookieParser())
  app.use(express.json())

  // Middleware that simulates authenticate attaching a .lean() user
  app.use((req, _res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439011' as any,
      email: 'test@proppulse.test',
      role: 'agent',
      brokerageId: '507f1f77bcf86cd799439012' as any,
      isActive: true,
      tokenVersion: 1,
    } as any
    // Notice: user has NO .save() method, just like .lean()
    next()
  })

  app.post('/api/auth/logout', logout)

  it('should successfully clear auth cookies on logout even with .lean() user', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`${COOKIE_NAMES.ACCESS_TOKEN}=fake_access_token`, `${COOKIE_NAMES.REFRESH_TOKEN}=fake_refresh_token`])

    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.message, 'Logged out successfully')

    const setCookieHeaders = res.headers['set-cookie']
    assert.ok(setCookieHeaders, 'Set-Cookie headers should be present')

    const cookieStrings = setCookieHeaders as unknown as string[]
    const hasClearedAccess = cookieStrings.some(
      (c) => c.includes(COOKIE_NAMES.ACCESS_TOKEN) && (c.includes('Expires=Thu, 01 Jan 1970') || c.includes('Max-Age=0'))
    )
    const hasClearedRefresh = cookieStrings.some(
      (c) => c.includes(COOKIE_NAMES.REFRESH_TOKEN) && (c.includes('Expires=Thu, 01 Jan 1970') || c.includes('Max-Age=0'))
    )

    assert.ok(hasClearedAccess, 'Access token cookie must be cleared with expiry in 1970')
    assert.ok(hasClearedRefresh, 'Refresh token cookie must be cleared with expiry in 1970')
  })
})
