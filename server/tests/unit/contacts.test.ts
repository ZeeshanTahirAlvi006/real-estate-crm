import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Contact } from '../../src/models/Contact.js'

describe('Contact Model & TCPA Schema Unit Tests', () => {
  it('should validate required fields when instantiating a contact document', () => {
    const contact = new Contact({
      // Missing firstName, lastName, brokerageId
      email: 'test@example.com',
    })

    const validationError = contact.validateSync()
    assert.ok(validationError)
    assert.ok(validationError.errors.firstName)
    assert.ok(validationError.errors.lastName)
    assert.ok(validationError.errors.brokerageId)
  })

  it('should initialize default TCPA consent flags to true and unverified', () => {
    const contact = new Contact({
      firstName: 'John',
      lastName: 'Doe',
      brokerageId: new mongoose.Types.ObjectId(),
      phone: '+15551234567',
    })

    assert.equal(contact.dncStatus, 'clean')
    assert.equal(contact.tcpaConsent?.sms, true)
    assert.equal(contact.tcpaConsent?.call, true)
    assert.equal(contact.tcpaConsent?.whatsapp, true)
    assert.equal(contact.tcpaConsent?.email, true)
    assert.equal(contact.tcpaConsent?.doubleOptInVerified, false)
    assert.equal(contact.tcpaConsent?.consentSource, 'web_form')
  })

  it('should validate email format if provided', () => {
    const invalidContact = new Contact({
      firstName: 'Jane',
      lastName: 'Doe',
      brokerageId: new mongoose.Types.ObjectId(),
      email: 'not-an-email',
    })

    const err = invalidContact.validateSync()
    assert.ok(err)
    assert.ok(err.errors.email)
  })

  it('should register compound deduplication and query indexes including firstName and lastName', () => {
    const indexes = Contact.schema.indexes()
    const hasNameIndex = indexes.some(
      ([fields]) =>
        fields.brokerageId === 1 &&
        fields.firstName === 1 &&
        fields.lastName === 1 &&
        fields.isDeleted === 1
    )
    const hasEmailIndex = indexes.some(
      ([fields]) =>
        fields.brokerageId === 1 &&
        fields.email === 1 &&
        fields.isDeleted === 1
    )
    const hasPhoneIndex = indexes.some(
      ([fields]) =>
        fields.brokerageId === 1 &&
        fields.phone === 1 &&
        fields.isDeleted === 1
    )

    assert.ok(hasNameIndex, 'Contact schema must have compound index on { brokerageId, firstName, lastName, isDeleted }')
    assert.ok(hasEmailIndex, 'Contact schema must have compound index on { brokerageId, email, isDeleted }')
    assert.ok(hasPhoneIndex, 'Contact schema must have compound index on { brokerageId, phone, isDeleted }')
  })
})
