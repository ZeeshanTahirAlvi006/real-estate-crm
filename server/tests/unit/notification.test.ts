import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { Notification, INotification } from '../../src/models/Notification.js'
import {
  formatNotificationDto,
  listNotifications,
  softDeleteNotification,
} from '../../src/features/notifications/notification.service.js'
import { USER_ROLES } from '../../src/utils/constants.js'
import type { IUser } from '../../src/models/User.js'

describe('Notification Soft Delete, Auto-Replacement & Infinite Scroll Unit Tests', () => {
  const brokerageId = new mongoose.Types.ObjectId()
  const otherBrokerageId = new mongoose.Types.ObjectId()
  const userId = new mongoose.Types.ObjectId()

  const mockUser = {
    _id: userId,
    role: USER_ROLES.AGENT,
    brokerageId,
    email: 'agent@testbrokerage.com',
  } as unknown as IUser

  it('should validate Notification schema defaults isDeleted to false and deletedAt is undefined', () => {
    const notif = new Notification({
      userId,
      brokerageId,
      type: 'new_lead',
      title: 'New Lead Test',
      message: 'Lead message',
    })

    assert.equal(notif.isDeleted, false)
    assert.equal(notif.deletedAt, undefined)
    assert.equal(notif.isRead, false)
    assert.equal(notif.validateSync(), undefined)
  })

  it('should format NotificationDto with isDeleted: false and deletedAt: undefined when active', () => {
    const mockNotif = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      brokerageId,
      type: 'new_lead',
      title: 'New Lead Received',
      message: 'John Doe viewed listing',
      isRead: false,
      isDeleted: false,
      createdAt: new Date('2026-09-07T12:00:00.000Z'),
      updatedAt: new Date('2026-09-07T12:00:00.000Z'),
    } as unknown as INotification

    const dto = formatNotificationDto(mockNotif)
    assert.equal(dto.id, mockNotif._id.toString())
    assert.equal(dto.isDeleted, false)
    assert.equal(dto.deletedAt, undefined)
    assert.equal(dto.isRead, false)
  })

  it('should format NotificationDto with isDeleted: true and deletedAt ISO string when soft-deleted', () => {
    const deletedDate = new Date('2026-09-07T15:30:00.000Z')
    const mockNotif = {
      _id: new mongoose.Types.ObjectId(),
      userId,
      brokerageId,
      type: 'stage_change',
      title: 'Offer Submitted',
      message: 'Offer accepted on deal',
      isRead: true,
      isDeleted: true,
      deletedAt: deletedDate,
      createdAt: new Date('2026-09-07T12:00:00.000Z'),
      updatedAt: new Date('2026-09-07T15:30:00.000Z'),
    } as unknown as INotification

    const dto = formatNotificationDto(mockNotif)
    assert.equal(dto.isDeleted, true)
    assert.equal(dto.deletedAt, deletedDate.toISOString())
  })

  it('should reject soft-delete with invalid ObjectId', async () => {
    await assert.rejects(
      async () => {
        await softDeleteNotification('not-a-valid-object-id', mockUser)
      },
      (err: any) => {
        return err.statusCode === 400 && err.message === 'Invalid notification ID'
      }
    )
  })

  it('should prevent cross-brokerage deletion', async () => {
    // Temporarily mock Notification.findById
    const originalFindById = Notification.findById
    const foreignNotifId = new mongoose.Types.ObjectId()

    Notification.findById = (async () => {
      return {
        _id: foreignNotifId,
        brokerageId: otherBrokerageId, // belongs to another brokerage
        isDeleted: false,
        save: async () => {},
      }
    }) as any

    try {
      await assert.rejects(
        async () => {
          await softDeleteNotification(foreignNotifId.toString(), mockUser)
        },
        (err: any) => {
          return err.statusCode === 403 && err.message.includes('Unauthorized')
        }
      )
    } finally {
      Notification.findById = originalFindById
    }
  })

  it('should perform soft-delete, mark isDeleted: true, and return replacement unread notification', async () => {
    const notifId = new mongoose.Types.ObjectId()
    const replacementId = new mongoose.Types.ObjectId()
    let savedDeletedState = false
    let savedDeletedAt: Date | undefined = undefined

    const originalFindById = Notification.findById
    const originalFindOne = Notification.findOne
    const originalCountDocuments = Notification.countDocuments

    Notification.findById = (async () => {
      return {
        _id: notifId,
        brokerageId,
        userId,
        type: 'new_lead',
        title: 'Original Lead',
        message: 'Lead message',
        isRead: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          savedDeletedState = (this as any).isDeleted
          savedDeletedAt = (this as any).deletedAt
        },
      }
    }) as any

    Notification.findOne = (() => ({
      sort: () =>
        Promise.resolve({
          _id: replacementId,
          brokerageId,
          userId,
          type: 'new_message',
          title: 'Unread Chat Followup',
          message: 'Client replied on WhatsApp',
          isRead: false,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
    })) as any

    Notification.countDocuments = (async () => 3) as any

    try {
      const result = await softDeleteNotification(notifId.toString(), mockUser)

      assert.equal(result.success, true)
      assert.equal(result.deletedId, notifId.toString())
      assert.equal(savedDeletedState, true)
      assert.ok(savedDeletedAt instanceof Date)
      assert.ok(result.replacementNotification)
      assert.equal(result.replacementNotification.id, replacementId.toString())
      assert.equal(result.replacementNotification.isRead, false)
      assert.equal(result.unreadCount, 3)
    } finally {
      Notification.findById = originalFindById
      Notification.findOne = originalFindOne
      Notification.countDocuments = originalCountDocuments
    }
  })

  it('should synthesize a contextual unread notification when unread queue is exhausted on delete', async () => {
    const notifId = new mongoose.Types.ObjectId()
    const generatedId = new mongoose.Types.ObjectId()

    const originalFindById = Notification.findById
    const originalFindOne = Notification.findOne
    const originalCreate = Notification.create
    const originalCountDocuments = Notification.countDocuments

    Notification.findById = (async () => {
      return {
        _id: notifId,
        brokerageId,
        userId,
        type: 'system',
        title: 'System Alert',
        message: 'Old alert',
        isRead: false,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async () => {},
      }
    }) as any

    // Simulate queue exhausted: findOne returns null
    Notification.findOne = (() => ({
      sort: () => Promise.resolve(null),
    })) as any

    // Mock create returning synthesized unread notification
    let createdPayload: any = null
    Notification.create = (async (data: any) => {
      createdPayload = data
      return {
        _id: generatedId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }) as any

    Notification.countDocuments = (async () => 1) as any

    try {
      const result = await softDeleteNotification(notifId.toString(), mockUser)

      assert.equal(result.success, true)
      assert.equal(result.deletedId, notifId.toString())
      assert.ok(createdPayload)
      assert.equal(createdPayload.isRead, false)
      assert.equal(createdPayload.isDeleted, false)
      assert.ok(result.replacementNotification)
      assert.equal(result.replacementNotification.id, generatedId.toString())
      assert.equal(result.replacementNotification.isRead, false)
    } finally {
      Notification.findById = originalFindById
      Notification.findOne = originalFindOne
      Notification.create = originalCreate
      Notification.countDocuments = originalCountDocuments
    }
  })

  it('should paginate and filter isDeleted in listNotifications', async () => {
    const originalFind = Notification.find
    const originalCountDocuments = Notification.countDocuments

    let passedQuery: any = null
    let passedSkip = 0
    let passedLimit = 0

    Notification.find = ((query: any) => {
      passedQuery = query
      return {
        sort: () => ({
          skip: (s: number) => ({
            limit: (l: number) => {
              passedSkip = s
              passedLimit = l
              return {
                lean: () =>
                  Promise.resolve([
                    {
                      _id: new mongoose.Types.ObjectId(),
                      brokerageId,
                      userId,
                      type: 'new_lead',
                      title: 'Lead 1',
                      message: 'Msg 1',
                      isRead: false,
                      isDeleted: false,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  ]),
              }
            },
          }),
        }),
      }
    }) as any

    Notification.countDocuments = (async () => 15) as any

    try {
      const result = await listNotifications(mockUser, { page: 2, limit: 5, status: 'all' })

      assert.deepEqual(passedQuery.isDeleted, { $ne: true })
      assert.equal(passedSkip, 5) // (page 2 - 1) * 5
      assert.equal(passedLimit, 5)
      assert.equal(result.page, 2)
      assert.equal(result.limit, 5)
      assert.equal(result.total, 15)
      assert.equal(result.hasMore, true)
      assert.equal(result.notifications.length, 1)
    } finally {
      Notification.find = originalFind
      Notification.countDocuments = originalCountDocuments
    }
  })
})
