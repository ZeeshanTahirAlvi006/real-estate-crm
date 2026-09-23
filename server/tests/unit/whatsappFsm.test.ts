// tests/unit/whatsappFsm.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  transition,
  canTransition,
  getLegalEvents,
  LOCKED_STATES,
  IllegalTransitionError,
  WAState,
  WAEvent,
  ALL_WA_STATES,
} from '../../src/integrations/whatsapp/fsm.js'

describe('WhatsApp Embedded Signup Finite State Machine (FSM)', () => {
  const dummyTenant = '60d5ec49f1b2c8b1f8e4e1a1'

  describe('Exhaustive Legal Transitions Verification', () => {
    it('NOT_CONNECTED transitions', () => {
      assert.equal(transition(dummyTenant, 'NOT_CONNECTED', 'SIGNUP_LAUNCHED'), 'AWAITING_CALLBACK')
    })

    it('AWAITING_CALLBACK transitions', () => {
      assert.equal(transition(dummyTenant, 'AWAITING_CALLBACK', 'CODE_RECEIVED'), 'EXCHANGING_TOKEN')
      assert.equal(transition(dummyTenant, 'AWAITING_CALLBACK', 'FLOW_CANCELLED'), 'NOT_CONNECTED')
      assert.equal(transition(dummyTenant, 'AWAITING_CALLBACK', 'FLOW_ERROR_REPORTED'), 'NOT_CONNECTED')
      assert.equal(transition(dummyTenant, 'AWAITING_CALLBACK', 'CALLBACK_TIMEOUT'), 'NOT_CONNECTED')
    })

    it('EXCHANGING_TOKEN transitions', () => {
      assert.equal(transition(dummyTenant, 'EXCHANGING_TOKEN', 'TOKEN_EXCHANGE_SUCCESS'), 'SUBSCRIBING_WEBHOOKS')
      assert.equal(transition(dummyTenant, 'EXCHANGING_TOKEN', 'TOKEN_EXCHANGE_FAILURE'), 'TOKEN_EXCHANGE_FAILED')
    })

    it('TOKEN_EXCHANGE_FAILED transitions', () => {
      assert.equal(transition(dummyTenant, 'TOKEN_EXCHANGE_FAILED', 'RESTART'), 'NOT_CONNECTED')
    })

    it('SUBSCRIBING_WEBHOOKS transitions', () => {
      assert.equal(transition(dummyTenant, 'SUBSCRIBING_WEBHOOKS', 'WEBHOOK_SUBSCRIBE_SUCCESS'), 'REGISTERING_PHONE')
      assert.equal(transition(dummyTenant, 'SUBSCRIBING_WEBHOOKS', 'WEBHOOK_SUBSCRIBE_FAILURE'), 'WEBHOOK_SUBSCRIBE_FAILED')
    })

    it('WEBHOOK_SUBSCRIBE_FAILED transitions', () => {
      assert.equal(transition(dummyTenant, 'WEBHOOK_SUBSCRIBE_FAILED', 'RETRY'), 'SUBSCRIBING_WEBHOOKS')
      assert.equal(transition(dummyTenant, 'WEBHOOK_SUBSCRIBE_FAILED', 'RESTART'), 'NOT_CONNECTED')
    })

    it('REGISTERING_PHONE transitions', () => {
      assert.equal(transition(dummyTenant, 'REGISTERING_PHONE', 'PHONE_REGISTER_SUCCESS'), 'PENDING_PAYMENT')
      assert.equal(transition(dummyTenant, 'REGISTERING_PHONE', 'PHONE_REGISTER_FAILURE'), 'PHONE_REGISTER_FAILED')
    })

    it('PHONE_REGISTER_FAILED transitions', () => {
      assert.equal(transition(dummyTenant, 'PHONE_REGISTER_FAILED', 'RETRY'), 'REGISTERING_PHONE')
      assert.equal(transition(dummyTenant, 'PHONE_REGISTER_FAILED', 'RESTART'), 'NOT_CONNECTED')
    })

    it('PENDING_PAYMENT transitions', () => {
      assert.equal(transition(dummyTenant, 'PENDING_PAYMENT', 'PAYMENT_METHOD_CONFIRMED'), 'ACTIVE')
      assert.equal(transition(dummyTenant, 'PENDING_PAYMENT', 'MANUAL_DISCONNECT'), 'DISCONNECTED')
    })

    it('ACTIVE transitions', () => {
      assert.equal(transition(dummyTenant, 'ACTIVE', 'ACCOUNT_RESTRICTED'), 'SUSPENDED')
      assert.equal(transition(dummyTenant, 'ACTIVE', 'TOKEN_INVALIDATED'), 'TOKEN_REVOKED')
      assert.equal(transition(dummyTenant, 'ACTIVE', 'MANUAL_DISCONNECT'), 'DISCONNECTED')
    })

    it('SUSPENDED transitions', () => {
      assert.equal(transition(dummyTenant, 'SUSPENDED', 'ACCOUNT_REINSTATED'), 'ACTIVE')
      assert.equal(transition(dummyTenant, 'SUSPENDED', 'TOKEN_INVALIDATED'), 'TOKEN_REVOKED')
      assert.equal(transition(dummyTenant, 'SUSPENDED', 'MANUAL_DISCONNECT'), 'DISCONNECTED')
    })

    it('TOKEN_REVOKED transitions', () => {
      assert.equal(transition(dummyTenant, 'TOKEN_REVOKED', 'REAUTH_LAUNCHED'), 'AWAITING_CALLBACK')
      assert.equal(transition(dummyTenant, 'TOKEN_REVOKED', 'MANUAL_DISCONNECT'), 'DISCONNECTED')
    })

    it('DISCONNECTED transitions', () => {
      assert.equal(transition(dummyTenant, 'DISCONNECTED', 'SIGNUP_LAUNCHED'), 'AWAITING_CALLBACK')
    })
  })

  describe('Illegal Transitions Rejection (Non-Bypassable)', () => {
    it('should reject ACTIVE + CODE_RECEIVED', () => {
      assert.throws(
        () => transition(dummyTenant, 'ACTIVE', 'CODE_RECEIVED'),
        IllegalTransitionError
      )
    })

    it('should reject TOKEN_EXCHANGE_FAILED + RETRY (code is single-use, must restart)', () => {
      assert.throws(
        () => transition(dummyTenant, 'TOKEN_EXCHANGE_FAILED', 'RETRY'),
        IllegalTransitionError
      )
    })

    it('should reject NOT_CONNECTED + MANUAL_DISCONNECT', () => {
      assert.throws(
        () => transition(dummyTenant, 'NOT_CONNECTED', 'MANUAL_DISCONNECT'),
        IllegalTransitionError
      )
    })

    it('should reject AWAITING_CALLBACK + PAYMENT_METHOD_CONFIRMED', () => {
      assert.throws(
        () => transition(dummyTenant, 'AWAITING_CALLBACK', 'PAYMENT_METHOD_CONFIRMED'),
        IllegalTransitionError
      )
    })

    it('should reject DISCONNECTED + CODE_RECEIVED', () => {
      assert.throws(
        () => transition(dummyTenant, 'DISCONNECTED', 'CODE_RECEIVED'),
        IllegalTransitionError
      )
    })

    it('should reject ACTIVE + SIGNUP_LAUNCHED', () => {
      assert.throws(
        () => transition(dummyTenant, 'ACTIVE', 'SIGNUP_LAUNCHED'),
        IllegalTransitionError
      )
    })
  })

  describe('LOCKED_STATES Set Validation', () => {
    it('contains strictly the three in-flight Graph API states', () => {
      assert.equal(LOCKED_STATES.size, 3)
      assert.ok(LOCKED_STATES.has('EXCHANGING_TOKEN'))
      assert.ok(LOCKED_STATES.has('SUBSCRIBING_WEBHOOKS'))
      assert.ok(LOCKED_STATES.has('REGISTERING_PHONE'))
      assert.ok(!LOCKED_STATES.has('ACTIVE'))
      assert.ok(!LOCKED_STATES.has('NOT_CONNECTED'))
      assert.ok(!LOCKED_STATES.has('PENDING_PAYMENT'))
      assert.ok(!LOCKED_STATES.has('DISCONNECTED'))
    })
  })

  describe('Helper Functions (canTransition & getLegalEvents)', () => {
    it('canTransition returns boolean properly', () => {
      assert.equal(canTransition('NOT_CONNECTED', 'SIGNUP_LAUNCHED'), true)
      assert.equal(canTransition('NOT_CONNECTED', 'CODE_RECEIVED'), false)
      assert.equal(canTransition('PENDING_PAYMENT', 'PAYMENT_METHOD_CONFIRMED'), true)
      assert.equal(canTransition('ACTIVE', 'TOKEN_INVALIDATED'), true)
    })

    it('getLegalEvents returns only defined events for each state', () => {
      const notConnectedEvents = getLegalEvents('NOT_CONNECTED')
      assert.deepEqual(notConnectedEvents, ['SIGNUP_LAUNCHED'])

      const activeEvents = getLegalEvents('ACTIVE')
      assert.deepEqual(activeEvents.sort(), ['ACCOUNT_RESTRICTED', 'MANUAL_DISCONNECT', 'TOKEN_INVALIDATED'].sort())
    })
  })
})
