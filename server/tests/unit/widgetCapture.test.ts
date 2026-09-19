import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../../src/config/env.js'
import { LeadSource } from '../../src/models/LeadSource.js'
import { Brokerage } from '../../src/models/Brokerage.js'
import { User } from '../../src/models/User.js'
import {
  isDomainAllowed,
  verifyRecaptchaV3Token,
  ingestCaptureWidgetLead,
  captureKeyL1Cache,
  invalidateLeadCaches,
} from '../../src/features/leads/lead.service.js'
import { captureWidgetHandler } from '../../src/features/leads/lead.controller.js'
import { leadCaptureSchema, createLeadSourceSchema, updateLeadSourceSchema } from '../../src/features/leads/lead.validators.js'
import { AppError } from '../../src/middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES } from '../../src/utils/constants.js'

// Helper mock response
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: any) {
      this.body = data
      return this
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value
      return this
    },
  }
  return res
}

describe('Lead Capture Widget - Unit & Integration Test Suite', () => {
  let testBrokerageId: mongoose.Types.ObjectId
  let testUserId: mongoose.Types.ObjectId
  let validCaptureKey: string
  let restrictedCaptureKey: string

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      const dbUri = process.env.MONGODB_TEST_URI || env.MONGODB_URI || 'mongodb://localhost:27017/proppulse_test'
      await mongoose.connect(dbUri)
    }

    testBrokerageId = new mongoose.Types.ObjectId()
    testUserId = new mongoose.Types.ObjectId()

    await Brokerage.create({
      _id: testBrokerageId,
      name: `Widget Test Brokerage ${Date.now()}`,
      slug: `widget-test-${Date.now()}`,
      address: { street: '100 Test Way', city: 'Austin', state: 'TX', zip: '78701', country: 'USA' },
      billingEmail: 'billing@widgettest.com',
      subscriptionTier: 'enterprise',
      status: 'active',
    })

    await User.create({
      _id: testUserId,
      brokerageId: testBrokerageId,
      email: `admin-${Date.now()}@widgettest.com`,
      password: 'HashedPassword123!',
      firstName: 'Widget',
      lastName: 'Tester',
      role: USER_ROLES.BROKERAGE_OWNER,
      isActive: true,
    })

    validCaptureKey = uuidv4()
    await LeadSource.create({
      name: 'Website Open Widget',
      type: 'website',
      webhookSecret: 'enc_secret_test_123',
      captureKey: validCaptureKey,
      isActive: true,
      allowedDomains: [],
      brokerageId: testBrokerageId,
      createdBy: testUserId,
    })

    restrictedCaptureKey = uuidv4()
    await LeadSource.create({
      name: 'Website Restricted Widget',
      type: 'website',
      webhookSecret: 'enc_secret_test_456',
      captureKey: restrictedCaptureKey,
      isActive: true,
      allowedDomains: ['example.com', '*.agencyportal.com', 'localhost:3000'],
      brokerageId: testBrokerageId,
      createdBy: testUserId,
    })
  })

  after(async () => {
    await LeadSource.deleteMany({ brokerageId: testBrokerageId })
    await User.deleteMany({ brokerageId: testBrokerageId })
    await Brokerage.deleteOne({ _id: testBrokerageId })
    await mongoose.disconnect()
  })

  beforeEach(() => {
    captureKeyL1Cache.clear()
  })

  // ─────────────────────────────────────────────────────────────
  // 1. Domain Allowlist Validation Engine (isDomainAllowed)
  // ─────────────────────────────────────────────────────────────
  describe('1. Domain Allowlist Matching (isDomainAllowed)', () => {
    it('should allow any origin when allowedDomains is empty or undefined', () => {
      assert.equal(isDomainAllowed('https://random-site.com', []), true)
      assert.equal(isDomainAllowed('https://random-site.com', undefined), true)
      assert.equal(isDomainAllowed('', []), true)
    })

    it('should reject requests without origin when allowedDomains is configured', () => {
      assert.equal(isDomainAllowed('', ['example.com']), false)
      assert.equal(isDomainAllowed(undefined, ['example.com']), false)
    })

    it('should match exact domain with and without protocols', () => {
      const allowed = ['example.com', 'mysite.org']
      assert.equal(isDomainAllowed('https://example.com', allowed), true)
      assert.equal(isDomainAllowed('http://example.com', allowed), true)
      assert.equal(isDomainAllowed('https://mysite.org/landing-page', allowed), true)
      assert.equal(isDomainAllowed('https://another.com', allowed), false)
    })

    it('should match domains with ports (e.g. localhost:3000)', () => {
      const allowed = ['localhost', 'localhost:3000']
      assert.equal(isDomainAllowed('http://localhost:3000', allowed), true)
      assert.equal(isDomainAllowed('http://localhost:5173', ['localhost:3000']), false)
    })

    it('should match wildcard subdomains (*.domain.com)', () => {
      const allowed = ['*.agencyportal.com']
      assert.equal(isDomainAllowed('https://sub.agencyportal.com', allowed), true)
      assert.equal(isDomainAllowed('https://marketing.agencyportal.com', allowed), true)
      assert.equal(isDomainAllowed('https://agencyportal.com', allowed), true)
      assert.equal(isDomainAllowed('https://notagencyportal.com', allowed), false)
    })

    it('should handle malformed URL strings gracefully without throwing', () => {
      const allowed = ['example.com']
      assert.equal(isDomainAllowed('::not-a-valid-url::', allowed), false)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. reCAPTCHA v3 Verification & Fallback (DI-003)
  // ─────────────────────────────────────────────────────────────
  describe('2. reCAPTCHA v3 Engine (verifyRecaptchaV3Token)', () => {
    it('should bypass verification if RECAPTCHA_SECRET_KEY is empty', async () => {
      const origKey = env.RECAPTCHA_SECRET_KEY
      try {
        env.RECAPTCHA_SECRET_KEY = ''
        const result = await verifyRecaptchaV3Token('any-token')
        assert.equal(result.success, true)
        assert.equal(result.score, 1.0)
      } finally {
        env.RECAPTCHA_SECRET_KEY = origKey
      }
    })

    it('should fail if secret key is present but token is missing', async () => {
      const origKey = env.RECAPTCHA_SECRET_KEY
      try {
        env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
        const result = await verifyRecaptchaV3Token(undefined)
        assert.equal(result.success, false)
        assert.match(result.error || '', /required/i)
      } finally {
        env.RECAPTCHA_SECRET_KEY = origKey
      }
    })

    it('should gracefully fallback if Google API throws network error (DI-003)', async () => {
      const origKey = env.RECAPTCHA_SECRET_KEY
      const origFetch = global.fetch
      try {
        env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
        // Mock fetch throwing network disconnect
        global.fetch = async () => {
          throw new Error('ENOTFOUND google.com')
        }

        const result = await verifyRecaptchaV3Token('sample-token')
        // Per DI-003: External service failure must not take down the ingestion endpoint
        assert.equal(result.success, true)
        assert.equal(result.error, 'fallback')
      } finally {
        env.RECAPTCHA_SECRET_KEY = origKey
        global.fetch = origFetch
      }
    })

    it('should reject submission if Google returns score < 0.5 (bot/spam)', async () => {
      const origKey = env.RECAPTCHA_SECRET_KEY
      const origFetch = global.fetch
      try {
        env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
        // Mock low score from Google API
        global.fetch = async () =>
          ({
            json: async () => ({ success: true, score: 0.1, action: 'lead_capture' }),
          } as any)

        const result = await verifyRecaptchaV3Token('bot-token')
        assert.equal(result.success, false)
        assert.match(result.error || '', /below threshold|spam/i)
      } finally {
        env.RECAPTCHA_SECRET_KEY = origKey
        global.fetch = origFetch
      }
    })

    it('should accept submission if Google returns score >= 0.5 (legitimate user)', async () => {
      const origKey = env.RECAPTCHA_SECRET_KEY
      const origFetch = global.fetch
      try {
        env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
        global.fetch = async () =>
          ({
            json: async () => ({ success: true, score: 0.9, action: 'lead_capture' }),
          } as any)

        const result = await verifyRecaptchaV3Token('human-token')
        assert.equal(result.success, true)
        assert.equal(result.score, 0.9)
      } finally {
        env.RECAPTCHA_SECRET_KEY = origKey
        global.fetch = origFetch
      }
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. Schema Validators (leadCaptureSchema & LeadSource schemas)
  // ─────────────────────────────────────────────────────────────
  describe('3. Zod Schema Validation', () => {
    it('should validate valid lead capture payload', () => {
      const parsed = leadCaptureSchema.safeParse({
        captureKey: validCaptureKey,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        phone: '+15551234567',
        message: 'Interested in touring this weekend',
        propertyAddress: '123 Main St, Austin TX',
        propertyPrice: 650000,
        zipCode: '78701',
        recaptchaToken: 'test-token',
      })
      assert.equal(parsed.success, true)
    })

    it('should reject invalid captureKey format (non-UUID)', () => {
      const parsed = leadCaptureSchema.safeParse({
        captureKey: 'not-a-valid-uuid',
        firstName: 'Jane',
        lastName: 'Doe',
      })
      assert.equal(parsed.success, false)
    })

    it('should reject missing first or last name', () => {
      const parsed = leadCaptureSchema.safeParse({
        captureKey: validCaptureKey,
        firstName: '',
        lastName: 'Doe',
      })
      assert.equal(parsed.success, false)
    })

    it('should accept allowedDomains array in createLeadSourceSchema and updateLeadSourceSchema', () => {
      const createRes = createLeadSourceSchema.safeParse({
        name: 'New Site Widget',
        type: 'website',
        allowedDomains: ['example.com', '*.testsite.com'],
      })
      assert.equal(createRes.success, true)
      if (createRes.success) {
        assert.deepEqual(createRes.data.allowedDomains, ['example.com', '*.testsite.com'])
      }

      const updateRes = updateLeadSourceSchema.safeParse({
        allowedDomains: ['updated.com'],
      })
      assert.equal(updateRes.success, true)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. Ingestion Service Flow (ingestCaptureWidgetLead)
  // ─────────────────────────────────────────────────────────────
  describe('4. Widget Ingestion Flow (ingestCaptureWidgetLead)', () => {
    it('should successfully ingest lead with valid capture key and open allowlist', async () => {
      const result = await ingestCaptureWidgetLead(
        {
          captureKey: validCaptureKey,
          firstName: 'Michael',
          lastName: 'Scott',
          email: 'michael.scott@dundermifflin.com',
          phone: '+15559876543',
          message: 'Interested in office commercial property',
          propertyAddress: '1725 Slough Ave, Scranton PA',
          propertyPrice: 1200000,
          zipCode: '18503',
        },
        '127.0.0.1',
        'https://external-client-site.com'
      )

      assert.ok(result.contact)
      assert.equal(result.contact.firstName, 'Michael')
      assert.equal(result.contact.lastName, 'Scott')
      assert.equal(result.contact.email, 'michael.scott@dundermifflin.com')
      assert.equal(result.isNew, true)
    })

    it('should reject invalid capture key with 404', async () => {
      const nonExistentKey = uuidv4()
      await assert.rejects(
        async () => {
          await ingestCaptureWidgetLead(
            {
              captureKey: nonExistentKey,
              firstName: 'Dwight',
              lastName: 'Schrute',
            },
            '127.0.0.1'
          )
        },
        (err: any) => {
          assert.equal(err instanceof AppError, true)
          assert.equal(err.statusCode, HTTP_STATUS.NOT_FOUND)
          return true
        }
      )
    })

    it('should reject submission from blocked domain with 403', async () => {
      await assert.rejects(
        async () => {
          await ingestCaptureWidgetLead(
            {
              captureKey: restrictedCaptureKey,
              firstName: 'Jim',
              lastName: 'Halpert',
            },
            '127.0.0.1',
            'https://unauthorized-domain.com'
          )
        },
        (err: any) => {
          assert.equal(err instanceof AppError, true)
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /Domain not authorized/i)
          return true
        }
      )
    })

    it('should accept submission from allowed domain with 201', async () => {
      const result = await ingestCaptureWidgetLead(
        {
          captureKey: restrictedCaptureKey,
          firstName: 'Pam',
          lastName: 'Beesly',
          email: 'pam.beesly@artschool.com',
        },
        '127.0.0.1',
        'https://example.com'
      )

      assert.ok(result.contact)
      assert.equal(result.contact.firstName, 'Pam')
      assert.equal(result.contact.lastName, 'Beesly')
    })

    it('should utilize L1 memory cache on subsequent submissions with the same captureKey', async () => {
      const cacheKey = `capture:${validCaptureKey}`

      // First submission populates L1 cache
      await ingestCaptureWidgetLead(
        {
          captureKey: validCaptureKey,
          firstName: 'Phyllis',
          lastName: 'Vance',
          email: 'phyllis@vancerefrigeration.com',
        },
        '127.0.0.1'
      )

      assert.equal(captureKeyL1Cache.has(cacheKey), true)

      // Submitting again should hit L1 cache
      const result = await ingestCaptureWidgetLead(
        {
          captureKey: validCaptureKey,
          firstName: 'Stanley',
          lastName: 'Hudson',
          email: 'stanley@pretzelday.com',
        },
        '127.0.0.1'
      )

      assert.ok(result.contact)
      assert.equal(result.contact.firstName, 'Stanley')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5. Controller End-to-End Handler (captureWidgetHandler)
  // ─────────────────────────────────────────────────────────────
  describe('5. captureWidgetHandler HTTP Controller', () => {
    it('should handle lead capture HTTP request and return 201 Created', async () => {
      const req: any = {
        body: {
          captureKey: validCaptureKey,
          firstName: 'Andy',
          lastName: 'Bernard',
          email: 'cornell.andy@scranton.com',
          phone: '+15556789012',
        },
        ip: '192.168.1.100',
        headers: {
          origin: 'https://mysite.com',
        },
      }
      const res = createMockResponse()
      let nextCalled = false
      const next = (err?: any) => {
        if (err) nextCalled = true
      }

      await captureWidgetHandler(req, res, next)

      assert.equal(nextCalled, false)
      assert.equal(res.statusCode, HTTP_STATUS.CREATED)
      assert.equal(res.body.success, true)
      assert.ok(res.body.data.contactId)
      assert.ok(res.headers['X-Response-Time'])
    })

    it('should forward domain rejection error to next(error)', async () => {
      const req: any = {
        body: {
          captureKey: restrictedCaptureKey,
          firstName: 'Toby',
          lastName: 'Flenderson',
        },
        headers: {
          origin: 'https://blocked-origin.org',
        },
      }
      const res = createMockResponse()
      let caughtError: any = null
      const next = (err?: any) => {
        caughtError = err
      }

      await captureWidgetHandler(req, res, next)

      assert.ok(caughtError)
      assert.equal(caughtError.statusCode, HTTP_STATUS.FORBIDDEN)
    })
  })
})
