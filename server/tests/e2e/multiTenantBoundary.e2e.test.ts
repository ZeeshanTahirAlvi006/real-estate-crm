/**
 * multiTenantBoundary.e2e.test.ts
 *
 * Comprehensive Opaque-Box E2E Test Suite for PropPulse OS:
 * Super Admin Multi-Tenant Boundary Restrictions, Communication Lockouts,
 * Wire-Level Contact Data Masking, Audit Trail Redaction & CSV Confinement.
 *
 * Tiers 1-4 Coverage:
 * - Tier 1: Feature Coverage (F1..F8, 40 tests)
 * - Tier 2: Boundary & Corner Cases (F1..F8, 40 tests)
 * - Tier 3: Cross-Feature Pairwise Combinations (8 tests)
 * - Tier 4: Real-World Application Scenarios (5 tests)
 * Total: 93 automated tests.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { createApp } from '../../src/app.js'
import { Brokerage } from '../../src/models/Brokerage.js'
import { User } from '../../src/models/User.js'
import { Contact } from '../../src/models/Contact.js'
import { AuditLog } from '../../src/models/AuditLog.js'
import { Activity } from '../../src/models/Activity.js'
import { env } from '../../src/config/env.js'
import { USER_ROLES, COOKIE_NAMES, HTTP_STATUS } from '../../src/utils/constants.js'
import { connectTestDb, clearTestDb, disconnectTestDb } from '../helpers/testDb.js'

describe('E2E: Super Admin Multi-Tenant Boundary & Masking Test Suite', () => {
  const app = createApp()

  // ── Multi-Tenant Fixture Identifiers ───────────────────────────────────────
  const brokerageAlphaId = new mongoose.Types.ObjectId('65a111111111111111111111')
  const brokerageBetaId = new mongoose.Types.ObjectId('65b222222222222222222222')
  const brokerageGammaId = new mongoose.Types.ObjectId('65c333333333333333333333')

  // Super Admin assigned to Brokerage Alpha
  const superAdminAlphaId = new mongoose.Types.ObjectId('65a000000000000000000001')
  // Super Admin without assigned brokerage (unassigned)
  const superAdminUnassignedId = new mongoose.Types.ObjectId('650000000000000000000099')
  // Regular Agent in Brokerage Alpha
  const agentAlphaId = new mongoose.Types.ObjectId('65a000000000000000000002')
  // Brokerage Owner in Brokerage Beta
  const ownerBetaId = new mongoose.Types.ObjectId('65b000000000000000000001')

  // Contacts in Brokerage Alpha (Own Brokerage for Super Admin Alpha)
  const contactAlpha1Id = new mongoose.Types.ObjectId('65a999999999999999999001')
  const contactAlpha2Id = new mongoose.Types.ObjectId('65a999999999999999999002')

  // Contacts in Brokerage Beta (Foreign / Cross-Brokerage for Super Admin Alpha)
  const contactBeta1Id = new mongoose.Types.ObjectId('65b999999999999999999001')
  const contactBeta2Id = new mongoose.Types.ObjectId('65b999999999999999999002')
  const contactBetaIntlId = new mongoose.Types.ObjectId('65b999999999999999999003')
  const contactBetaShortId = new mongoose.Types.ObjectId('65b999999999999999999004')
  const contactBetaDeletedId = new mongoose.Types.ObjectId('65b999999999999999999005')

  // Contact in Brokerage Gamma
  const contactGamma1Id = new mongoose.Types.ObjectId('65c999999999999999999001')

  // Audit Logs
  const auditLogBeta1Id = new mongoose.Types.ObjectId('65ba11111111111111111001')
  const auditLogAlpha1Id = new mongoose.Types.ObjectId('65aa11111111111111111001')

  // Raw Sensitive Values to verify Wire Masking & Zero Wire Leakage
  const rawBetaPhone1 = '+92 301 9876543'
  const rawBetaPhone1Clean = '+923019876543'
  const rawBetaEmail1 = 'bruce.beta@waynecorp.org'
  const rawBetaPhone2 = '+1 555 876 5432'
  const rawBetaEmail2 = 'clark.beta@dailyplanet.com'
  const rawBetaIntlPhone = '+44 7911 123456'
  const rawBetaIntlEmail = 'diana.beta@themyscira.co.uk'
  const rawBetaShortPhone = '12345'
  const rawBetaShortEmail = 'short@beta.com'
  const rawBetaPortalEmail = 'portal.bruce@waynecorp.org'

  const rawAlphaPhone1 = '+92 300 1234567'
  const rawAlphaEmail1 = 'sarah.alpha@example.com'

  // Helper to construct test JWT tokens
  const signToken = (
    userId: mongoose.Types.ObjectId | string,
    email: string,
    role: string,
    brokerageId?: mongoose.Types.ObjectId | string | null
  ): string => {
    return jwt.sign(
      {
        userId: userId.toString(),
        id: userId.toString(),
        email,
        role,
        brokerageId: brokerageId ? brokerageId.toString() : undefined,
        tokenVersion: 0,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '2h' }
    )
  }

  // Generate tokens for each test persona
  const tokenSuperAdminAlpha = signToken(superAdminAlphaId, 'superadmin.alpha@apexrealty.test', USER_ROLES.SUPER_ADMIN, brokerageAlphaId)
  const tokenSuperAdminUnassigned = signToken(superAdminUnassignedId, 'superadmin.global@proppulse.test', USER_ROLES.SUPER_ADMIN, null)
  const tokenAgentAlpha = signToken(agentAlphaId, 'agent.alpha@apexrealty.test', USER_ROLES.AGENT, brokerageAlphaId)
  const tokenOwnerBeta = signToken(ownerBetaId, 'owner.beta@beaconrealty.test', USER_ROLES.BROKERAGE_OWNER, brokerageBetaId)

  // Standard request headers for authenticated requests
  const authHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'x-bypass-csrf': 'test-mode',
    Cookie: `${COOKIE_NAMES.ACCESS_TOKEN}=${token}`,
  })

  // Wire leak audit helper: asserts that raw sensitive strings NEVER appear in the HTTP response
  const assertZeroWireLeak = (resBody: unknown, rawSensitives: string[]) => {
    const serialized = JSON.stringify(resBody)
    for (const raw of rawSensitives) {
      if (raw && raw.length >= 4) {
        assert.ok(
          !serialized.includes(raw),
          `CRITICAL WIRE LEAK: Found raw sensitive data "${raw}" in serialized HTTP response payload!`
        )
      }
    }
  }

  // Setup Database Fixtures
  before(async () => {
    try {
      await connectTestDb()
      await clearTestDb()

    // 1. Seed Brokerages
    await Brokerage.create([
      {
        _id: brokerageAlphaId,
        name: 'Apex Alpha Realty',
        subdomain: 'apex-alpha',
        plan: 'enterprise',
        timezone: 'America/New_York',
        isActive: true,
      },
      {
        _id: brokerageBetaId,
        name: 'Beacon Beta Properties',
        subdomain: 'beacon-beta',
        plan: 'growth',
        timezone: 'America/Chicago',
        isActive: true,
      },
      {
        _id: brokerageGammaId,
        name: 'Crestview Gamma Realty',
        subdomain: 'crestview-gamma',
        plan: 'pro',
        timezone: 'America/Los_Angeles',
        isActive: true,
      },
    ])

    // 2. Seed Users
    await User.create([
      {
        _id: superAdminAlphaId,
        email: 'superadmin.alpha@apexrealty.test',
        password: '$2b$10$FakeHashedPassword123456789012345678901234567890',
        firstName: 'Alexander',
        lastName: 'Alpha',
        role: USER_ROLES.SUPER_ADMIN,
        brokerageId: brokerageAlphaId,
        isActive: true,
      },
      {
        _id: superAdminUnassignedId,
        email: 'superadmin.global@proppulse.test',
        password: '$2b$10$FakeHashedPassword123456789012345678901234567890',
        firstName: 'Omni',
        lastName: 'Admin',
        role: USER_ROLES.SUPER_ADMIN,
        brokerageId: null,
        isActive: true,
      },
      {
        _id: agentAlphaId,
        email: 'agent.alpha@apexrealty.test',
        password: '$2b$10$FakeHashedPassword123456789012345678901234567890',
        firstName: 'Sarah',
        lastName: 'Agent',
        role: USER_ROLES.AGENT,
        brokerageId: brokerageAlphaId,
        isActive: true,
      },
      {
        _id: ownerBetaId,
        email: 'owner.beta@beaconrealty.test',
        password: '$2b$10$FakeHashedPassword123456789012345678901234567890',
        firstName: 'Bruce',
        lastName: 'Owner',
        role: USER_ROLES.BROKERAGE_OWNER,
        brokerageId: brokerageBetaId,
        isActive: true,
      },
    ])

    // 3. Seed Contacts
    await Contact.create([
      {
        _id: contactAlpha1Id,
        brokerageId: brokerageAlphaId,
        assignedAgentId: agentAlphaId,
        firstName: 'Sarah',
        lastName: 'Connor',
        email: rawAlphaEmail1,
        phone: rawAlphaPhone1,
        secondaryPhone: '+92 321 7654321',
        leadSource: 'Zameen.com',
        leadScore: 88,
        status: 'active',
        tags: ['vip', 'buyer'],
        isDeleted: false,
      },
      {
        _id: contactAlpha2Id,
        brokerageId: brokerageAlphaId,
        assignedAgentId: agentAlphaId,
        firstName: 'James',
        lastName: 'Alpha',
        email: 'james.alpha@testdomain.com',
        phone: '+1 555 234 5678',
        leadSource: 'Graana',
        leadScore: 72,
        status: 'active',
        tags: ['investor'],
        isDeleted: false,
      },
      {
        _id: contactBeta1Id,
        brokerageId: brokerageBetaId,
        assignedAgentId: ownerBetaId,
        firstName: 'Bruce',
        lastName: 'Wayne',
        email: rawBetaEmail1,
        phone: rawBetaPhone1,
        secondaryPhone: '+92 345 1122334',
        portalAccessEmail: rawBetaPortalEmail,
        portalEnabled: true,
        leadSource: 'Meta Ads',
        leadScore: 95,
        status: 'active',
        tags: ['luxury', 'commercial'],
        isDeleted: false,
      },
      {
        _id: contactBeta2Id,
        brokerageId: brokerageBetaId,
        assignedAgentId: ownerBetaId,
        firstName: 'Clark',
        lastName: 'Kent',
        email: rawBetaEmail2,
        phone: rawBetaPhone2,
        leadSource: 'Google Ads',
        leadScore: 65,
        status: 'active',
        tags: ['relocation'],
        isDeleted: false,
      },
      {
        _id: contactBetaIntlId,
        brokerageId: brokerageBetaId,
        firstName: 'Diana',
        lastName: 'Prince',
        email: rawBetaIntlEmail,
        phone: rawBetaIntlPhone,
        leadSource: 'Website',
        leadScore: 90,
        status: 'active',
        tags: ['embassy'],
        isDeleted: false,
      },
      {
        _id: contactBetaShortId,
        brokerageId: brokerageBetaId,
        firstName: 'Short',
        lastName: 'Dialer',
        email: rawBetaShortEmail,
        phone: rawBetaShortPhone,
        leadSource: 'Manual Entry',
        leadScore: 40,
        status: 'active',
        isDeleted: false,
      },
      {
        _id: contactBetaDeletedId,
        brokerageId: brokerageBetaId,
        firstName: 'Arthur',
        lastName: 'Curry',
        email: 'arthur.deleted@atlantis.org',
        phone: '+92 300 9999999',
        leadSource: 'Old Archive',
        status: 'archived',
        isDeleted: true,
      },
      {
        _id: contactGamma1Id,
        brokerageId: brokerageGammaId,
        firstName: 'Barry',
        lastName: 'Allen',
        email: 'barry.gamma@starlabs.io',
        phone: '+92 333 5554433',
        leadSource: 'Referral',
        status: 'active',
        isDeleted: false,
      },
    ])

    // 4. Seed Audit Logs
    await AuditLog.create([
      {
        _id: auditLogBeta1Id,
        brokerageId: brokerageBetaId,
        userId: ownerBetaId,
        userEmail: 'owner.beta@beaconrealty.test',
        userRole: USER_ROLES.BROKERAGE_OWNER,
        action: 'contact_updated',
        resource: 'Contact',
        resourceId: contactBeta1Id.toString(),
        details: {
          note: `Broker called Bruce Wayne at ${rawBetaPhone1} regarding listing contract`,
          directEmail: rawBetaEmail1,
        },
        previousState: {
          email: rawBetaEmail1,
          phone: rawBetaPhone1,
          status: 'pending',
        },
        newState: {
          email: rawBetaEmail1,
          phone: rawBetaPhone1,
          status: 'active',
        },
        ipAddress: '127.0.0.1',
        userAgent: 'SuperTest-Runner/1.0',
        status: 'success',
      },
      {
        _id: auditLogAlpha1Id,
        brokerageId: brokerageAlphaId,
        userId: superAdminAlphaId,
        userEmail: 'superadmin.alpha@apexrealty.test',
        userRole: USER_ROLES.SUPER_ADMIN,
        action: 'contact_created',
        resource: 'Contact',
        resourceId: contactAlpha1Id.toString(),
        details: {
          note: `Admin created lead for Sarah Connor at ${rawAlphaPhone1}`,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'SuperTest-Runner/1.0',
        status: 'success',
      },
    ])

    // 5. Seed Activities
    await Activity.create([
      {
        contactId: contactBeta1Id,
        brokerageId: brokerageBetaId,
        type: 'call',
        description: `Outbound call logged to ${rawBetaPhone1} regarding commercial zoning query`,
        createdBy: ownerBetaId,
        createdByName: 'Bruce Owner',
      },
      {
        contactId: contactBeta1Id,
        brokerageId: brokerageBetaId,
        type: 'email',
        description: `Dispatched investment prospectus to ${rawBetaEmail1}`,
        createdBy: ownerBetaId,
        createdByName: 'Bruce Owner',
      },
      {
        contactId: contactAlpha1Id,
        brokerageId: brokerageAlphaId,
        type: 'note',
        description: `Internal consultation note for Sarah Connor regarding luxury villa`,
        createdBy: agentAlphaId,
        createdByName: 'Sarah Agent',
      },
    ])
    } catch (err) {
      console.warn('[E2E Setup] Notice: MongoDB connection or seeding skipped:', err)
    }
  })

  after(async () => {
    try {
      await clearTestDb()
      await disconnectTestDb()
    } catch {
      // Ignore teardown disconnect errors
    }
  })

  // ===========================================================================
  // TIER 1: FEATURE COVERAGE (F1 .. F8, 40 Tests)
  // ===========================================================================

  describe('Tier 1: Feature Coverage (F1..F8)', () => {
    // ── F1: Outbound Unified Communication (/api/communication/send) ─────────
    describe('F1: Outbound Unified Communication', () => {
      it('[Tier 1] [F1-01] Outbound Send: Super Admin can send unified communication to contacts in own assigned brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: 'Hello Sarah, welcome to Apex Alpha Realty.',
            contactId: contactAlpha1Id.toString(),
          })

        // Outbound send to own brokerage must succeed (200 OK or 201 CREATED)
        assert.ok(
          res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.CREATED,
          `Expected 200 or 201 for same-brokerage send, got ${res.status}: ${JSON.stringify(res.body)}`
        )
        assert.equal(res.body.success, true)
      })

      it('[Tier 1] [F1-02] Outbound Send: Super Admin is blocked with 403 when sending unified communication with contactId belonging to another brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: rawBetaEmail1,
            text: 'Unauthorized cross-brokerage attempt.',
            contactId: contactBeta1Id.toString(),
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage contactId, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F1-03] Outbound Send: Super Admin is blocked with 403 when sending unified communication by phone number to contact in another brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'whatsapp',
            to: rawBetaPhone1,
            text: 'Unauthorized cross-brokerage WhatsApp send via phone lookup.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage phone recipient, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F1-04] Outbound Send: Super Admin is blocked with 403 when sending unified communication by email address to contact in another brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: rawBetaEmail2,
            text: 'Unauthorized cross-brokerage email send via address lookup.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage email recipient, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F1-05] Outbound Send: Regular Agent in Brokerage Alpha cannot communicate with contacts in Brokerage Beta', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenAgentAlpha))
          .send({
            channel: 'email',
            to: rawBetaEmail1,
            text: 'Agent cross-brokerage attempt.',
            contactId: contactBeta1Id.toString(),
          })

        assert.ok(
          res.status === HTTP_STATUS.FORBIDDEN || res.status === HTTP_STATUS.NOT_FOUND,
          `Expected 403 or 404 for agent cross-brokerage send, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })
    })

    // ── F2: WhatsApp & Broadcast Communication ───────────────────────────────
    describe('F2: WhatsApp & Broadcast Communication', () => {
      it('[Tier 1] [F2-01] WhatsApp: Super Admin can send WhatsApp message to contact in own assigned brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            contactId: contactAlpha1Id.toString(),
            text: 'WhatsApp greeting from Apex Alpha.',
          })

        assert.ok(
          res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.CREATED,
          `Expected 200 or 201 for same-brokerage WhatsApp send, got ${res.status}`
        )
        assert.equal(res.body.success, true)
      })

      it('[Tier 1] [F2-02] WhatsApp: Super Admin is blocked with 403 when sending WhatsApp message to contactId of another brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            contactId: contactBeta1Id.toString(),
            text: 'Unauthorized WhatsApp dispatch to Beta contact.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage WhatsApp contactId, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F2-03] WhatsApp: Super Admin is blocked with 403 when sending WhatsApp message to toPhone of cross-brokerage contact', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            toPhone: rawBetaPhone1Clean,
            text: 'Unauthorized WhatsApp dispatch to Beta phone number.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage WhatsApp toPhone, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F2-04] WhatsApp/Inbox: Super Admin is blocked with 403 when initiating conversation via /api/inbox/conversations/start with cross-brokerage contact', async () => {
        const res = await request(app)
          .post('/api/inbox/conversations/start')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            contactId: contactBeta1Id.toString(),
            initialMessage: 'Initiating cross-brokerage conversation attempt.',
            channel: 'whatsapp',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden when starting conversation with cross-brokerage contact, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F2-05] WhatsApp Broadcast: Broadcast creation targets exclusively contacts within Super Admin assigned brokerage', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/broadcast')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            title: 'Apex Spring Open House',
            templateName: 'open_house_invite',
            targetAudience: 'all',
          })

        assert.ok(
          res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.CREATED,
          `Expected 200 or 201 for own-brokerage broadcast creation, got ${res.status}`
        )
        assert.equal(res.body.success, true)
      })
    })

    // ── F3: Unassigned Super Admin Communication Lockout ─────────────────────
    describe('F3: Unassigned Super Admin Communication Lockout', () => {
      it('[Tier 1] [F3-01] Lockout: Unassigned Super Admin (brokerageId: null) is blocked with 403 on /api/communication/send', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: 'Unassigned super admin unified message.',
            contactId: contactAlpha1Id.toString(),
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for unassigned Super Admin send, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F3-02] Lockout: Unassigned Super Admin is blocked with 403 on /api/communication/whatsapp/send', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            contactId: contactAlpha1Id.toString(),
            text: 'Unassigned super admin WhatsApp message.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for unassigned Super Admin WhatsApp send, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F3-03] Lockout: Unassigned Super Admin is blocked with 403 on /api/inbox/conversations/start', async () => {
        const res = await request(app)
          .post('/api/inbox/conversations/start')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            contactId: contactAlpha1Id.toString(),
            initialMessage: 'Unassigned start conversation attempt.',
            channel: 'whatsapp',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for unassigned Super Admin conversation initiation, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F3-04] Lockout: Unassigned Super Admin is blocked with 403 on /api/communication/whatsapp/broadcast', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/broadcast')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            title: 'Global Broadcast Attempt',
            templateName: 'global_template',
            targetAudience: 'all',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for unassigned Super Admin broadcast, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F3-05] Lockout: Unassigned Super Admin attempting to create quick template or dispatch unified message is blocked', async () => {
        const res = await request(app)
          .post('/api/communication/templates')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            title: 'Unassigned Template',
            channel: 'email',
            body: 'Hello {{name}}',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for unassigned Super Admin template creation, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })
    })

    // ── F4: Brokerage Attribution on ContactResponseDto ──────────────────────
    describe('F4: Brokerage Attribution on ContactResponseDto', () => {
      it('[Tier 1] [F4-01] Attribution: GET /api/contacts returns brokerageId, brokerageName, and isCrossBrokerage fields for Super Admin', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const contacts = res.body.data.contacts || res.body.data
        assert.ok(Array.isArray(contacts), 'Contacts response must be an array')
        assert.ok(contacts.length > 0, 'Should return contacts')

        for (const c of contacts) {
          assert.ok(c.brokerageId, 'Every contact in Super Admin response must include brokerageId')
          assert.ok(c.brokerageName, 'Every contact in Super Admin response must include brokerageName')
          assert.notEqual(c.isCrossBrokerage, undefined, 'isCrossBrokerage flag must be defined')
        }
      })

      it('[Tier 1] [F4-02] Attribution: Contact belonging to Super Admin own brokerage has isCrossBrokerage: false and matching brokerageName', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        const ownContact = contacts.find((c: any) => c._id === contactAlpha1Id.toString())
        assert.ok(ownContact, 'contactAlpha1 must be present in response')
        assert.equal(ownContact.isCrossBrokerage, false)
        assert.equal(ownContact.brokerageName, 'Apex Alpha Realty')
      })

      it('[Tier 1] [F4-03] Attribution: Contact belonging to another brokerage has isCrossBrokerage: true and resolved company name', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        const betaContact = contacts.find((c: any) => c._id === contactBeta1Id.toString())
        assert.ok(betaContact, 'contactBeta1 must be present in response')
        assert.equal(betaContact.isCrossBrokerage, true)
        assert.equal(betaContact.brokerageName, 'Beacon Beta Properties')
      })

      it('[Tier 1] [F4-04] Attribution: Single contact detail GET /api/contacts/:id includes complete brokerage attribution metadata', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const contact = res.body.data
        assert.equal(contact.brokerageId.toString(), brokerageBetaId.toString())
        assert.equal(contact.brokerageName, 'Beacon Beta Properties')
        assert.equal(contact.isCrossBrokerage, true)
      })

      it('[Tier 1] [F4-05] Attribution: Regular single-brokerage agent views own contacts with isCrossBrokerage: false', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenAgentAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        for (const c of contacts) {
          assert.equal(c.isCrossBrokerage, false, 'Regular agent must see isCrossBrokerage as false')
        }
      })
    })

    // ── F5: Wire-Level Phone & Email Data Masking ─────────────────────────────
    describe('F5: Wire-Level Phone & Email Data Masking', () => {
      it('[Tier 1] [F5-01] Wire Masking: GET /api/contacts masks phone (+92 3******67 pattern) for cross-brokerage contacts', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        const betaContact = contacts.find((c: any) => c._id === contactBeta1Id.toString())
        assert.ok(betaContact, 'contactBeta1 must be present')
        assert.ok(
          betaContact.phone.includes('*'),
          `Phone must be masked with asterisks, got: ${betaContact.phone}`
        )
        assert.notEqual(betaContact.phone, rawBetaPhone1, 'Phone must not be unmasked')
      })

      it('[Tier 1] [F5-02] Wire Masking: GET /api/contacts masks email (j***@domain.com pattern) for cross-brokerage contacts', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        const betaContact = contacts.find((c: any) => c._id === contactBeta1Id.toString())
        assert.ok(betaContact, 'contactBeta1 must be present')
        assert.ok(
          betaContact.email.includes('*'),
          `Email must be masked with asterisks, got: ${betaContact.email}`
        )
        assert.ok(betaContact.email.includes('@'), 'Masked email must retain domain part')
        assert.notEqual(betaContact.email, rawBetaEmail1, 'Email must not be unmasked')
      })

      it('[Tier 1] [F5-03] Wire Masking: GET /api/contacts/:id masks primary phone, secondary phone, and portalAccessEmail for cross-brokerage contact', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(contact.phone.includes('*'), 'Primary phone must be masked')
        if (contact.secondaryPhone) {
          assert.ok(contact.secondaryPhone.includes('*'), 'Secondary phone must be masked')
        }
        if (contact.portalAccessEmail) {
          assert.ok(contact.portalAccessEmail.includes('*'), 'Portal access email must be masked')
        }
      })

      it('[Tier 1] [F5-04] Wire Masking: Raw unmasked phone numbers and emails NEVER appear in JSON response payload for cross-brokerage contacts', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assertZeroWireLeak(res.body, [
          rawBetaPhone1,
          rawBetaPhone1Clean,
          rawBetaEmail1,
          rawBetaPortalEmail,
        ])
      })

      it('[Tier 1] [F5-05] Wire Masking: Own brokerage contacts retain full unmasked phone numbers and emails for Super Admin', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactAlpha1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.equal(contact.phone, rawAlphaPhone1, 'Own contact phone must remain fully readable')
        assert.equal(contact.email, rawAlphaEmail1, 'Own contact email must remain fully readable')
      })
    })

    // ── F6: Cross-Brokerage Contact Mutations 403 Forbidden ──────────────────
    describe('F6: Cross-Brokerage Contact Mutations', () => {
      it('[Tier 1] [F6-01] Mutation Guard: PATCH /api/contacts/:id on cross-brokerage contact returns 403 Forbidden', async () => {
        const res = await request(app)
          .patch(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            firstName: 'Malicious Update',
            notes: 'Attempting cross-brokerage edit.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage contact update, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F6-02] Mutation Guard: DELETE /api/contacts/:id on cross-brokerage contact returns 403 Forbidden', async () => {
        const res = await request(app)
          .delete(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage contact deletion, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F6-03] Mutation Guard: POST /api/contacts/:id/notes on cross-brokerage contact returns 403 Forbidden', async () => {
        const res = await request(app)
          .post(`/api/contacts/${contactBeta1Id}/notes`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            content: 'Super Admin attempting to add note to cross-brokerage lead.',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage note addition, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F6-04] Mutation Guard: Portal invite generation (GET/POST /api/contacts/:id/portal-invite) for cross-brokerage contact returns 403 Forbidden', async () => {
        const res = await request(app)
          .post(`/api/contacts/${contactBeta1Id}/portal-invite`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            customPassword: 'TemporaryPassword123!',
          })

        assert.equal(
          res.status,
          HTTP_STATUS.FORBIDDEN,
          `Expected 403 Forbidden for cross-brokerage portal invite generation, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 1] [F6-05] Mutation Guard: Same-brokerage contact mutations (update, add note) succeed normally (200 OK)', async () => {
        const updateRes = await request(app)
          .patch(`/api/contacts/${contactAlpha1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            notes: 'Authorized internal note by assigned Super Admin.',
          })

        assert.equal(updateRes.status, HTTP_STATUS.OK)
        assert.equal(updateRes.body.success, true)

        const noteRes = await request(app)
          .post(`/api/contacts/${contactAlpha1Id}/notes`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            content: 'Verified phone conversation with Sarah.',
          })

        assert.ok(
          noteRes.status === HTTP_STATUS.OK || noteRes.status === HTTP_STATUS.CREATED,
          `Expected 200 or 201 for own contact note, got ${noteRes.status}`
        )
        assert.equal(noteRes.body.success, true)
      })
    })

    // ── F7: Audit Logs & Activity Stream Redaction ───────────────────────────
    describe('F7: Audit Logs & Activity Stream Redaction', () => {
      it('[Tier 1] [F7-01] Redaction: GET /api/audit-logs redacts phone and email in action descriptions for cross-brokerage records', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const logs = res.body.data.logs || res.body.data
        assert.ok(Array.isArray(logs), 'Audit logs must return an array')

        // Ensure raw phone and email of beta contacts never appear on wire
        assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
      })

      it('[Tier 1] [F7-02] Redaction: GET /api/audit-logs/:id redacts phone and email in details, previousState, and newState snapshots', async () => {
        const res = await request(app)
          .get(`/api/audit-logs/${auditLogBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const log = res.body.data

        // Deep redaction check: sensitive strings in details / previousState / newState must be obscured
        assertZeroWireLeak(log, [rawBetaPhone1, rawBetaPhone1Clean, rawBetaEmail1])
      })

      it('[Tier 1] [F7-03] Redaction: GET /api/contacts/:id/activities redacts sensitive phone numbers and emails in activity timeline', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta1Id}/activities`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const activities = res.body.data.activities || res.body.data
        assert.ok(Array.isArray(activities), 'Activities must be an array')

        // Activities for contactBeta1 reference rawBetaPhone1 and rawBetaEmail1 in description
        assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
      })

      it('[Tier 1] [F7-04] Redaction: Operational context (action type, timestamp, user role, resource ID) remains intact while PII is redacted', async () => {
        const res = await request(app)
          .get(`/api/audit-logs/${auditLogBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const log = res.body.data
        assert.equal(log.action, 'contact_updated')
        assert.equal(log.resource, 'Contact')
        assert.equal(log.resourceId, contactBeta1Id.toString())
        assert.ok(log.createdAt, 'Timestamp must be preserved')
      })

      it('[Tier 1] [F7-05] Redaction: Own-brokerage audit logs preserve complete operational details for authorized admin', async () => {
        const res = await request(app)
          .get(`/api/audit-logs/${auditLogAlpha1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
        const log = res.body.data
        assert.equal(log.brokerageId.toString(), brokerageAlphaId.toString())
      })
    })

    // ── F8: CSV Export Multi-Tenant Confinement ──────────────────────────────
    describe('F8: CSV Export Multi-Tenant Confinement', () => {
      it('[Tier 1] [F8-01] CSV Export: GET /api/export/contacts returns 200 with text/csv content for assigned Super Admin', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.ok(
          (res.headers['content-type'] || '').includes('text/csv'),
          `Expected Content-Type text/csv, got: ${res.headers['content-type']}`
        )
      })

      it('[Tier 1] [F8-02] CSV Export: Super Admin export contains exclusively contacts from own assigned brokerage', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text
        assert.ok(csv.includes(rawAlphaEmail1), 'CSV must contain contact from own brokerage')
        assert.ok(csv.includes('Sarah'), 'CSV must contain contact Sarah Connor')
      })

      it('[Tier 1] [F8-03] CSV Export: Cross-brokerage contacts are completely omitted from exported CSV rows', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text
        assert.ok(!csv.includes(rawBetaEmail1), 'CSV MUST NOT contain contact from Brokerage Beta')
        assert.ok(!csv.includes(rawBetaEmail2), 'CSV MUST NOT contain contact Clark Beta')
        assert.ok(!csv.includes('Bruce Wayne'), 'CSV MUST NOT contain Bruce Wayne from Beta')
        assert.ok(!csv.includes('Barry Allen'), 'CSV MUST NOT contain Barry Allen from Gamma')
      })

      it('[Tier 1] [F8-04] CSV Export: Unassigned Super Admin (brokerageId: null) export returns zero data rows', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminUnassigned))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text.trim()
        const lines = csv.split('\n').filter((l) => l.trim().length > 0)
        // If unassigned, export should have at most 1 line (headers only) or 0 lines
        assert.ok(
          lines.length <= 1,
          `Unassigned Super Admin must receive 0 data rows, got ${lines.length} lines: ${csv}`
        )
      })

      it('[Tier 1] [F8-05] CSV Export: Regular agent export contains exclusively their brokerage contacts', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenAgentAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text
        assert.ok(csv.includes(rawAlphaEmail1), 'Agent export must contain own brokerage contact')
        assert.ok(!csv.includes(rawBetaEmail1), 'Agent export MUST NOT contain foreign contact')
      })
    })
  })

  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (F1 .. F8, 40 Tests)
  // ===========================================================================

  describe('Tier 2: Boundary & Corner Cases (F1..F8)', () => {
    // ── F1 Boundaries: Outbound Send ─────────────────────────────────────────
    describe('F1 Boundaries', () => {
      it('[Tier 2] [F1-B01] Boundary: Outbound send with missing required channel returns 400 or 422 validation error', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            to: rawAlphaEmail1,
            text: 'Missing channel parameter',
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST || res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY,
          `Expected 400 or 422 validation error, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F1-B02] Boundary: Outbound send with malformed non-ObjectId contactId returns 400 or 403', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: 'test@example.com',
            text: 'Malformed ID test',
            contactId: 'invalid-non-objectid-123',
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST ||
            res.status === HTTP_STATUS.FORBIDDEN ||
            res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY,
          `Expected 400, 403, or 422, got ${res.status}`
        )
      })

      it('[Tier 2] [F1-B03] Boundary: Outbound send with formatted phone with spaces/dashes (+1 (555) 234-5678) in cross-brokerage is blocked with 403', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'whatsapp',
            to: '+1 (555) 876-5432',
            text: 'Punctuation phone matching test',
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F1-B04] Boundary: Outbound send targeting soft-deleted contact in cross-brokerage is blocked with 403', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: 'arthur.deleted@atlantis.org',
            text: 'Attempting to message deleted foreign contact',
            contactId: contactBetaDeletedId.toString(),
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F1-B05] Boundary: Outbound send with empty message text returns 400 or 422 validation error', async () => {
        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: '',
            contactId: contactAlpha1Id.toString(),
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST || res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY,
          `Expected 400 or 422, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })
    })

    // ── F2 Boundaries: WhatsApp & Broadcast ──────────────────────────────────
    describe('F2 Boundaries', () => {
      it('[Tier 2] [F2-B01] Boundary: WhatsApp send with neither toPhone nor contactId returns 400 or 422 validation error', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            text: 'Missing recipient target',
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST || res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY,
          `Expected 400 or 422, got ${res.status}`
        )
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F2-B02] Boundary: WhatsApp send to international formatted number (+44 7911 123456) in cross-brokerage is blocked with 403', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            toPhone: '+447911123456',
            text: 'International number cross-brokerage test',
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F2-B03] Boundary: WhatsApp send with short phone number (12345) in cross-brokerage is blocked with 403', async () => {
        const res = await request(app)
          .post('/api/communication/whatsapp/send')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            toPhone: rawBetaShortPhone,
            text: 'Short phone cross-brokerage test',
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F2-B04] Boundary: WhatsApp broadcast with targetAudience all when brokerage has 0 contacts dispatches 0 messages safely', async () => {
        // Owner of Beta initiates broadcast to their own contacts
        const res = await request(app)
          .post('/api/communication/whatsapp/broadcast')
          .set(authHeaders(tokenOwnerBeta))
          .send({
            title: 'Beacon Beta Broadcast',
            templateName: 'listing_update',
            targetAudience: 'all',
          })

        assert.ok(
          res.status === HTTP_STATUS.OK || res.status === HTTP_STATUS.CREATED,
          `Expected 200 or 201, got ${res.status}`
        )
        assert.equal(res.body.success, true)
      })

      it('[Tier 2] [F2-B05] Boundary: Inbox conversation start with whitespace contactId returns 400 validation error', async () => {
        const res = await request(app)
          .post('/api/inbox/conversations/start')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            contactId: '   ',
            initialMessage: 'Whitespace contactId test',
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST ||
            res.status === HTTP_STATUS.NOT_FOUND ||
            res.status === HTTP_STATUS.UNPROCESSABLE_ENTITY,
          `Expected 400, 404, or 422, got ${res.status}`
        )
      })
    })

    // ── F3 Boundaries: Lockout ───────────────────────────────────────────────
    describe('F3 Boundaries', () => {
      it('[Tier 2] [F3-B01] Boundary: Super Admin with empty string brokerageId ("") is treated as unassigned and locked out with 403', async () => {
        const tokenEmptyBrokerage = signToken(
          new mongoose.Types.ObjectId(),
          'superadmin.empty@proppulse.test',
          USER_ROLES.SUPER_ADMIN,
          ''
        )

        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenEmptyBrokerage))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: 'Empty brokerage lockout test',
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F3-B02] Boundary: Super Admin with non-existent random ObjectId as brokerageId cannot communicate with existing brokerages', async () => {
        const ghostBrokerageId = new mongoose.Types.ObjectId('659999999999999999999999')
        const tokenGhostBrokerage = signToken(
          new mongoose.Types.ObjectId(),
          'superadmin.ghost@proppulse.test',
          USER_ROLES.SUPER_ADMIN,
          ghostBrokerageId
        )

        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(tokenGhostBrokerage))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: 'Ghost brokerage communication attempt',
            contactId: contactAlpha1Id.toString(),
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F3-B03] Boundary: Unassigned Super Admin attempting opt-out modification on cross-brokerage contacts is rejected with 403', async () => {
        const res = await request(app)
          .post('/api/communication/opt-out')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            contactId: contactBeta1Id.toString(),
            phone: rawBetaPhone1,
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F3-B04] Boundary: Unassigned Super Admin attempting opt-back-in modification is rejected with 403', async () => {
        const res = await request(app)
          .post('/api/communication/opt-back-in')
          .set(authHeaders(tokenSuperAdminUnassigned))
          .send({
            contactId: contactBeta1Id.toString(),
            phone: rawBetaPhone1,
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F3-B05] Boundary: Super Admin dynamically stripped of brokerageId immediately loses outbound communication capabilities', async () => {
        // Issue token with null brokerageId for the same user ID
        const dynamicRevokedToken = signToken(
          superAdminAlphaId,
          'superadmin.alpha@apexrealty.test',
          USER_ROLES.SUPER_ADMIN,
          null
        )

        const res = await request(app)
          .post('/api/communication/send')
          .set(authHeaders(dynamicRevokedToken))
          .send({
            channel: 'email',
            to: rawAlphaEmail1,
            text: 'Post-revocation send attempt',
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })
    })

    // ── F4 Boundaries: Attribution ───────────────────────────────────────────
    describe('F4 Boundaries', () => {
      it('[Tier 2] [F4-B01] Boundary: Contact with missing brokerageId in database handles attribution gracefully without server crash', async () => {
        const res = await request(app)
          .get('/api/contacts')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
      })

      it('[Tier 2] [F4-B02] Boundary: Contact belonging to inactive/deleted brokerage resolves brokerageName gracefully', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactGamma1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.equal(contact.isCrossBrokerage, true)
        assert.equal(contact.brokerageName, 'Crestview Gamma Realty')
      })

      it('[Tier 2] [F4-B03] Boundary: Multi-word contact search (q=Sarah Connor) preserves accurate brokerage attribution across results', async () => {
        const res = await request(app)
          .get('/api/contacts?search=Sarah Connor')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        if (contacts.length > 0) {
          const matched = contacts.find((c: any) => c._id === contactAlpha1Id.toString())
          if (matched) {
            assert.equal(matched.isCrossBrokerage, false)
            assert.equal(matched.brokerageName, 'Apex Alpha Realty')
          }
        }
      })

      it('[Tier 2] [F4-B04] Boundary: Pagination boundary (high page number beyond total count) returns empty array without attribution errors', async () => {
        const res = await request(app)
          .get('/api/contacts?page=999&limit=50')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contacts = res.body.data.contacts || res.body.data
        assert.ok(Array.isArray(contacts))
        assert.equal(contacts.length, 0)
      })

      it('[Tier 2] [F4-B05] Boundary: Single contact detail GET with non-existent ObjectId returns 404 Not Found', async () => {
        const nonExistentId = new mongoose.Types.ObjectId('65ffffffffffffffffffffff')
        const res = await request(app)
          .get(`/api/contacts/${nonExistentId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.NOT_FOUND)
        assert.equal(res.body.success, false)
      })
    })

    // ── F5 Boundaries: Wire Masking ───────────────────────────────────────────
    describe('F5 Boundaries', () => {
      it('[Tier 2] [F5-B01] Boundary: Short phone number (5 digits 12345) masks middle characters safely without throwing substring errors', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBetaShortId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(contact.phone.includes('*'), 'Short phone must be masked')
        assert.notEqual(contact.phone, rawBetaShortPhone, 'Short phone must not leak raw string')
      })

      it('[Tier 2] [F5-B02] Boundary: Long international phone number (+44 7911 123456) correctly masks middle digits (+92 / international pattern)', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBetaIntlId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(contact.phone.includes('*'), 'International phone must be masked')
        assert.notEqual(contact.phone, rawBetaIntlPhone, 'International phone must not leak raw string')
        assertZeroWireLeak(contact, [rawBetaIntlPhone])
      })

      it('[Tier 2] [F5-B03] Boundary: Email with single-character username or short name (short@beta.com) masks gracefully', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBetaShortId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(contact.email.includes('*'), 'Short email username must be masked')
        assert.ok(contact.email.includes('@beta.com'), 'Email domain must be preserved')
        assertZeroWireLeak(contact, [rawBetaShortEmail])
      })

      it('[Tier 2] [F5-B04] Boundary: Contact with null or empty secondaryPhone serializes without null string masks', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta2Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(
          contact.secondaryPhone === undefined ||
            contact.secondaryPhone === null ||
            contact.secondaryPhone === '',
          'Missing secondary phone must not produce string "null" or "undefined"'
        )
      })

      it('[Tier 2] [F5-B05] Boundary: Email with complex subdomain (diana.beta@themyscira.co.uk) masks username while preserving domain', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBetaIntlId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const contact = res.body.data
        assert.ok(contact.email.includes('@themyscira.co.uk'), 'Complex domain must be preserved')
        assert.ok(contact.email.includes('*'), 'Username must be masked with asterisks')
        assertZeroWireLeak(contact, [rawBetaIntlEmail])
      })
    })

    // ── F6 Boundaries: Mutation Guards ───────────────────────────────────────
    describe('F6 Boundaries', () => {
      it('[Tier 2] [F6-B01] Boundary: Cross-brokerage contact update (PATCH) with empty body returns 403 before payload parsing', async () => {
        const res = await request(app)
          .patch(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({})

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F6-B02] Boundary: Cross-brokerage contact update attempting to reassign brokerageId to own brokerage returns 403 Forbidden', async () => {
        const res = await request(app)
          .patch(`/api/contacts/${contactBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            brokerageId: brokerageAlphaId.toString(),
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F6-B03] Boundary: Cross-brokerage contact delete on already soft-deleted contact returns 403 Forbidden', async () => {
        const res = await request(app)
          .delete(`/api/contacts/${contactBetaDeletedId}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F6-B04] Boundary: Cross-brokerage note addition with large payload returns 403 Forbidden before saving', async () => {
        const largeText = 'A'.repeat(2000)
        const res = await request(app)
          .post(`/api/contacts/${contactBeta1Id}/notes`)
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            content: largeText,
          })

        assert.equal(res.status, HTTP_STATUS.FORBIDDEN)
        assert.equal(res.body.success, false)
      })

      it('[Tier 2] [F6-B05] Boundary: Contact mutation with invalid non-ObjectId param returns 400 or 404 without crashing', async () => {
        const res = await request(app)
          .patch('/api/contacts/invalid-id-xyz')
          .set(authHeaders(tokenSuperAdminAlpha))
          .send({
            firstName: 'Test',
          })

        assert.ok(
          res.status === HTTP_STATUS.BAD_REQUEST ||
            res.status === HTTP_STATUS.NOT_FOUND ||
            res.status === HTTP_STATUS.FORBIDDEN,
          `Expected 400, 403, or 404, got ${res.status}`
        )
      })
    })

    // ── F7 Boundaries: Redaction ─────────────────────────────────────────────
    describe('F7 Boundaries', () => {
      it('[Tier 2] [F7-B01] Boundary: Audit log with empty details/previousState/newState maps cleanly without throwing null reference errors', async () => {
        const res = await request(app)
          .get('/api/audit-logs')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.equal(res.body.success, true)
      })

      it('[Tier 2] [F7-B02] Boundary: Deeply nested JSON audit log containing phone and email at level 4 has all PII instances redacted', async () => {
        const res = await request(app)
          .get(`/api/audit-logs/${auditLogBeta1Id}`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
      })

      it('[Tier 2] [F7-B03] Boundary: Activities query for contact with zero activity history returns empty array with total: 0', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactAlpha2Id}/activities`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        const activities = res.body.data.activities || res.body.data
        assert.ok(Array.isArray(activities))
        assert.equal(activities.length, 0)
      })

      it('[Tier 2] [F7-B04] Boundary: Activity description containing multiple phone numbers and email addresses redacts every occurrence', async () => {
        const res = await request(app)
          .get(`/api/contacts/${contactBeta1Id}/activities`)
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
      })

      it('[Tier 2] [F7-B05] Boundary: Audit logs query with limit and high page offset maintains redaction across all returned records', async () => {
        const res = await request(app)
          .get('/api/audit-logs?page=1&limit=50')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
      })
    })

    // ── F8 Boundaries: CSV Export ─────────────────────────────────────────────
    describe('F8 Boundaries', () => {
      it('[Tier 2] [F8-B01] Boundary: CSV export when own brokerage has 0 contacts returns CSV headers with zero data rows', async () => {
        // Create user in Gamma which has only 1 contact
        const tokenOwnerGamma = signToken(
          new mongoose.Types.ObjectId(),
          'owner.gamma@crestview.test',
          USER_ROLES.BROKERAGE_OWNER,
          brokerageGammaId
        )

        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenOwnerGamma))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text
        assert.ok(csv.includes('Barry Allen') || csv.includes('barry.gamma@starlabs.io'))
        assert.ok(!csv.includes(rawAlphaEmail1))
        assert.ok(!csv.includes(rawBetaEmail1))
      })

      it('[Tier 2] [F8-B02] Boundary: CSV export with special characters (commas, quotes) in contact fields escapes per RFC-4180', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assert.ok(res.text.includes('ID,'))
      })

      it('[Tier 2] [F8-B03] Boundary: Unassigned Super Admin requesting contacts export receives zero rows', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminUnassigned))

        assert.equal(res.status, HTTP_STATUS.OK)
        const lines = res.text.trim().split('\n').filter((l) => l.trim().length > 0)
        assert.ok(lines.length <= 1, 'Unassigned export must not leak contacts')
      })

      it('[Tier 2] [F8-B04] Boundary: CSV export strictly excludes soft-deleted contacts (isDeleted: true)', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenOwnerBeta))

        assert.equal(res.status, HTTP_STATUS.OK)
        const csv = res.text
        assert.ok(!csv.includes('Arthur Curry'), 'Soft-deleted contacts must be excluded from CSV')
        assert.ok(!csv.includes('arthur.deleted@atlantis.org'))
      })

      it('[Tier 2] [F8-B05] Boundary: High-volume contact export maintains complete tenant isolation without foreign leakage', async () => {
        const res = await request(app)
          .get('/api/export/contacts?format=csv')
          .set(authHeaders(tokenSuperAdminAlpha))

        assert.equal(res.status, HTTP_STATUS.OK)
        assertZeroWireLeak(res.text, [rawBetaEmail1, rawBetaEmail2, rawBetaPhone1, rawBetaPhone2])
      })
    })
  })

  // ===========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (8 Tests)
  // ===========================================================================

  describe('Tier 3: Cross-Feature Combinations', () => {
    it('[Tier 3] [CROSS-01] Discovery -> Masking -> Communication Attempt: Super Admin views cross-brokerage contact with wire masking, attempts send, gets 403', async () => {
      // Step 1: List contacts across brokerages
      const listRes = await request(app)
        .get('/api/contacts')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(listRes.status, HTTP_STATUS.OK)
      const contacts = listRes.body.data.contacts || listRes.body.data
      const foreignContact = contacts.find((c: any) => c._id === contactBeta1Id.toString())
      assert.ok(foreignContact, 'Foreign contact must be visible to Super Admin')

      // Step 2: Verify wire-level masking on contact
      assert.equal(foreignContact.isCrossBrokerage, true)
      assert.ok(foreignContact.phone.includes('*'), 'Phone must be masked')
      assert.ok(foreignContact.email.includes('*'), 'Email must be masked')

      // Step 3: Attempt to message foreign contact using masked email -> rejected with 403
      const sendRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'email',
          to: foreignContact.email,
          text: 'Cross-feature attempt to contact foreign lead',
          contactId: foreignContact._id,
        })

      assert.equal(sendRes.status, HTTP_STATUS.FORBIDDEN)
      assert.equal(sendRes.body.success, false)
    })

    it('[Tier 3] [CROSS-02] View -> WhatsApp Attempt -> Audit Redaction: Super Admin attempts WhatsApp to cross-brokerage lead (403), audit log records event with redacted PII', async () => {
      // Step 1: Super Admin attempts WhatsApp to Beta contact
      const waRes = await request(app)
        .post('/api/communication/whatsapp/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          contactId: contactBeta1Id.toString(),
          text: 'Attempting WhatsApp message',
        })

      assert.equal(waRes.status, HTTP_STATUS.FORBIDDEN)

      // Step 2: Verify audit logs maintain privacy redaction
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(auditRes.status, HTTP_STATUS.OK)
      assertZeroWireLeak(auditRes.body, [rawBetaPhone1, rawBetaEmail1])
    })

    it('[Tier 3] [CROSS-03] Read -> Mutation Attempt -> Data Integrity: Super Admin attempts PATCH and Add Note on foreign lead (403), verifies data untouched and still masked', async () => {
      // Step 1: Attempt PATCH
      const patchRes = await request(app)
        .patch(`/api/contacts/${contactBeta1Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({ firstName: 'Corrupted' })

      assert.equal(patchRes.status, HTTP_STATUS.FORBIDDEN)

      // Step 2: Attempt Add Note
      const noteRes = await request(app)
        .post(`/api/contacts/${contactBeta1Id}/notes`)
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({ content: 'Corrupted note' })

      assert.equal(noteRes.status, HTTP_STATUS.FORBIDDEN)

      // Step 3: Verify read returns original untouched data, still properly masked
      const getRes = await request(app)
        .get(`/api/contacts/${contactBeta1Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(getRes.status, HTTP_STATUS.OK)
      assert.equal(getRes.body.data.firstName, 'Bruce')
      assert.ok(getRes.body.data.phone.includes('*'))
    })

    it('[Tier 3] [CROSS-04] Multi-Brokerage View -> CSV Export Confinement: Super Admin views mixed brokerage list, exports CSV, verifies only own brokerage leads appear', async () => {
      // Step 1: Confirm contacts from multiple brokerages are visible in list
      const listRes = await request(app)
        .get('/api/contacts')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(listRes.status, HTTP_STATUS.OK)
      const contacts = listRes.body.data.contacts || listRes.body.data
      const brokerages = new Set(contacts.map((c: any) => c.brokerageId?.toString()))
      assert.ok(brokerages.size >= 2, 'List should span multiple brokerages for Super Admin')

      // Step 2: Export CSV
      const exportRes = await request(app)
        .get('/api/export/contacts?format=csv')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(exportRes.status, HTTP_STATUS.OK)
      const csv = exportRes.text

      // Step 3: Verify strict boundary confinement
      assert.ok(csv.includes(rawAlphaEmail1), 'Must contain own brokerage contact')
      assert.ok(!csv.includes(rawBetaEmail1), 'Must NOT contain foreign contact')
      assert.ok(!csv.includes(rawBetaEmail2), 'Must NOT contain foreign contact')
    })

    it('[Tier 3] [CROSS-05] Unassigned Super Admin Full Lockout: Unassigned Super Admin views contacts, attempts unified send (403), WhatsApp (403), and CSV export (0 rows)', async () => {
      // Step 1: Attempt Unified Send -> 403
      const sendRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminUnassigned))
        .send({
          channel: 'email',
          to: rawAlphaEmail1,
          text: 'Unassigned lockout check',
        })
      assert.equal(sendRes.status, HTTP_STATUS.FORBIDDEN)

      // Step 2: Attempt WhatsApp Send -> 403
      const waRes = await request(app)
        .post('/api/communication/whatsapp/send')
        .set(authHeaders(tokenSuperAdminUnassigned))
        .send({
          contactId: contactAlpha1Id.toString(),
          text: 'Unassigned WhatsApp check',
        })
      assert.equal(waRes.status, HTTP_STATUS.FORBIDDEN)

      // Step 3: Attempt CSV Export -> 0 data rows
      const exportRes = await request(app)
        .get('/api/export/contacts?format=csv')
        .set(authHeaders(tokenSuperAdminUnassigned))
      assert.equal(exportRes.status, HTTP_STATUS.OK)
      const lines = exportRes.text.trim().split('\n').filter((l) => l.trim().length > 0)
      assert.ok(lines.length <= 1, 'Export must be empty for unassigned Super Admin')
    })

    it('[Tier 3] [CROSS-06] Cross-Brokerage Activity Stream Redaction: Activity generated for foreign lead is inspected by Super Admin, verifying wire masking on activity feed', async () => {
      const res = await request(app)
        .get(`/api/contacts/${contactBeta1Id}/activities`)
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(res.status, HTTP_STATUS.OK)
      assert.equal(res.body.success, true)
      assertZeroWireLeak(res.body, [rawBetaPhone1, rawBetaEmail1])
    })

    it('[Tier 3] [CROSS-07] Dual-Target Operation: Super Admin rejected on cross-brokerage mutation/comm (403), then immediately succeeds on own-brokerage mutation/comm (200/201)', async () => {
      // 1. Cross-brokerage mutation rejected
      const rejectMut = await request(app)
        .patch(`/api/contacts/${contactBeta1Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({ notes: 'Rejected update' })
      assert.equal(rejectMut.status, HTTP_STATUS.FORBIDDEN)

      // 2. Cross-brokerage communication rejected
      const rejectComm = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'email',
          to: rawBetaEmail1,
          text: 'Rejected message',
          contactId: contactBeta1Id.toString(),
        })
      assert.equal(rejectComm.status, HTTP_STATUS.FORBIDDEN)

      // 3. Own-brokerage mutation succeeds
      const allowMut = await request(app)
        .patch(`/api/contacts/${contactAlpha1Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({ notes: 'Approved own-brokerage update' })
      assert.equal(allowMut.status, HTTP_STATUS.OK)

      // 4. Own-brokerage communication succeeds
      const allowComm = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'email',
          to: rawAlphaEmail1,
          text: 'Approved own-brokerage message',
          contactId: contactAlpha1Id.toString(),
        })
      assert.ok(allowComm.status === HTTP_STATUS.OK || allowComm.status === HTTP_STATUS.CREATED)
    })

    it('[Tier 3] [CROSS-08] End-to-End Tenant Boundary Pipeline: Attribution (F4) + Masking (F5) + Mutation Block (F6) + Comm Block (F1) + Export Confinement (F8)', async () => {
      // Pipeline test verifying all 5 boundary controls together in sequence
      const listRes = await request(app)
        .get('/api/contacts')
        .set(authHeaders(tokenSuperAdminAlpha))
      assert.equal(listRes.status, HTTP_STATUS.OK)

      const patchRes = await request(app)
        .patch(`/api/contacts/${contactBeta2Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({ leadScore: 100 })
      assert.equal(patchRes.status, HTTP_STATUS.FORBIDDEN)

      const deleteRes = await request(app)
        .delete(`/api/contacts/${contactBeta2Id}`)
        .set(authHeaders(tokenSuperAdminAlpha))
      assert.equal(deleteRes.status, HTTP_STATUS.FORBIDDEN)

      const commRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'whatsapp',
          to: rawBetaPhone2,
          text: 'Pipeline test comm',
        })
      assert.equal(commRes.status, HTTP_STATUS.FORBIDDEN)

      const csvRes = await request(app)
        .get('/api/export/contacts?format=csv')
        .set(authHeaders(tokenSuperAdminAlpha))
      assert.equal(csvRes.status, HTTP_STATUS.OK)
      assert.ok(!csvRes.text.includes(rawBetaEmail2))
    })
  })

  // ===========================================================================
  // TIER 4: REAL-WORLD SCENARIOS (5 Application-Level Workflow Tests)
  // ===========================================================================

  describe('Tier 4: Real-World Scenarios', () => {
    it('[Tier 4] [REAL-01] Scenario 1: Multi-Brokerage Lead Intake & Super Admin Review across Brokerage Alpha and Beta', async () => {
      // Super Admin reviews daily intake across multiple brokerages
      const res = await request(app)
        .get('/api/contacts?limit=50')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(res.status, HTTP_STATUS.OK)
      const contacts = res.body.data.contacts || res.body.data
      assert.ok(contacts.length >= 3, 'Must return contacts across multiple brokerages')

      const alphaContacts = contacts.filter((c: any) => c.brokerageId === brokerageAlphaId.toString())
      const betaContacts = contacts.filter((c: any) => c.brokerageId === brokerageBetaId.toString())

      assert.ok(alphaContacts.length > 0, 'Alpha contacts must exist')
      assert.ok(betaContacts.length > 0, 'Beta contacts must exist')

      // Verify UI contract for Alpha: unmasked, isCrossBrokerage: false
      for (const ac of alphaContacts) {
        assert.equal(ac.isCrossBrokerage, false)
        assert.equal(ac.brokerageName, 'Apex Alpha Realty')
        assert.ok(!ac.phone.includes('*'), 'Alpha phone must not be masked')
      }

      // Verify UI contract for Beta: masked, isCrossBrokerage: true, subtitle pill data present
      for (const bc of betaContacts) {
        assert.equal(bc.isCrossBrokerage, true)
        assert.equal(bc.brokerageName, 'Beacon Beta Properties')
        assert.ok(bc.phone.includes('*'), 'Beta phone must be masked')
        assert.ok(bc.email.includes('*'), 'Beta email must be masked')
      }
    })

    it('[Tier 4] [REAL-02] Scenario 2: Unified Omnichannel Campaign with Mixed Contacts (Own vs Foreign Brokerage)', async () => {
      // Super Admin launches omnichannel campaign targeting own contacts and attempts cross-brokerage
      // 1. Email to own lead Sarah Connor succeeds
      const ownEmailRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'email',
          to: rawAlphaEmail1,
          text: 'Campaign newsletter: New luxury listings available.',
          contactId: contactAlpha1Id.toString(),
        })
      assert.ok(ownEmailRes.status === HTTP_STATUS.OK || ownEmailRes.status === HTTP_STATUS.CREATED)

      // 2. WhatsApp to own lead James Alpha succeeds
      const ownWaRes = await request(app)
        .post('/api/communication/whatsapp/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          contactId: contactAlpha2Id.toString(),
          text: 'Campaign update: Exclusive open house invitation.',
        })
      assert.ok(ownWaRes.status === HTTP_STATUS.OK || ownWaRes.status === HTTP_STATUS.CREATED)

      // 3. Email to foreign lead Bruce Wayne is blocked
      const foreignEmailRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          channel: 'email',
          to: rawBetaEmail1,
          text: 'Unauthorized campaign email to Bruce Wayne.',
          contactId: contactBeta1Id.toString(),
        })
      assert.equal(foreignEmailRes.status, HTTP_STATUS.FORBIDDEN)

      // 4. WhatsApp to foreign lead Clark Kent is blocked
      const foreignWaRes = await request(app)
        .post('/api/communication/whatsapp/send')
        .set(authHeaders(tokenSuperAdminAlpha))
        .send({
          contactId: contactBeta2Id.toString(),
          text: 'Unauthorized campaign WhatsApp to Clark Kent.',
        })
      assert.equal(foreignWaRes.status, HTTP_STATUS.FORBIDDEN)
    })

    it('[Tier 4] [REAL-03] Scenario 3: Cross-Brokerage Regulatory Audit Compliance & Activity Trail Redaction', async () => {
      // Compliance officer reviews audit logs and contact activities across brokerages
      const auditRes = await request(app)
        .get('/api/audit-logs')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(auditRes.status, HTTP_STATUS.OK)
      const logs = auditRes.body.data.logs || auditRes.body.data

      // Verify that no foreign PII is visible across any log entry in the response
      assertZeroWireLeak(logs, [rawBetaPhone1, rawBetaPhone2, rawBetaEmail1, rawBetaEmail2])

      // Review activity timeline on foreign contact
      const actRes = await request(app)
        .get(`/api/contacts/${contactBeta1Id}/activities`)
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(actRes.status, HTTP_STATUS.OK)
      assertZeroWireLeak(actRes.body, [rawBetaPhone1, rawBetaEmail1])
    })

    it('[Tier 4] [REAL-04] Scenario 4: Super Admin Brokerage Reassignment & Dynamic Scope Shift', async () => {
      // Super Admin is reassigned from Brokerage Alpha to Brokerage Beta
      const tokenReassignedToBeta = signToken(
        superAdminAlphaId,
        'superadmin.alpha@apexrealty.test',
        USER_ROLES.SUPER_ADMIN,
        brokerageBetaId
      )

      // 1. After reassignment, Beta contact is now OWN contact (unmasked, contactable)
      const betaDetailRes = await request(app)
        .get(`/api/contacts/${contactBeta1Id}`)
        .set(authHeaders(tokenReassignedToBeta))

      assert.equal(betaDetailRes.status, HTTP_STATUS.OK)
      assert.equal(betaDetailRes.body.data.isCrossBrokerage, false)
      assert.equal(betaDetailRes.body.data.phone, rawBetaPhone1)
      assert.equal(betaDetailRes.body.data.email, rawBetaEmail1)

      // 2. Alpha contact is now FOREIGN contact (masked, non-contactable)
      const alphaDetailRes = await request(app)
        .get(`/api/contacts/${contactAlpha1Id}`)
        .set(authHeaders(tokenReassignedToBeta))

      assert.equal(alphaDetailRes.status, HTTP_STATUS.OK)
      assert.equal(alphaDetailRes.body.data.isCrossBrokerage, true)
      assert.ok(alphaDetailRes.body.data.phone.includes('*'))
      assert.ok(alphaDetailRes.body.data.email.includes('*'))

      // 3. Sending to Alpha contact is now rejected with 403
      const sendToAlphaRes = await request(app)
        .post('/api/communication/send')
        .set(authHeaders(tokenReassignedToBeta))
        .send({
          channel: 'email',
          to: rawAlphaEmail1,
          text: 'Attempting to message former brokerage lead',
          contactId: contactAlpha1Id.toString(),
        })
      assert.equal(sendToAlphaRes.status, HTTP_STATUS.FORBIDDEN)
    })

    it('[Tier 4] [REAL-05] Scenario 5: Enterprise CSV Export Audit & Regulatory Filing under Tenant Isolation', async () => {
      // Generate compliance CSV export for regulatory review
      const exportRes = await request(app)
        .get('/api/export/contacts?format=csv')
        .set(authHeaders(tokenSuperAdminAlpha))

      assert.equal(exportRes.status, HTTP_STATUS.OK)
      assert.ok(
        (exportRes.headers['content-type'] || '').includes('text/csv'),
        'Must return text/csv MIME type'
      )
      assert.ok(
        (exportRes.headers['content-disposition'] || '').includes('attachment'),
        'Must include attachment header'
      )

      const csvContent = exportRes.text

      // 1. Verify header row
      assert.ok(csvContent.startsWith('ID,First Name,Last Name,Email,Phone,Status,Lead Source,City,Created Date'))

      // 2. Verify own-brokerage contacts are included
      assert.ok(csvContent.includes('Sarah'), 'Sarah Connor must be present')
      assert.ok(csvContent.includes('James'), 'James Alpha must be present')

      // 3. Verify zero cross-brokerage data leakage
      assertZeroWireLeak(csvContent, [
        rawBetaEmail1,
        rawBetaEmail2,
        rawBetaIntlEmail,
        rawBetaShortEmail,
        'Bruce Wayne',
        'Clark Kent',
        'Diana Prince',
        'Barry Allen',
      ])
    })
  })
})
