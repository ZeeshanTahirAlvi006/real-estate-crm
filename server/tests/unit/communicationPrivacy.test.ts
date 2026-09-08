import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { verifyConversationAccess } from '../../src/features/inbox/inbox.service.js'
import {
  strictCommunicationScope,
  verifyCommunicationBrokerageAccess,
} from '../../src/middleware/tenantScope.js'
import { USER_ROLES } from '../../src/utils/constants.js'
import type { IConversation } from '../../src/models/Conversation.js'
import type { IUser } from '../../src/models/User.js'

describe('Communication Privacy & Cross-Brokerage Isolation Unit Tests', () => {
  const brokerageA = new mongoose.Types.ObjectId()
  const brokerageB = new mongoose.Types.ObjectId()
  const superAdminId = new mongoose.Types.ObjectId()
  const ownerId = new mongoose.Types.ObjectId()
  const agentId = new mongoose.Types.ObjectId()

  const mockSuperAdmin = {
    _id: superAdminId,
    role: USER_ROLES.SUPER_ADMIN,
    brokerageId: brokerageA,
    email: 'superadmin@proppulse.com',
  } as unknown as IUser

  const mockBrokerageOwner = {
    _id: ownerId,
    role: USER_ROLES.BROKERAGE_OWNER,
    brokerageId: brokerageA,
    email: 'owner@brokerage-a.com',
  } as unknown as IUser

  const mockAgent = {
    _id: agentId,
    role: USER_ROLES.AGENT,
    brokerageId: brokerageA,
    email: 'agent@brokerage-a.com',
  } as unknown as IUser

  it('should restrict Super Admin from accessing conversations of brokerage owners or other users', () => {
    const ownerConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageA,
      assignedAgentId: ownerId,
      contactName: 'VIP Client',
    } as unknown as IConversation

    assert.throws(
      () => {
        verifyConversationAccess(mockSuperAdmin, ownerConv)
      },
      (err: any) => {
        return (
          err.statusCode === 403 &&
          err.message.includes('Super Admin is restricted from accessing communications of other users')
        )
      }
    )
  })

  it('should restrict Super Admin from accessing unassigned conversations of brokerage owners', () => {
    const unassignedConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageA,
      assignedAgentId: null,
      contactName: 'Inbound Lead',
    } as unknown as IConversation

    assert.throws(
      () => {
        verifyConversationAccess(mockSuperAdmin, unassignedConv)
      },
      (err: any) => {
        return err.statusCode === 403
      }
    )
  })

  it('should allow Super Admin to access only conversations explicitly assigned to Super Admin', () => {
    const superAdminConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageA,
      assignedAgentId: superAdminId,
      contactName: 'System Inquiry',
    } as unknown as IConversation

    assert.doesNotThrow(() => {
      verifyConversationAccess(mockSuperAdmin, superAdminConv)
    })
  })

  it('should strictly block cross-brokerage conversation access for all users including Super Admin', () => {
    const crossBrokerageConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageB,
      assignedAgentId: superAdminId,
      contactName: 'Brokerage B Client',
    } as unknown as IConversation

    // Super Admin blocked from Brokerage B
    assert.throws(
      () => {
        verifyConversationAccess(mockSuperAdmin, crossBrokerageConv)
      },
      (err: any) => err.statusCode === 404 || err.statusCode === 403
    )

    // Brokerage Owner blocked from Brokerage B
    assert.throws(
      () => {
        verifyConversationAccess(mockBrokerageOwner, crossBrokerageConv)
      },
      (err: any) => err.statusCode === 404 || err.statusCode === 403
    )
  })

  it('should allow Brokerage Owner to access conversations within their own brokerage', () => {
    const brokerConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageA,
      assignedAgentId: agentId,
      contactName: 'Client Alpha',
    } as unknown as IConversation

    assert.doesNotThrow(() => {
      verifyConversationAccess(mockBrokerageOwner, brokerConv)
    })
  })

  it('should block Agent from accessing another agent assigned conversation', () => {
    const otherAgentConv = {
      _id: new mongoose.Types.ObjectId(),
      brokerageId: brokerageA,
      assignedAgentId: new mongoose.Types.ObjectId(),
      contactName: 'Client Beta',
    } as unknown as IConversation

    assert.throws(
      () => {
        verifyConversationAccess(mockAgent, otherAgentConv)
      },
      (err: any) => err.statusCode === 403
    )
  })

  it('should verify strictCommunicationScope middleware ignores query params and binds to user brokerage', () => {
    const req: any = {
      user: mockSuperAdmin,
      query: { brokerageId: brokerageB.toString() }, // Attempted cross-brokerage query override
    }
    const res: any = {}
    let nextCalled = false
    const next = () => {
      nextCalled = true
    }

    strictCommunicationScope(req, res, next)

    assert.equal(nextCalled, true)
    assert.deepEqual(req.tenantFilter, { brokerageId: brokerageA })
    assert.equal(req.effectiveBrokerageId, brokerageA.toString())
  })

  it('should verifyCommunicationBrokerageAccess rejects cross-brokerage attempts with no bypass', () => {
    assert.equal(verifyCommunicationBrokerageAccess(mockSuperAdmin, brokerageA), true)
    assert.equal(verifyCommunicationBrokerageAccess(mockSuperAdmin, brokerageB), false)
    assert.equal(verifyCommunicationBrokerageAccess(mockBrokerageOwner, brokerageB), false)
  })
})
