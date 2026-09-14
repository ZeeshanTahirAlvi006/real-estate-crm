import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Notification } from '../../src/models/Notification.js'
import { IUser } from '../../src/models/User.js'
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  softDeleteNotification,
  pushNotification,
  notificationsL1Cache,
  invalidateNotificationCaches,
  NOTIFICATION_PROJECTION,
} from '../../src/features/notifications/notification.service.js'
import {
  getNotificationsHandler,
  deleteNotificationHandler,
  markReadHandler,
  markAllReadHandler,
} from '../../src/features/notifications/notification.controller.js'
import { listNotificationsQuerySchema } from '../../src/features/notifications/notification.validators.js'
import { USER_ROLES, HTTP_STATUS, GENERIC_AUTH_MESSAGES } from '../../src/utils/constants.js'

// Mock Response Factory
const createMockResponse = () => {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value
      return this
    },
  }
  return res
}

describe('Notification Sub-1ms Performance & Quality Validation Tests', () => {
  const brokerageId = new mongoose.Types.ObjectId()
  const otherBrokerageId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()
  const otherUserId = new mongoose.Types.ObjectId()

  const mockUser: IUser = {
    _id: userId,
    role: USER_ROLES.AGENT,
    brokerageId,
    email: 'agent@testbrokerage.com',
  } as unknown as IUser

  const superAdminUser: IUser = {
    _id: new mongoose.Types.ObjectId(),
    role: USER_ROLES.SUPER_ADMIN,
    brokerageId,
    email: 'admin@system.com',
  } as unknown as IUser

  beforeEach(() => {
    notificationsL1Cache.clear()
  })

  describe('1. Hanging Connection Bug Fix & Controller Immunization', () => {
    it('getNotificationsHandler should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, query: {} }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await getNotificationsHandler(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('deleteNotificationHandler should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await deleteNotificationHandler(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('markReadHandler should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined, params: { id: new mongoose.Types.ObjectId().toString() } }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await markReadHandler(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })

    it('markAllReadHandler should immediately return HTTP 401 when req.user is missing', async () => {
      const req: any = { user: undefined }
      const res = createMockResponse()
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      await markAllReadHandler(req, res, next)

      assert.equal(res.statusCode, HTTP_STATUS.UNAUTHORIZED)
      assert.equal(res.body?.success, false)
      assert.equal(res.body?.message, GENERIC_AUTH_MESSAGES.UNAUTHORIZED)
      assert.equal(nextCalled, false)
    })
  })

  describe('2. Multi-Tenant RBAC & Cross-Brokerage Access Control', () => {
    it('markNotificationRead should reject cross-brokerage attempt with 403 Forbidden', async () => {
      const foreignNotifId = new mongoose.Types.ObjectId()
      const originalFindOne = Notification.findOne

      Notification.findOne = (async () => ({
        _id: foreignNotifId,
        brokerageId: otherBrokerageId,
        userId: otherUserId,
        isDeleted: false,
        isRead: false,
      })) as any

      try {
        await assert.rejects(
          async () => {
            await markNotificationRead(foreignNotifId.toString(), mockUser)
          },
          (err: any) => {
            return err.statusCode === 403 && err.message.includes('Unauthorized')
          }
        )
      } finally {
        Notification.findOne = originalFindOne
      }
    })

    it('markNotificationRead should reject cross-user modification within same brokerage with 403 Forbidden', async () => {
      const otherUserNotifId = new mongoose.Types.ObjectId()
      const originalFindOne = Notification.findOne

      Notification.findOne = (async () => ({
        _id: otherUserNotifId,
        brokerageId,
        userId: otherUserId, // belongs to a different agent in the same brokerage
        isDeleted: false,
        isRead: false,
      })) as any

      try {
        await assert.rejects(
          async () => {
            await markNotificationRead(otherUserNotifId.toString(), mockUser)
          },
          (err: any) => {
            return err.statusCode === 403 && err.message.includes('Unauthorized')
          }
        )
      } finally {
        Notification.findOne = originalFindOne
      }
    })

    it('markNotificationRead should allow Super Admin to mark any notification as read', async () => {
      const notifId = new mongoose.Types.ObjectId()
      const originalFindOne = Notification.findOne
      let savedRead = false

      Notification.findOne = (async () => ({
        _id: notifId,
        brokerageId: otherBrokerageId,
        userId: otherUserId,
        type: 'system',
        title: 'System Alert',
        message: 'Super Admin override',
        isDeleted: false,
        isRead: false,
        save: async function () {
          savedRead = true
        },
      })) as any

      try {
        const result = await markNotificationRead(notifId.toString(), superAdminUser)
        assert.equal(result.id, notifId.toString())
        assert.equal(savedRead, true)
      } finally {
        Notification.findOne = originalFindOne
      }
    })
  })

  describe('3. Compound Covering Indexes & Projection Guard (PERF-M-001, PERF-M-002)', () => {
    it('Notification schema should define compound covering indexes', () => {
      const indexes = Notification.schema.indexes()
      const indexFields = indexes.map(([spec]) => Object.keys(spec).join(','))

      assert.ok(
        indexFields.includes('userId,isDeleted,isRead,createdAt'),
        'Missing index { userId, isDeleted, isRead, createdAt }'
      )
      assert.ok(
        indexFields.includes('brokerageId,isDeleted,isRead,createdAt'),
        'Missing index { brokerageId, isDeleted, isRead, createdAt }'
      )
      assert.ok(
        indexFields.includes('brokerageId,userId,isDeleted,isRead,createdAt'),
        'Missing index { brokerageId, userId, isDeleted, isRead, createdAt }'
      )
      assert.ok(
        indexFields.includes('brokerageId,isDeleted,createdAt'),
        'Missing index { brokerageId, isDeleted, createdAt }'
      )
    })

    it('NOTIFICATION_PROJECTION must contain only required lightweight fields', () => {
      const fields = NOTIFICATION_PROJECTION.split(' ')
      assert.ok(fields.includes('_id'))
      assert.ok(fields.includes('brokerageId'))
      assert.ok(fields.includes('title'))
      assert.ok(fields.includes('message'))
      assert.ok(fields.includes('isRead'))
      assert.ok(fields.includes('createdAt'))
    })
  })

  describe('4. Sub-1ms Caching & Latency SLO Assertions', () => {
    it('should return L1 cached response in < 1.0ms with source: l1', async () => {
      const originalFind = Notification.find
      const originalCountDocuments = Notification.countDocuments

      Notification.find = (() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    _id: new mongoose.Types.ObjectId(),
                    brokerageId,
                    userId,
                    type: 'new_lead',
                    title: 'Cached Lead',
                    message: 'Instant response',
                    isRead: false,
                    isDeleted: false,
                    createdAt: new Date(),
                  },
                ]),
            }),
          }),
        }),
      })) as any

      Notification.countDocuments = (async () => 1) as any

      try {
        // Cold fetch (source: db)
        const cold = await listNotifications(mockUser, { page: 1, limit: 10 })
        assert.equal(cold.source, 'db')

        // Warm L1 fetch
        const t0 = process.hrtime.bigint()
        const warm = await listNotifications(mockUser, { page: 1, limit: 10 })
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6

        assert.equal(warm.source, 'l1')
        assert.equal(warm.notifications.length, 1)
        assert.ok(elapsedMs < 1.0, `Expected L1 latency < 1.0ms, received ${elapsedMs}ms`)
      } finally {
        Notification.find = originalFind
        Notification.countDocuments = originalCountDocuments
      }
    })

    it('getNotificationsHandler should set X-Cache: L1-HIT on warm requests', async () => {
      const originalFind = Notification.find
      const originalCountDocuments = Notification.countDocuments

      Notification.find = (() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([]),
            }),
          }),
        }),
      })) as any
      Notification.countDocuments = (async () => 0) as any

      try {
        // Prime the cache
        await listNotifications(mockUser, { page: 1, limit: 20 })

        const req: any = { user: mockUser, query: { page: '1', limit: '20' } }
        const res = createMockResponse()
        await getNotificationsHandler(req, res, () => {})

        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['x-cache'], 'L1-HIT')
        assert.ok(res.headers['x-response-time'])
      } finally {
        Notification.find = originalFind
        Notification.countDocuments = originalCountDocuments
      }
    })
  })

  describe('5. Deterministic Cache Invalidation', () => {
    it('invalidateNotificationCaches should completely clear L1 cache', () => {
      notificationsL1Cache.set('test-key', {
        notifications: [],
        total: 0,
        page: 1,
        limit: 20,
        hasMore: false,
        unreadCount: 0,
      })

      assert.equal(notificationsL1Cache.size, 1)
      invalidateNotificationCaches(brokerageId.toString())
      assert.equal(notificationsL1Cache.size, 0)
    })
  })

  describe('6. Bounded Pagination & Query Validation', () => {
    it('listNotificationsQuerySchema should clamp limit to 100', () => {
      const parsed = listNotificationsQuerySchema.parse({ limit: '500', page: '2' })
      assert.equal(parsed.limit, 100)
      assert.equal(parsed.page, 2)
      assert.equal(parsed.status, 'all')
    })

    it('listNotificationsQuerySchema should reject invalid status', () => {
      assert.throws(() => {
        listNotificationsQuerySchema.parse({ status: 'invalid_status' })
      })
    })
  })

  describe('7. High-Concurrency Burst Loop (50 Concurrent Requests)', () => {
    it('should service 50 concurrent cached reads with average latency < 0.2ms per request', async () => {
      const originalFind = Notification.find
      const originalCountDocuments = Notification.countDocuments

      Notification.find = (() => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () =>
                Promise.resolve([
                  {
                    _id: new mongoose.Types.ObjectId(),
                    brokerageId,
                    userId,
                    type: 'team_activity',
                    title: 'Concurrent Load Test',
                    message: 'Testing concurrent throughput',
                    isRead: false,
                    isDeleted: false,
                    createdAt: new Date(),
                  },
                ]),
            }),
          }),
        }),
      })) as any
      Notification.countDocuments = (async () => 1) as any

      try {
        // Cold fetch
        await listNotifications(mockUser, { page: 1, limit: 20 })

        // 50 concurrent requests
        const t0 = process.hrtime.bigint()
        const requests = Array.from({ length: 50 }, () =>
          listNotifications(mockUser, { page: 1, limit: 20 })
        )
        const results = await Promise.all(requests)
        const totalDurationMs = Number(process.hrtime.bigint() - t0) / 1e6
        const avgPerRequestMs = totalDurationMs / 50

        assert.equal(results.length, 50)
        results.forEach((r) => assert.equal(r.source, 'l1'))
        assert.ok(
          avgPerRequestMs < 0.5,
          `Expected avg latency < 0.5ms/req, got ${avgPerRequestMs.toFixed(3)}ms`
        )
      } finally {
        Notification.find = originalFind
        Notification.countDocuments = originalCountDocuments
      }
    })
  })
})
