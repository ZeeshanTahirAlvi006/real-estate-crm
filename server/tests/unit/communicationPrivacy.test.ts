import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { verifyConversationAccess, startConversation } from '../../src/features/inbox/inbox.service.js'
import {
  strictCommunicationScope,
  verifyCommunicationBrokerageAccess,
} from '../../src/middleware/tenantScope.js'
import { USER_ROLES } from '../../src/utils/constants.js'
import type { IConversation } from '../../src/models/Conversation.js'
import type { IUser } from '../../src/models/User.js'
import { Contact } from '../../src/models/Contact.js'
import { Conversation } from '../../src/models/Conversation.js'
import { assertSuperAdminCanContact } from '../../src/features/communication/commGuard.js'
import {
  verifyContactAccess,
  verifyContactMutationAccess,
  createContact,
} from '../../src/features/contacts/contact.service.js'
import {
  createAndExecuteBroadcast,
  sendWhatsAppMessage,
} from '../../src/features/communication/whatsapp.service.js'
import {
  customTemplatesCache,
  getQuickTemplatesHandler,
  sendUnifiedHandler,
} from '../../src/features/communication/comm.controller.js'
import { sendMessage } from '../../src/features/communication/whatsapp.controller.js'
import { BoundedLruCache } from '../../src/utils/lruCache.js'

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

  const mockSuperAdminNoBrokerage = {
    _id: superAdminId,
    role: USER_ROLES.SUPER_ADMIN,
    brokerageId: null,
    email: 'superadmin.unassigned@proppulse.com',
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

  // ── assertSuperAdminCanContact Outbound Guard Tests ────────────────────────
  describe('assertSuperAdminCanContact Outbound Security Guard', () => {
    const origFindById = Contact.findById
    const origFindOne = Contact.findOne
    const origConvFindById = Conversation.findById

    const restoreMocks = () => {
      Contact.findById = origFindById
      Contact.findOne = origFindOne
      Conversation.findById = origConvFindById
    }

    it('should immediately allow non-super-admin users through communication guard', async () => {
      await assert.doesNotReject(async () => {
        await assertSuperAdminCanContact(mockBrokerageOwner, {
          contactId: new mongoose.Types.ObjectId(),
          to: '+15551234567',
        })
      })
      await assert.doesNotReject(async () => {
        await assertSuperAdminCanContact(mockAgent, {
          contactId: new mongoose.Types.ObjectId(),
          to: '+15551234567',
        })
      })
    })

    it('should reject Super Admin with no assigned brokerage with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await assertSuperAdminCanContact(mockSuperAdminNoBrokerage, {
            to: '+15551234567',
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /Super Admin has no assigned brokerage and cannot initiate communications/)
          return true
        }
      )
    })

    it('should allow Super Admin contacting a contact belonging to their own assigned brokerage by contactId', async () => {
      const ownContactId = new mongoose.Types.ObjectId()
      Contact.findById = ((_id: any) => ({
        select: () => ({
          lean: async () => ({
            _id: ownContactId,
            brokerageId: brokerageA,
          }),
        }),
      })) as any

      try {
        await assert.doesNotReject(async () => {
          await assertSuperAdminCanContact(mockSuperAdmin, {
            contactId: ownContactId,
          })
        })
      } finally {
        restoreMocks()
      }
    })

    it('should block Super Admin contacting a cross-brokerage contact by contactId with HTTP 403 Forbidden', async () => {
      const crossContactId = new mongoose.Types.ObjectId()
      Contact.findById = ((_id: any) => ({
        select: () => ({
          lean: async () => ({
            _id: crossContactId,
            brokerageId: brokerageB,
          }),
        }),
      })) as any

      try {
        await assert.rejects(
          async () => {
            await assertSuperAdminCanContact(mockSuperAdmin, {
              contactId: crossContactId,
            })
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Super Admin can only contact leads belonging to their own assigned brokerage/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })

    it('should block Super Admin contacting a cross-brokerage recipient by destination phone with HTTP 403 Forbidden', async () => {
      Contact.findOne = ((_query: any) => ({
        select: () => ({
          lean: async () => ({
            _id: new mongoose.Types.ObjectId(),
            brokerageId: brokerageB,
          }),
        }),
      })) as any

      try {
        await assert.rejects(
          async () => {
            await assertSuperAdminCanContact(mockSuperAdmin, {
              to: '+1 (555) 987-6543',
            })
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Target recipient belongs to another brokerage and cannot be contacted/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })

    it('should block Super Admin contacting a cross-brokerage recipient by destination email with HTTP 403 Forbidden', async () => {
      Contact.findOne = ((_query: any) => ({
        select: () => ({
          lean: async () => ({
            _id: new mongoose.Types.ObjectId(),
            brokerageId: brokerageB,
          }),
        }),
      })) as any

      try {
        await assert.rejects(
          async () => {
            await assertSuperAdminCanContact(mockSuperAdmin, {
              to: 'lead.brokerageb@example.com',
            })
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Target recipient belongs to another brokerage and cannot be contacted/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })

    it('should block Super Admin contacting via cross-brokerage conversationId with HTTP 403 Forbidden', async () => {
      const crossConvId = new mongoose.Types.ObjectId()
      Conversation.findById = ((_id: any) => ({
        select: () => ({
          lean: async () => ({
            _id: crossConvId,
            brokerageId: brokerageB,
            assignedAgentId: superAdminId,
          }),
        }),
      })) as any

      try {
        await assert.rejects(
          async () => {
            await assertSuperAdminCanContact(mockSuperAdmin, {
              conversationId: crossConvId,
            })
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Cross-brokerage communication is prohibited for Super Admin/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })
  })

  // ── verifyContactMutationAccess Unit Tests ─────────────────────────────────
  describe('verifyContactMutationAccess Read-Only Security Guard', () => {
    it('should allow Super Admin to mutate contact belonging to their own assigned brokerage', () => {
      const ownContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageA,
      }

      assert.doesNotThrow(() => {
        verifyContactMutationAccess(ownContact, mockSuperAdmin)
      })
    })

    it('should throw HTTP 403 Forbidden when Super Admin attempts to mutate cross-brokerage contact', () => {
      const crossContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageB,
      }

      assert.throws(
        () => {
          verifyContactMutationAccess(crossContact, mockSuperAdmin)
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /Cross-brokerage contacts are strictly read-only for Super Admin/)
          return true
        }
      )
    })

    it('should throw HTTP 403 Forbidden when unassigned Super Admin attempts to mutate any contact', () => {
      const contact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageA,
      }

      assert.throws(
        () => {
          verifyContactMutationAccess(contact, mockSuperAdminNoBrokerage)
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /Cross-brokerage contacts are strictly read-only for Super Admin/)
          return true
        }
      )
    })

    it('should allow Brokerage Owner to mutate contact within their own brokerage', () => {
      const ownContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageA,
      }

      assert.doesNotThrow(() => {
        verifyContactMutationAccess(ownContact, mockBrokerageOwner)
      })
    })

    it('should throw HTTP 404 when non-super-admin attempts to mutate cross-brokerage contact', () => {
      const crossContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageB,
      }

      assert.throws(
        () => {
          verifyContactMutationAccess(crossContact, mockBrokerageOwner)
        },
        (err: any) => {
          assert.equal(err.statusCode, 404)
          assert.match(err.message, /Contact not found/)
          return true
        }
      )
    })

    it('should throw HTTP 403 when Agent attempts to mutate contact assigned to another agent', () => {
      const otherAgentContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageA,
        assignedAgentId: new mongoose.Types.ObjectId(),
      }

      assert.throws(
        () => {
          verifyContactMutationAccess(otherAgentContact, mockAgent)
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          return true
        }
      )
    })

    it('should verify verifyContactAccess allows Super Admin read-only access to cross-brokerage contact', () => {
      const crossContact = {
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageB,
      }

      // Read access allowed for Super Admin
      assert.doesNotThrow(() => {
        verifyContactAccess(crossContact, mockSuperAdmin)
      })

      // Read access blocked for Brokerage Owner from different brokerage (404)
      assert.throws(
        () => {
          verifyContactAccess(crossContact, mockBrokerageOwner)
        },
        (err: any) => err.statusCode === 404
      )
    })
  })

  // ── startConversation Security Tests ───────────────────────────────────────
  describe('startConversation Super Admin Tenant Restriction', () => {
    const origFindById = Contact.findById
    const origConvFindOne = Conversation.findOne

    const restoreMocks = () => {
      Contact.findById = origFindById
      Conversation.findOne = origConvFindOne
    }

    it('should reject Super Admin starting conversation with cross-brokerage contact with HTTP 403 Forbidden', async () => {
      const crossContactId = new mongoose.Types.ObjectId()
      Contact.findById = (async (_id: any) => ({
        _id: crossContactId,
        brokerageId: brokerageB,
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+15559876543',
        email: 'jane@brokerage-b.com',
      })) as any

      try {
        await assert.rejects(
          async () => {
            await startConversation(
              { contactId: crossContactId.toString(), channel: 'whatsapp' },
              mockSuperAdmin
            )
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Super Admin cannot initiate conversations with cross-brokerage contacts/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })

    it('should reject unassigned Super Admin starting conversation with HTTP 403 Forbidden', async () => {
      const contactId = new mongoose.Types.ObjectId()
      Contact.findById = (async (_id: any) => ({
        _id: contactId,
        brokerageId: brokerageA,
        firstName: 'John',
        lastName: 'Smith',
      })) as any

      try {
        await assert.rejects(
          async () => {
            await startConversation(
              { contactId: contactId.toString(), channel: 'whatsapp' },
              mockSuperAdminNoBrokerage
            )
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Super Admin cannot initiate conversations with cross-brokerage contacts/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })

    it('should reject non-super-admin starting conversation with cross-brokerage contact with HTTP 404 Not Found', async () => {
      const crossContactId = new mongoose.Types.ObjectId()
      Contact.findById = (async (_id: any) => ({
        _id: crossContactId,
        brokerageId: brokerageB,
      })) as any

      try {
        await assert.rejects(
          async () => {
            await startConversation(
              { contactId: crossContactId.toString(), channel: 'whatsapp' },
              mockBrokerageOwner
            )
          },
          (err: any) => {
            assert.equal(err.statusCode, 404)
            assert.match(err.message, /Contact not found/)
            return true
          }
        )
      } finally {
        restoreMocks()
      }
    })
  })

  // ── WhatsApp Broadcast Security Tests ──────────────────────────────────────
  describe('createAndExecuteBroadcast Super Admin Restriction', () => {
    it('should reject unassigned Super Admin from creating broadcast with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await createAndExecuteBroadcast(
            { templateName: 'hello_world', targetAudience: 'all' },
            mockSuperAdminNoBrokerage
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /Super Admin has no assigned brokerage and cannot broadcast messages/)
          return true
        }
      )
    })
  })

  // ── Rule ML-002: Bounded LRU Cache Leak Prevention Tests ───────────────────
  describe('Rule ML-002: Quick Templates Bounded Cache Integrity', () => {
    it('should use BoundedLruCache with fixed maximum capacity to prevent unbounded memory growth', () => {
      const testCache = new BoundedLruCache<{ id: string; name: string }>(3, 60)

      testCache.set('t1', { id: 't1', name: 'Template 1' })
      testCache.set('t2', { id: 't2', name: 'Template 2' })
      testCache.set('t3', { id: 't3', name: 'Template 3' })

      assert.equal(testCache.size, 3)

      // Insert 4th item; oldest (t1) must be evicted
      testCache.set('t4', { id: 't4', name: 'Template 4' })

      assert.equal(testCache.size, 3)
      assert.equal(testCache.get('t1'), null, 'Oldest item must be evicted when max capacity reached')
      assert.ok(testCache.get('t2'))
      assert.ok(testCache.get('t4'))
    })

    it('should expose customTemplatesCache singleton with bounded size', () => {
      assert.ok(customTemplatesCache instanceof BoundedLruCache)
    })

    it('should safely retrieve quick templates when customTemplatesCache is populated without infinite loop', () => {
      customTemplatesCache.set('test-1', {
        id: 'test-1',
        title: 'Test 1',
        channel: 'all',
        category: 'intro',
        body: 'Hello',
        variables: [],
      })
      customTemplatesCache.set('test-2', {
        id: 'test-2',
        title: 'Test 2',
        channel: 'all',
        category: 'intro',
        body: 'World',
        variables: [],
      })

      let responseData: any = null
      const mockReq = { query: {} } as any
      const mockRes = {
        status: () => mockRes,
        json: (payload: any) => {
          responseData = payload
          return mockRes
        },
      } as any

      getQuickTemplatesHandler(mockReq, mockRes)
      assert.ok(responseData.success)
      assert.ok(responseData.data.length >= 2)
    })
  })

  // ── Milestone 1 Remediation Contract & Error Propagation Tests ─────────────
  describe('Milestone 1 Remediation Contract & Error Propagation Tests', () => {
    it('should reject unassigned Super Admin in sendUnifiedHandler with HTTP 403 Forbidden', async () => {
      let statusCode = 0
      let responseBody: any = null
      const mockReq = {
        user: mockSuperAdminNoBrokerage,
        body: { channel: 'email', to: 'test@example.com', text: 'Hello' },
      } as any
      const mockRes = {
        status: (code: number) => {
          statusCode = code
          return mockRes
        },
        json: (data: any) => {
          responseBody = data
          return mockRes
        },
      } as any

      await sendUnifiedHandler(mockReq, mockRes)
      assert.equal(statusCode, 403)
      assert.match(responseBody.message, /Super Admin has no assigned brokerage/)
    })

    it('should reject unassigned Super Admin creating contact with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await createContact(
            { firstName: 'Test', lastName: 'Lead', email: 'testlead@example.com' },
            mockSuperAdminNoBrokerage
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, 403)
          assert.match(err.message, /Super Admin without assigned brokerage cannot create contacts/)
          return true
        }
      )
    })

    it('should preserve HTTP 403 Forbidden in WhatsApp sendMessage controller when security guard rejects', async () => {
      let statusCode = 0
      let responseBody: any = null
      const mockReq = {
        user: mockSuperAdminNoBrokerage,
        body: { contactId: new mongoose.Types.ObjectId().toString(), text: 'Test' },
        ip: '127.0.0.1',
        headers: {},
      } as any
      const mockRes = {
        status: (code: number) => {
          statusCode = code
          return mockRes
        },
        json: (data: any) => {
          responseBody = data
          return mockRes
        },
      } as any

      await sendMessage(mockReq, mockRes)
      assert.equal(statusCode, 403)
      assert.match(responseBody.message, /Super Admin has no assigned brokerage/)
    })

    it('should reject Super Admin sending WhatsApp message when conversation assigned to another agent with HTTP 403 Forbidden', async () => {
      const otherConvId = new mongoose.Types.ObjectId()
      const origConvFindOne = Conversation.findOne
      const origConvFindById = Conversation.findById
      const origContactFindOne = Contact.findOne

      Conversation.findOne = (async () => ({
        _id: otherConvId,
        brokerageId: brokerageA,
        assignedAgentId: agentId,
        contactId: new mongoose.Types.ObjectId(),
      })) as any
      Conversation.findById = ((_id: any) => ({
        select: () => ({
          lean: async () => ({
            _id: otherConvId,
            brokerageId: brokerageA,
            assignedAgentId: agentId,
          }),
        }),
      })) as any
      Contact.findOne = (async () => ({
        _id: new mongoose.Types.ObjectId(),
        brokerageId: brokerageA,
        phone: '+15551234567',
      })) as any

      try {
        await assert.rejects(
          async () => {
            await sendWhatsAppMessage(
              { conversationId: otherConvId.toString(), text: 'Hello' },
              mockSuperAdmin
            )
          },
          (err: any) => {
            assert.equal(err.statusCode, 403)
            assert.match(err.message, /Super Admin is restricted from sending WhatsApp messages on behalf of other users/)
            return true
          }
        )
      } finally {
        Conversation.findOne = origConvFindOne
        Conversation.findById = origConvFindById
        Contact.findOne = origContactFindOne
      }
    })
  })
})
