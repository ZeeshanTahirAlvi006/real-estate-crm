import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Message } from '../../src/models/Message.js'
import { Conversation } from '../../src/models/Conversation.js'
import { formatConversationDto, formatMessageDto } from '../../src/features/inbox/inbox.service.js'

describe('Inbox Channel Separation Unit Tests', () => {
  const brokerageId = new mongoose.Types.ObjectId()
  const contactId = new mongoose.Types.ObjectId()
  const conversationId = new mongoose.Types.ObjectId()

  it('should validate Message schema requiring valid channel enum (whatsapp, email, sms)', () => {
    const validWhatsAppMsg = new Message({
      conversationId,
      brokerageId,
      contactId,
      sender: 'agent',
      senderName: 'Agent Smith',
      channel: 'whatsapp',
      body: 'Hello via WhatsApp',
    })
    assert.equal(validWhatsAppMsg.validateSync(), undefined)

    const validEmailMsg = new Message({
      conversationId,
      brokerageId,
      contactId,
      sender: 'agent',
      senderName: 'Agent Smith',
      channel: 'email',
      body: 'Hello via Email',
    })
    assert.equal(validEmailMsg.validateSync(), undefined)

    const invalidMsg = new Message({
      conversationId,
      brokerageId,
      contactId,
      sender: 'agent',
      senderName: 'Agent Smith',
      channel: 'invalid_channel' as any,
      body: 'Hello',
    })
    const err = invalidMsg.validateSync()
    assert.ok(err)
    assert.ok(err.errors.channel)
  })

  it('should format MessageDto preserving channel property accurately', () => {
    const mockMessage: any = {
      _id: new mongoose.Types.ObjectId(),
      conversationId,
      contactId,
      sender: 'lead',
      senderName: 'Alice Walker',
      channel: 'whatsapp',
      body: 'Is this property still available?',
      direction: 'inbound',
      deliveryStatus: 'delivered',
      fairHousingFlags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const dto = formatMessageDto(mockMessage)
    assert.equal(dto.channel, 'whatsapp')
    assert.equal(dto.sender, 'lead')
    assert.equal(dto.body, 'Is this property still available?')
    assert.equal(dto.deliveryStatus, 'delivered')
  })

  it('should format ConversationDto preserving channel property accurately', () => {
    const mockConv: any = {
      _id: conversationId,
      contactId: {
        _id: contactId,
        email: 'alice@example.com',
        phone: '+15559876543',
        leadScore: 88,
        dncStatus: 'clean',
      },
      contactName: 'Alice Walker',
      contactPhone: '+15559876543',
      contactEmail: 'alice@example.com',
      lastMessageText: 'Here are the details',
      lastMessageAt: new Date(),
      lastChannel: 'email',
      unreadCount: 2,
      aiIsaEnabled: true,
      status: 'active',
      tags: ['buyer', 'luxury'],
    }

    const dto = formatConversationDto(mockConv)
    assert.equal(dto.lastChannel, 'email')
    assert.equal(dto.contactEmail, 'alice@example.com')
    assert.equal(dto.contactPhone, '+15559876543')
    assert.equal(dto.leadScore, 88)
    assert.equal(dto.unreadCount, 2)
  })
})
