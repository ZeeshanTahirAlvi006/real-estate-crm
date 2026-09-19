import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import {
  strictOperationalScope,
  verifyDealAndOperationalAccess,
} from '../../src/middleware/tenantScope.js'
import { USER_ROLES, HTTP_STATUS } from '../../src/utils/constants.js'
import type { IUser } from '../../src/models/User.js'
import { Pipeline } from '../../src/models/Pipeline.js'
import { Contact } from '../../src/models/Contact.js'
import { User } from '../../src/models/User.js'
import { Deal } from '../../src/models/Deal.js'
import { Transaction } from '../../src/models/Transaction.js'
import { Property } from '../../src/models/Property.js'
import { Commission } from '../../src/models/Commission.js'
import { createDeal } from '../../src/features/deals/deal.service.js'
import { transactionService } from '../../src/features/transactions/transaction.service.js'
import { radarService } from '../../src/features/seller-radar/radar.service.js'
import { commissionService } from '../../src/features/commissions/commission.service.js'
import {
  getSmartLists,
  createSmartList,
  updateSmartList,
  deleteSmartList,
} from '../../src/features/smart-lists/smartList.controller.js'

describe('Cross-Brokerage Operational Boundaries & Restrictions Unit Tests', () => {
  const brokerageA = new mongoose.Types.ObjectId()
  const brokerageB = new mongoose.Types.ObjectId()
  const superAdminId = new mongoose.Types.ObjectId()
  const agentId = new mongoose.Types.ObjectId()

  const mockSuperAdminWithBrokerage = {
    _id: superAdminId,
    id: superAdminId.toString(),
    role: USER_ROLES.SUPER_ADMIN,
    brokerageId: brokerageA,
    email: 'superadmin.assigned@proppulse.com',
    firstName: 'Super',
    lastName: 'Admin',
  } as unknown as IUser

  const mockSuperAdminNoBrokerage = {
    _id: superAdminId,
    id: superAdminId.toString(),
    role: USER_ROLES.SUPER_ADMIN,
    brokerageId: null,
    email: 'superadmin.unassigned@proppulse.com',
    firstName: 'Unassigned',
    lastName: 'Admin',
  } as unknown as IUser

  const mockAgent = {
    _id: agentId,
    id: agentId.toString(),
    role: USER_ROLES.AGENT,
    brokerageId: brokerageA,
    email: 'agent@brokerage-a.com',
    firstName: 'Agent',
    lastName: 'Alpha',
    isActive: true,
  } as unknown as IUser

  // Track original Mongoose model functions
  const origPipelineFindById = Pipeline.findById
  const origContactFindById = Contact.findById
  const origContactFindOne = Contact.findOne
  const origUserFindById = User.findById
  const origUserFindOne = User.findOne
  const origDealFindById = Deal.findById
  const origDealFindOne = Deal.findOne
  const origDealCreate = Deal.create
  const origTransactionFindById = Transaction.findById
  const origTransactionFindOne = Transaction.findOne
  const origTransactionCreate = Transaction.create
  const origPropertyFindById = Property.findById
  const origPropertyFindOne = Property.findOne
  const origPropertyFindOneAndUpdate = Property.findOneAndUpdate
  const origCommissionFindById = Commission.findById
  const origCommissionFindOne = Commission.findOne
  const origCommissionFind = Commission.find
  const origCommissionCreate = Commission.create

  afterEach(() => {
    Pipeline.findById = origPipelineFindById
    Contact.findById = origContactFindById
    Contact.findOne = origContactFindOne
    User.findById = origUserFindById
    User.findOne = origUserFindOne
    Deal.findById = origDealFindById
    Deal.findOne = origDealFindOne
    Deal.create = origDealCreate
    Transaction.findById = origTransactionFindById
    Transaction.findOne = origTransactionFindOne
    Transaction.create = origTransactionCreate
    Property.findById = origPropertyFindById
    Property.findOne = origPropertyFindOne
    Property.findOneAndUpdate = origPropertyFindOneAndUpdate
    Commission.findById = origCommissionFindById
    Commission.findOne = origCommissionFindOne
    Commission.find = origCommissionFind
    Commission.create = origCommissionCreate
  })

  // ── 1. Strict Operational Scope & Access Verifier ─────────────────────────
  describe('1. strictOperationalScope & verifyDealAndOperationalAccess', () => {
    it('strictOperationalScope should bind Super Admin with brokerageId to their brokerage', () => {
      const req: any = { user: mockSuperAdminWithBrokerage, query: {} }
      const res: any = {}
      let nextCalled = false
      strictOperationalScope(req, res, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, true)
      assert.deepEqual(req.tenantFilter, {
        brokerageId: new mongoose.Types.ObjectId(brokerageA.toString()),
      })
      assert.equal(req.effectiveBrokerageId, brokerageA.toString())
    })

    it('strictOperationalScope should inject non-matching ObjectId for unassigned Super Admin', () => {
      const req: any = { user: mockSuperAdminNoBrokerage, query: {} }
      const res: any = {}
      let nextCalled = false
      strictOperationalScope(req, res, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, true)
      assert.ok(req.tenantFilter?.brokerageId instanceof mongoose.Types.ObjectId)
      assert.notEqual(req.tenantFilter?.brokerageId.toString(), brokerageA.toString())
      assert.equal(req.effectiveBrokerageId, undefined)
    })

    it('strictOperationalScope should scope agent to their assigned brokerage', () => {
      const req: any = { user: mockAgent, query: {} }
      const res: any = {}
      let nextCalled = false
      strictOperationalScope(req, res, () => {
        nextCalled = true
      })

      assert.equal(nextCalled, true)
      assert.deepEqual(req.tenantFilter, {
        brokerageId: new mongoose.Types.ObjectId(brokerageA.toString()),
      })
      assert.equal(req.effectiveBrokerageId, brokerageA.toString())
    })

    it('verifyDealAndOperationalAccess should strictly validate tenant boundaries', () => {
      // Matching brokerage -> true
      assert.equal(verifyDealAndOperationalAccess(mockSuperAdminWithBrokerage, brokerageA), true)
      // Cross-brokerage -> false (NO bypass for Super Admin!)
      assert.equal(verifyDealAndOperationalAccess(mockSuperAdminWithBrokerage, brokerageB), false)
      // Unassigned user -> false
      assert.equal(verifyDealAndOperationalAccess(mockSuperAdminNoBrokerage, brokerageA), false)
    })
  })

  // ── 2. Deal Creation Restrictions ─────────────────────────────────────────
  describe('2. Deal Service Cross-Brokerage Restrictions', () => {
    it('createDeal should reject unassigned Super Admin with HTTP 403 Forbidden', async () => {
      const stageId = new mongoose.Types.ObjectId()
      const pipelineId = new mongoose.Types.ObjectId()
      Pipeline.findById = (async () => ({
        _id: pipelineId,
        brokerageId: brokerageA,
        stages: [{ _id: stageId, name: 'Lead' }],
      })) as any

      await assert.rejects(
        async () => {
          await createDeal(
            {
              title: 'Villa Sale',
              pipelineId: pipelineId.toString(),
              stageId: stageId.toString(),
              contactId: new mongoose.Types.ObjectId().toString(),
              assignedAgentId: agentId.toString(),
              propertyAddress: '123 Palm Ave',
              dealValue: 500000,
            } as any,
            mockSuperAdminNoBrokerage,
            '127.0.0.1',
            'test-agent'
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /assigned brokerage is required/i)
          return true
        }
      )
    })

    it('createDeal should reject when pipeline belongs to another brokerage with HTTP 403 Forbidden', async () => {
      const stageId = new mongoose.Types.ObjectId()
      const pipelineId = new mongoose.Types.ObjectId()
      Pipeline.findById = (async () => ({
        _id: pipelineId,
        brokerageId: brokerageB, // belongs to Brokerage B
        stages: [{ _id: stageId, name: 'Lead' }],
      })) as any

      await assert.rejects(
        async () => {
          await createDeal(
            {
              title: 'Villa Sale',
              pipelineId: pipelineId.toString(),
              stageId: stageId.toString(),
              contactId: new mongoose.Types.ObjectId().toString(),
              assignedAgentId: agentId.toString(),
              propertyAddress: '123 Palm Ave',
              dealValue: 500000,
            } as any,
            mockSuperAdminWithBrokerage,
            '127.0.0.1',
            'test-agent'
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /selected pipeline belongs to another brokerage/i)
          return true
        }
      )
    })

    it('createDeal should reject when contact belongs to another brokerage with HTTP 403 Forbidden', async () => {
      const stageId = new mongoose.Types.ObjectId()
      const pipelineId = new mongoose.Types.ObjectId()
      const crossContactId = new mongoose.Types.ObjectId()

      Pipeline.findById = (async () => ({
        _id: pipelineId,
        brokerageId: brokerageA,
        stages: [{ _id: stageId, name: 'Lead' }],
      })) as any

      Contact.findById = (async () => ({
        _id: crossContactId,
        brokerageId: brokerageB, // belongs to Brokerage B!
      })) as any

      await assert.rejects(
        async () => {
          await createDeal(
            {
              title: 'Villa Sale',
              pipelineId: pipelineId.toString(),
              stageId: stageId.toString(),
              contactId: crossContactId.toString(),
              assignedAgentId: agentId.toString(),
              propertyAddress: '123 Palm Ave',
              dealValue: 500000,
            } as any,
            mockSuperAdminWithBrokerage,
            '127.0.0.1',
            'test-agent'
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /selected contact belongs to another brokerage/i)
          return true
        }
      )
    })

    it('createDeal should reject when agent belongs to another brokerage with HTTP 403 Forbidden', async () => {
      const stageId = new mongoose.Types.ObjectId()
      const pipelineId = new mongoose.Types.ObjectId()
      const ownContactId = new mongoose.Types.ObjectId()
      const crossAgentId = new mongoose.Types.ObjectId()

      Pipeline.findById = (async () => ({
        _id: pipelineId,
        brokerageId: brokerageA,
        stages: [{ _id: stageId, name: 'Lead' }],
      })) as any

      Contact.findById = (async () => ({
        _id: ownContactId,
        brokerageId: brokerageA,
      })) as any

      User.findById = (async () => ({
        _id: crossAgentId,
        brokerageId: brokerageB, // belongs to Brokerage B!
        isActive: true,
      })) as any

      await assert.rejects(
        async () => {
          await createDeal(
            {
              title: 'Villa Sale',
              pipelineId: pipelineId.toString(),
              stageId: stageId.toString(),
              contactId: ownContactId.toString(),
              assignedAgentId: crossAgentId.toString(),
              propertyAddress: '123 Palm Ave',
              dealValue: 500000,
            } as any,
            mockSuperAdminWithBrokerage,
            '127.0.0.1',
            'test-agent'
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /agent does not belong to your brokerage/i)
          return true
        }
      )
    })
  })

  // ── 3. Transaction Service Restrictions ───────────────────────────────────
  describe('3. Transaction Service Cross-Brokerage Restrictions', () => {
    it('convertDealToTransaction should reject unassigned Super Admin with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await transactionService.convertDealToTransaction(
            new mongoose.Types.ObjectId().toString(),
            { closingDate: '2026-12-01', type: 'buyer' } as any,
            {
              id: superAdminId.toString(),
              name: 'Super Admin',
              role: 'super_admin',
              brokerageId: '',
            }
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /assigned brokerage is required/i)
          return true
        }
      )
    })

    it('convertDealToTransaction should reject cross-brokerage deal with HTTP 403 Forbidden', async () => {
      Deal.findOne = (async () => null) as any // Deal does not exist in caller's brokerage

      await assert.rejects(
        async () => {
          await transactionService.convertDealToTransaction(
            new mongoose.Types.ObjectId().toString(),
            { closingDate: '2026-12-01', type: 'buyer' } as any,
            {
              id: superAdminId.toString(),
              name: 'Super Admin',
              role: 'super_admin',
              brokerageId: brokerageA.toString(),
            }
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /deal not found or does not belong to this brokerage/i)
          return true
        }
      )
    })

    it('convertDealToTransaction should reject if deal contact belongs to another brokerage with HTTP 403 Forbidden', async () => {
      const dealId = new mongoose.Types.ObjectId()
      const crossContactId = new mongoose.Types.ObjectId()

      Deal.findOne = (async () => ({
        _id: dealId,
        contactId: crossContactId,
        contactName: 'Cross Lead',
        propertyAddress: '100 Main St',
        brokerageId: brokerageA,
      })) as any

      Contact.findOne = (async () => null) as any // Contact does not belong to caller's brokerage!

      await assert.rejects(
        async () => {
          await transactionService.convertDealToTransaction(
            dealId.toString(),
            { closingDate: '2026-12-01', type: 'buyer' } as any,
            {
              id: superAdminId.toString(),
              name: 'Super Admin',
              role: 'super_admin',
              brokerageId: brokerageA.toString(),
            }
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /deal contact belongs to another brokerage/i)
          return true
        }
      )
    })

    it('createTransaction should reject unassigned Super Admin with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await transactionService.createTransaction(
            {
              contactId: new mongoose.Types.ObjectId().toString(),
              propertyAddress: '200 Lake Dr',
              type: 'buyer',
              closingDate: '2026-12-01',
            } as any,
            {
              id: superAdminId.toString(),
              name: 'Super Admin',
              role: 'super_admin',
              brokerageId: '',
            }
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /assigned brokerage is required/i)
          return true
        }
      )
    })

    it('createTransaction should reject cross-brokerage contact with HTTP 403 Forbidden', async () => {
      const crossContactId = new mongoose.Types.ObjectId()

      Contact.findOne = (async () => null) as any // not found in caller's brokerage
      Contact.findById = (async () => ({
        _id: crossContactId,
        brokerageId: brokerageB, // exists in another brokerage!
      })) as any

      await assert.rejects(
        async () => {
          await transactionService.createTransaction(
            {
              contactId: crossContactId.toString(),
              propertyAddress: '200 Lake Dr',
              type: 'buyer',
              closingDate: '2026-12-01',
            } as any,
            {
              id: superAdminId.toString(),
              name: 'Super Admin',
              role: 'super_admin',
              brokerageId: brokerageA.toString(),
            }
          )
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /contact belongs to another brokerage/i)
          return true
        }
      )
    })
  })

  // ── 4. Seller Radar Service Restrictions ──────────────────────────────────
  describe('4. Seller Radar Service Cross-Brokerage Restrictions', () => {
    it('getProspects should return safe empty structure for unassigned Super Admin without error', async () => {
      const result = await radarService.getProspects(mockSuperAdminNoBrokerage, {})
      assert.equal(result.total, 0)
      assert.deepEqual(result.prospects, [])
    })

    it('getDashboardMetrics should return safe zeroed structure for unassigned Super Admin without error', async () => {
      const metrics = await radarService.getDashboardMetrics(mockSuperAdminNoBrokerage)
      assert.equal(metrics.totalProspects, 0)
      assert.equal(metrics.totalEquity, 0)
      assert.equal(metrics.avgEquity, 0)
      assert.equal(metrics.hotProspectsCount, 0)
      assert.equal(metrics.anniversariesThisMonth, 0)
    })

    it('generateMicroCma should reject unassigned Super Admin with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await radarService.generateMicroCma(mockSuperAdminNoBrokerage, {
            address: '500 Oak St',
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /assigned brokerage is required/i)
          return true
        }
      )
    })

    it('generateMicroCma should reject cross-brokerage property with HTTP 403 Forbidden', async () => {
      const crossPropId = new mongoose.Types.ObjectId()

      Property.findOne = (async () => null) as any
      Property.findById = (async () => ({
        _id: crossPropId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await radarService.generateMicroCma(mockSuperAdminWithBrokerage, {
            propertyId: crossPropId.toString(),
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /property belongs to another brokerage/i)
          return true
        }
      )
    })

    it('generateMicroCma should reject cross-brokerage contact with HTTP 403 Forbidden', async () => {
      const crossContactId = new mongoose.Types.ObjectId()

      Contact.findOne = (async () => null) as any
      Contact.findById = (async () => ({
        _id: crossContactId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await radarService.generateMicroCma(mockSuperAdminWithBrokerage, {
            contactId: crossContactId.toString(),
            address: '123 Pine St',
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /contact belongs to another brokerage/i)
          return true
        }
      )
    })
  })

  // ── 5. Commission Service Restrictions ────────────────────────────────────
  describe('5. Commission Service Cross-Brokerage Restrictions', () => {
    it('create commission should reject unassigned Super Admin with HTTP 403 Forbidden', async () => {
      await assert.rejects(
        async () => {
          await commissionService.create(mockSuperAdminNoBrokerage, {
            agentId: agentId.toString(),
            salePrice: 500000,
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /assigned brokerage is required/i)
          return true
        }
      )
    })

    it('create commission should reject cross-brokerage agent with HTTP 403 Forbidden', async () => {
      const crossAgentId = new mongoose.Types.ObjectId()

      User.findOne = (() => ({
        lean: async () => null,
      })) as any
      User.findById = (async () => ({
        _id: crossAgentId,
        brokerageId: brokerageB, // belongs to Brokerage B!
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.create(mockSuperAdminWithBrokerage, {
            agentId: crossAgentId.toString(),
            salePrice: 500000,
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /agent belongs to another brokerage/i)
          return true
        }
      )
    })

    it('create commission should reject cross-brokerage contact with HTTP 403 Forbidden', async () => {
      const crossContactId = new mongoose.Types.ObjectId()

      User.findOne = (() => ({
        lean: async () => ({ _id: agentId, brokerageId: brokerageA }),
      })) as any

      Contact.findOne = (async () => null) as any
      Contact.findById = (async () => ({
        _id: crossContactId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.create(mockSuperAdminWithBrokerage, {
            agentId: agentId.toString(),
            contactId: crossContactId.toString(),
            salePrice: 500000,
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /contact belongs to another brokerage/i)
          return true
        }
      )
    })

    it('create commission should reject cross-brokerage deal with HTTP 403 Forbidden', async () => {
      const crossDealId = new mongoose.Types.ObjectId()

      User.findOne = (() => ({
        lean: async () => ({ _id: agentId, brokerageId: brokerageA }),
      })) as any

      Deal.findOne = (async () => null) as any
      Deal.findById = (async () => ({
        _id: crossDealId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.create(mockSuperAdminWithBrokerage, {
            agentId: agentId.toString(),
            dealId: crossDealId.toString(),
            salePrice: 500000,
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /deal belongs to another brokerage/i)
          return true
        }
      )
    })

    it('create commission should reject cross-brokerage transaction with HTTP 403 Forbidden', async () => {
      const crossTxId = new mongoose.Types.ObjectId()

      User.findOne = (() => ({
        lean: async () => ({ _id: agentId, brokerageId: brokerageA }),
      })) as any

      Transaction.findOne = (async () => null) as any
      Transaction.findById = (async () => ({
        _id: crossTxId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.create(mockSuperAdminWithBrokerage, {
            agentId: agentId.toString(),
            transactionId: crossTxId.toString(),
            salePrice: 500000,
          })
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /transaction belongs to another brokerage/i)
          return true
        }
      )
    })

    it('list commissions should return safe empty list for unassigned Super Admin without error', async () => {
      const result = await commissionService.list(mockSuperAdminNoBrokerage, {})
      assert.equal(result.total, 0)
      assert.deepEqual(result.commissions, [])
    })

    it('getById commission should reject cross-brokerage commission with HTTP 403 Forbidden', async () => {
      const crossCommId = new mongoose.Types.ObjectId()

      Commission.findOne = (() => ({
        lean: async () => null,
      })) as any

      Commission.findById = (async () => ({
        _id: crossCommId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.getById(mockSuperAdminWithBrokerage, crossCommId.toString())
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /belongs to another brokerage/i)
          return true
        }
      )
    })

    it('updateStatus commission should reject cross-brokerage commission with HTTP 403 Forbidden', async () => {
      const crossCommId = new mongoose.Types.ObjectId()

      Commission.findOneAndUpdate = (() => ({
        lean: async () => null,
      })) as any

      Commission.findById = (async () => ({
        _id: crossCommId,
        brokerageId: brokerageB,
      })) as any

      await assert.rejects(
        async () => {
          await commissionService.updateStatus(mockSuperAdminWithBrokerage, crossCommId.toString(), 'approved')
        },
        (err: any) => {
          assert.equal(err.statusCode, HTTP_STATUS.FORBIDDEN)
          assert.match(err.message, /belongs to another brokerage/i)
          return true
        }
      )
    })
  })

  // ── 6. Smart List Controller Restrictions ─────────────────────────────────
  describe('6. Smart List Controller Cross-Brokerage Restrictions', () => {
    it('getSmartLists should return empty array for unassigned Super Admin', async () => {
      const req: any = { user: mockSuperAdminNoBrokerage }
      let responsePayload: any = null
      const res: any = {
        status(code: number) {
          this.statusCode = code
          return this
        },
        json(payload: any) {
          responsePayload = payload
          return this
        },
      }

      await getSmartLists(req, res)
      assert.equal(responsePayload?.success, true)
      assert.deepEqual(responsePayload?.data, [])
    })

    it('createSmartList should return 403 Forbidden for unassigned Super Admin', async () => {
      const req: any = { user: mockSuperAdminNoBrokerage, body: { name: 'Test List' } }
      let responsePayload: any = null
      let statusCode = 200
      const res: any = {
        status(code: number) {
          statusCode = code
          return this
        },
        json(payload: any) {
          responsePayload = payload
          return this
        },
      }

      await createSmartList(req, res)
      assert.equal(statusCode, 403)
      assert.equal(responsePayload?.success, false)
      assert.match(responsePayload?.message, /assigned brokerage is required/i)
    })

    it('updateSmartList should return 403 Forbidden for unassigned Super Admin', async () => {
      const req: any = { user: mockSuperAdminNoBrokerage, params: { id: '123' }, body: { name: 'Updated' } }
      let responsePayload: any = null
      let statusCode = 200
      const res: any = {
        status(code: number) {
          statusCode = code
          return this
        },
        json(payload: any) {
          responsePayload = payload
          return this
        },
      }

      await updateSmartList(req, res)
      assert.equal(statusCode, 403)
      assert.equal(responsePayload?.success, false)
      assert.match(responsePayload?.message, /assigned brokerage is required/i)
    })

    it('deleteSmartList should return 403 Forbidden for unassigned Super Admin', async () => {
      const req: any = { user: mockSuperAdminNoBrokerage, params: { id: '123' } }
      let responsePayload: any = null
      let statusCode = 200
      const res: any = {
        status(code: number) {
          statusCode = code
          return this
        },
        json(payload: any) {
          responsePayload = payload
          return this
        },
      }

      await deleteSmartList(req, res)
      assert.equal(statusCode, 403)
      assert.equal(responsePayload?.success, false)
      assert.match(responsePayload?.message, /assigned brokerage is required/i)
    })
  })
})
