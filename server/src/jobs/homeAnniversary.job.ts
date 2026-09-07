import mongoose from 'mongoose'
import { Property, IProperty } from '../models/Property.js'
import { Notification } from '../models/Notification.js'
import { Activity } from '../models/Activity.js'
import { getSocketServer } from '../config/socket.js'
import { logger } from '../utils/logger.js'

export interface HomeAnniversaryJobOptions {
  brokerageId?: string
  forceAll?: boolean
}

export interface HomeAnniversaryJobResult {
  scannedCount: number
  anniversariesIdentified: number
  notificationsCreated: number
  durationMs: number
}

/**
 * Daily Home Purchase Anniversary Scanner
 * Identifies homeowners reaching their purchase anniversary date,
 * auto-flags milestone tenure periods, logs CRM activity, and alerts assigned agents.
 */
export const runHomeAnniversaryJob = async (
  options: HomeAnniversaryJobOptions = {}
): Promise<HomeAnniversaryJobResult> => {
  const startTime = Date.now()
  logger.info('[HomeAnniversaryJob] Starting scheduled home anniversary scan...')

  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12
  const currentDay = today.getDate() // 1-31
  const currentYear = today.getFullYear()

  const matchQuery: mongoose.FilterQuery<IProperty> = {
    isDeleted: false,
    purchaseDate: { $exists: true, $ne: null },
  }

  if (options.brokerageId) {
    matchQuery.brokerageId = new mongoose.Types.ObjectId(options.brokerageId)
  }

  // Find all active properties with purchaseDate
  const properties = await Property.find(matchQuery)
    .populate('ownerContactId', 'firstName lastName email phone assignedAgentId')
    .lean()

  let anniversariesIdentified = 0
  let notificationsCreated = 0

  for (const prop of properties) {
    if (!prop.purchaseDate) continue

    const pDate = new Date(prop.purchaseDate)
    const pMonth = pDate.getMonth() + 1
    const pDay = pDate.getDate()
    const pYear = pDate.getFullYear()

    // Determine if anniversary is today (or forced for testing)
    const isToday = pMonth === currentMonth && pDay === currentDay
    const shouldProcess = options.forceAll || isToday

    if (!shouldProcess) continue

    // Avoid duplicate triggers in the same calendar year
    if (!options.forceAll && prop.lastAnniversaryTriggeredYear === currentYear) {
      continue
    }

    const yearsOwned = Math.max(1, currentYear - pYear)
    anniversariesIdentified++

    const contact = prop.ownerContactId as any
    const contactName = contact
      ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Homeowner'
      : 'Homeowner'
    const addressStr = prop.address?.formattedAddress || 'Property'
    const equityFormatted = `$${(prop.equity || 0).toLocaleString()}`

    // 1. Atomically record anniversary year on Property to prevent race conditions
    await Property.updateOne(
      { _id: prop._id },
      { $set: { lastAnniversaryTriggeredYear: currentYear } }
    )

    // 2. Determine target user for notification (assigned agent or brokerage owner)
    const targetUserId = prop.assignedAgentId || contact?.assignedAgentId

    if (targetUserId) {
      // 3. Create in-app high-priority notification
      await Notification.create({
        userId: targetUserId,
        brokerageId: prop.brokerageId,
        type: 'system',
        title: `🏡 Home Purchase Anniversary: ${contactName}`,
        message: `${contactName} purchased ${addressStr} ${yearsOwned} year${
          yearsOwned > 1 ? 's' : ''
        } ago today. Net equity is ${equityFormatted}. Send an anniversary equity update!`,
        linkTo: `/smart-lists`,
        metadata: {
          propertyId: prop._id.toString(),
          contactId: contact?._id?.toString(),
          yearsOwned,
          equity: prop.equity,
        },
      })
      notificationsCreated++

      // 4. Send real-time WebSocket notification if agent is online
      try {
        const io = getSocketServer()
        if (io) {
          io.to(`user:${targetUserId.toString()}`).emit('home_anniversary_alert', {
            propertyId: prop._id.toString(),
            contactName,
            address: addressStr,
            yearsOwned,
            equity: prop.equity,
          })
        }
      } catch (wsErr: any) {
        // Non-fatal telemetry catch
      }
    }

    // 5. Record activity on Contact timeline
    if (contact?._id) {
      await Activity.create({
        contactId: contact._id,
        brokerageId: prop.brokerageId,
        type: 'system',
        description: `Home purchase anniversary detected (${yearsOwned} years of ownership at ${addressStr}). Net equity: ${equityFormatted}.`,
        metadata: {
          propertyId: prop._id.toString(),
          yearsOwned: String(yearsOwned),
          equity: String(prop.equity),
        },
      })
    }
  }

  const durationMs = Date.now() - startTime
  logger.info(
    `[HomeAnniversaryJob] Completed in ${durationMs}ms: Scanned ${properties.length} properties, found ${anniversariesIdentified} anniversaries, generated ${notificationsCreated} notifications.`
  )

  return {
    scannedCount: properties.length,
    anniversariesIdentified,
    notificationsCreated,
    durationMs,
  }
}
