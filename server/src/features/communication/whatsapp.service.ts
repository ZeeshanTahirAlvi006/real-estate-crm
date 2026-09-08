import mongoose from 'mongoose'
import { WhatsAppTemplate, IWhatsAppTemplate } from '../../models/WhatsAppTemplate.js'
import { WhatsAppBroadcast, IWhatsAppBroadcast } from '../../models/WhatsAppBroadcast.js'
import { Contact, IContact } from '../../models/Contact.js'
import { Conversation, IConversation } from '../../models/Conversation.js'
import { Message } from '../../models/Message.js'
import { Activity } from '../../models/Activity.js'
import { Brokerage } from '../../models/Brokerage.js'
import { IUser } from '../../models/User.js'
import { whatsAppProvider, ParsedInboundWhatsAppMessage } from './providers/whatsapp.provider.js'
import { getSocketServer } from '../../config/socket.js'
import { handleInboundLeadChat } from '../ai-isa/aiIsa.service.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { encrypt } from '../../utils/cryptoHelper.js'
import { USER_ROLES } from '../../utils/constants.js'
import {
  WhatsAppTemplateDto,
  SendWhatsAppInput,
  WhatsAppBroadcastDto,
  CreateBroadcastInput,
} from './whatsapp.types.js'

// Default WhatsApp Templates
export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    name: 'hello_world',
    title: 'Meta Official Welcome & Handshake (hello_world)',
    category: 'UTILITY' as const,
    language: 'en_US',
    headerType: 'NONE' as const,
    bodyText: 'Hello World! Welcome and thank you for connecting with our real estate team.',
    footerText: 'PropPulse Real Estate CRM',
    buttons: [],
    variables: [],
    isDefault: true,
  },
  {
    name: 'property_brochure_alert',
    title: 'Property Brochure & Floor Plan Alert',
    category: 'MARKETING' as const,
    language: 'en_US',
    headerType: 'DOCUMENT' as const,
    headerText: 'Exclusive Property Brochure',
    bodyText:
      'Hi {{firstName}}! 🏡 Here is the exclusive brochure and digital floor plan for {{propertyAddress}}. Are you available for a private walkthrough this week?',
    footerText: 'PropPulse Premier Real Estate',
    buttons: [
      { type: 'QUICK_REPLY' as const, text: 'Book Private Tour' },
      { type: 'QUICK_REPLY' as const, text: 'Request Price Sheet' },
    ],
    variables: ['firstName', 'propertyAddress'],
    isDefault: true,
  },
  {
    name: 'instant_cma_valuation',
    title: 'Instant Home Equity & CMA Valuation',
    category: 'UTILITY' as const,
    language: 'en_US',
    headerType: 'TEXT' as const,
    headerText: 'Home Valuation Update',
    bodyText:
      'Hi {{firstName}}, we completed a customized valuation for your home at {{propertyAddress}}. Estimated market value: {{estimatedValue}}. View the full CMA breakdown: {{cmaLink}}',
    footerText: 'PropPulse Market Analytics',
    buttons: [
      { type: 'URL' as const, text: 'View Full CMA Report', url: 'https://proppulse.io/cma' },
      { type: 'QUICK_REPLY' as const, text: 'Speak with Agent' },
    ],
    variables: ['firstName', 'propertyAddress', 'estimatedValue', 'cmaLink'],
    isDefault: true,
  },
  {
    name: 'showing_confirmation',
    title: 'Private Showing Appointment Confirmation',
    category: 'UTILITY' as const,
    language: 'en_US',
    headerType: 'NONE' as const,
    bodyText:
      'Hi {{firstName}}, your private tour for {{propertyAddress}} is confirmed for {{showingTime}} with {{agentName}}. Reply YES to confirm or RESCHEDULE if your plans changed.',
    footerText: 'PropPulse Concierge',
    buttons: [
      { type: 'QUICK_REPLY' as const, text: 'YES (Confirmed)' },
      { type: 'QUICK_REPLY' as const, text: 'RESCHEDULE' },
    ],
    variables: ['firstName', 'propertyAddress', 'showingTime', 'agentName'],
    isDefault: true,
  },
  {
    name: 'price_reduction_notice',
    title: 'Price Drop Alert on Saved Listing',
    category: 'MARKETING' as const,
    language: 'en_US',
    headerType: 'IMAGE' as const,
    bodyText:
      '🔥 Price Drop Alert! The listing at {{propertyAddress}} in {{neighborhood}} just reduced by {{priceDropAmount}}. New price is {{newPrice}}. Would you like to submit an offer?',
    footerText: 'PropPulse Instant Alerts',
    buttons: [
      { type: 'QUICK_REPLY' as const, text: 'Schedule Viewing' },
      { type: 'QUICK_REPLY' as const, text: 'Draft Offer' },
    ],
    variables: ['propertyAddress', 'neighborhood', 'priceDropAmount', 'newPrice'],
    isDefault: true,
  },
]

// ── Formatters ──────────────────────────────────────────
const formatTemplateDto = (tmpl: IWhatsAppTemplate): WhatsAppTemplateDto => ({
  id: tmpl._id.toString(),
  name: tmpl.name,
  title: tmpl.title,
  category: tmpl.category,
  language: tmpl.language,
  headerType: tmpl.headerType,
  headerText: tmpl.headerText,
  bodyText: tmpl.bodyText,
  footerText: tmpl.footerText,
  buttons: tmpl.buttons,
  variables: tmpl.variables,
  status: tmpl.status,
  isDefault: tmpl.isDefault,
  createdAt: tmpl.createdAt.toISOString(),
})

const formatBroadcastDto = (b: IWhatsAppBroadcast): WhatsAppBroadcastDto => ({
  id: b._id.toString(),
  title: b.title,
  templateName: b.templateName,
  targetAudience: b.targetAudience,
  targetTag: b.targetTag,
  recipientCount: b.recipientCount,
  sentCount: b.sentCount,
  deliveredCount: b.deliveredCount,
  readCount: b.readCount,
  failedCount: b.failedCount,
  status: b.status,
  createdAt: b.createdAt.toISOString(),
})

// ── 1. Get or Seed WhatsApp Templates ───────────────────
export const getWhatsAppTemplates = async (
  _tenantFilter: Record<string, any>,
  caller: IUser
): Promise<WhatsAppTemplateDto[]> => {
  const brokerageId = caller.brokerageId

  // Ensure all default templates exist
  if (brokerageId) {
    for (const defTmpl of DEFAULT_WHATSAPP_TEMPLATES) {
      const exists = await WhatsAppTemplate.findOne({ brokerageId, name: defTmpl.name })
      if (!exists) {
        await WhatsAppTemplate.create({
          ...defTmpl,
          brokerageId,
          createdBy: caller._id,
          status: 'APPROVED',
        })
      }
    }
  }

  const templates = (await WhatsAppTemplate.find({ brokerageId }).lean()) as unknown as IWhatsAppTemplate[]

  // Sort so hello_world is always first
  const sorted = [...templates].sort((a, b) => {
    if (a.name === 'hello_world') return -1
    if (b.name === 'hello_world') return 1
    return 0
  })

  return sorted.map(formatTemplateDto)
}

//  2. Create Custom WhatsApp Template 
export const createWhatsAppTemplate = async (
  input: {
    name: string
    title: string
    category?: any
    language?: string
    headerType?: any
    headerText?: string
    bodyText: string
    footerText?: string
    buttons?: any[]
    variables?: string[]
  },
  caller: IUser
): Promise<WhatsAppTemplateDto> => {
  const brokerageId = caller.brokerageId

  const template = await WhatsAppTemplate.create({
    ...input,
    brokerageId,
    createdBy: caller._id,
    status: 'APPROVED',
  })

  return formatTemplateDto(template)
}

// 3. Send Single WhatsApp Message 
export const sendWhatsAppMessage = async (
  input: SendWhatsAppInput,
  caller: IUser,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; messageId: string; messageRecord?: any }> => {
  const brokerageId = caller.brokerageId
  let contact: IContact | null = null
  let conversation: IConversation | null = null

  // 1. Resolve Conversation if conversationId provided
  if (input.conversationId && mongoose.Types.ObjectId.isValid(input.conversationId)) {
    conversation = await Conversation.findOne({ _id: input.conversationId, brokerageId })
    if (conversation && caller.role === USER_ROLES.SUPER_ADMIN) {
      if (!conversation.assignedAgentId || conversation.assignedAgentId.toString() !== caller._id.toString()) {
        throw new Error('Access denied: Super Admin is restricted from sending WhatsApp messages on behalf of other users.')
      }
    }
    if (conversation?.contactId) {
      contact = await Contact.findOne({ _id: conversation.contactId, brokerageId })
    }
  }

  // 2. Resolve Contact if contactId or toPhone provided
  if (!contact && input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
    contact = await Contact.findOne({ _id: input.contactId, brokerageId })
  } else if (!contact && input.toPhone) {
    const cleanPhone = input.toPhone.replace(/\D/g, '')
    const searchDigits = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone
    contact = await Contact.findOne({ brokerageId, phone: { $regex: searchDigits } })
  }

  const destinationPhone = contact?.phone || conversation?.contactPhone || input.toPhone || ''
  if (!destinationPhone) {
    throw new Error('Destination phone number is required')
  }

  // Check Opt-Out / DNC Status
  if (contact?.tags?.some((t) => ['DNC', 'dnc', 'opt_out', 'Opt-Out'].includes(t))) {
    throw new Error('Contact has opted out of WhatsApp/SMS communications (DNC/Opt-Out active)')
  }

  let finalBody = input.text || ''
  let sendResult

  if (input.type === 'template' && input.templateName) {
    const tmpl = await WhatsAppTemplate.findOne({ brokerageId, name: input.templateName })
    let rendered = tmpl?.bodyText || ''

    if (input.templateVariables) {
      for (const [k, v] of Object.entries(input.templateVariables)) {
        rendered = rendered.replace(new RegExp(`{{${k}}}`, 'g'), String(v ?? ''))
      }
    }
    finalBody = rendered

    // Format Meta components if template variables are defined
    const components: any[] = []
    if (tmpl && tmpl.variables && tmpl.variables.length > 0 && input.templateVariables) {
      const parameters = tmpl.variables.map((varName) => ({
        type: 'text',
        text: String(input.templateVariables?.[varName] || ''),
      }))
      components.push({
        type: 'body',
        parameters,
      })
    }

    sendResult = await whatsAppProvider.sendTemplateMessage(
      destinationPhone,
      input.templateName,
      input.languageCode || tmpl?.language || 'en_US',
      components,
      { brokerageId }
    )
  } else if (input.type === 'media' && input.mediaUrl && input.mediaType) {
    sendResult = await whatsAppProvider.sendMediaMessage(
      destinationPhone,
      input.mediaType,
      input.mediaUrl,
      input.caption,
      { brokerageId }
    )
    finalBody = input.caption ? `[Attachment: ${input.mediaType}] ${input.caption}` : `[Attachment: ${input.mediaType}]`
  } else {
    sendResult = await whatsAppProvider.sendTextMessage(destinationPhone, finalBody, {
      previewUrl: input.previewUrl,
      brokerageId,
    })
  }

  // Find or Create Conversation Thread
  if (!conversation && contact) {
    conversation = await Conversation.findOne({ brokerageId, contactId: contact._id })
  }

  if (!conversation) {
    conversation = await Conversation.create({
      brokerageId,
      contactId: contact?._id,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : destinationPhone,
      contactPhone: destinationPhone,
      contactEmail: contact?.email || '',
      assignedAgentId: caller._id,
      lastMessageText: finalBody,
      lastMessageAt: new Date(),
      lastChannel: 'whatsapp',
      unreadCount: 0,
    })
  } else {
    conversation.lastMessageText = finalBody
    conversation.lastMessageAt = new Date()
    conversation.lastChannel = 'whatsapp'
    await conversation.save()
  }

  // Persist Message Record
  const messageDoc = await Message.create({
    brokerageId,
    conversationId: conversation._id,
    contactId: contact?._id,
    sender: 'agent',
    senderId: caller._id,
    senderName: `${caller.firstName} ${caller.lastName}`,
    channel: 'whatsapp',
    body: finalBody,
    direction: 'outbound',
    deliveryStatus: sendResult.status || 'delivered',
    mediaUrl: input.mediaUrl,
    mediaType: input.mediaType,
  })

  // Log Activity Timeline
  if (contact) {
    await Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'whatsapp',
      description: `Dispatched WhatsApp message: "${finalBody.slice(0, 80)}..."`,
      metadata: {
        messageId: sendResult.messageId,
        channel: 'whatsapp',
        templateName: input.templateName,
      },
      createdBy: caller._id,
      createdByName: `${caller.firstName} ${caller.lastName}`,
    })
  }

  // Broadcast Real-Time Socket Event
  const io = getSocketServer()
  if (io) {
    io.to(`brokerage:${brokerageId.toString()}`).emit('message:new', {
      conversationId: conversation._id.toString(),
      message: {
        id: messageDoc._id.toString(),
        conversationId: conversation._id.toString(),
        body: finalBody,
        channel: 'whatsapp',
        senderType: 'agent',
        senderName: `${caller.firstName} ${caller.lastName}`,
        createdAt: messageDoc.createdAt.toISOString(),
        mediaUrl: input.mediaUrl,
      },
    })
  }

  if (ipAddress) {
    await logAuditEvent({
      action: 'whatsapp.message_sent',
      userId: caller._id.toString(),
      resource: 'WhatsAppMessage',
      resourceId: sendResult.messageId,
      details: {
        to: destinationPhone,
        type: input.type,
        template: input.templateName,
      },
      ipAddress,
      userAgent: userAgent || '',
    })
  }

  return {
    success: true,
    messageId: sendResult.messageId,
  }
}

// ── 4. Inbound Meta Webhook Message Processor ────────────
export const processInboundWebhook = async (rawPayload: any): Promise<{ processedCount: number }> => {
  const parsedMessages: ParsedInboundWhatsAppMessage[] = whatsAppProvider.parseWebhookPayload(rawPayload)

  if (parsedMessages.length === 0) {
    return { processedCount: 0 }
  }

  // Multi-tenant resolution: Extract phone_number_id from Meta webhook metadata
  const phoneNumberId = rawPayload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
  let targetBrokerageId: mongoose.Types.ObjectId | undefined
  if (phoneNumberId) {
    const matchedBrokerage = await Brokerage.findOne({ 'whatsappConfig.phoneNumberId': phoneNumberId }).lean()
    if (matchedBrokerage) {
      targetBrokerageId = matchedBrokerage._id as mongoose.Types.ObjectId
    }
  }

  for (const msg of parsedMessages) {
    const rawFrom = msg.from.replace(/\D/g, '')
    const phoneSuffix = rawFrom.slice(-10)

    // 1. Look up active contact first
    let contact = await Contact.findOne({
      phone: { $regex: phoneSuffix },
      isDeleted: { $ne: true },
      ...(targetBrokerageId ? { brokerageId: targetBrokerageId } : {}),
    })

    // 2. If not found in active contacts, check if contact was previously soft-deleted or archived
    if (!contact) {
      contact = await Contact.findOne({
        phone: { $regex: phoneSuffix },
        ...(targetBrokerageId ? { brokerageId: targetBrokerageId } : {}),
      }).sort({ createdAt: 1 })

      if (contact) {
        // Automatically restore contact since they are messaging back
        contact.isDeleted = false
        contact.status = 'active'
        contact.dncStatus = 'clean'
        contact.optedOutAt = undefined
        await contact.save()
        logger.info(`Restored existing Contact ${contact._id} (${contact.firstName} ${contact.lastName}) upon receiving inbound WhatsApp`)
      }
    }

    let brokerageId = targetBrokerageId || contact?.brokerageId

    // Fallback: If no brokerage found yet, use the first active brokerage
    if (!brokerageId) {
      const defaultBrokerage = await Brokerage.findOne({ isActive: true }).lean()
      if (defaultBrokerage) {
        brokerageId = defaultBrokerage._id as mongoose.Types.ObjectId
      }
    }

    if (!brokerageId) {
      logger.warn(`Inbound WhatsApp dropped: Could not resolve brokerage for phone +${rawFrom}`)
      continue
    }

    // Auto-create Contact if first-time lead texting in
    if (!contact) {
      const nameParts = (msg.senderName || `WhatsApp Lead (${rawFrom.slice(-4)})`).trim().split(/\s+/)
      const firstName = nameParts[0] || 'WhatsApp'
      const lastName = nameParts.slice(1).join(' ') || `Lead (${rawFrom.slice(-4)})`

      contact = await Contact.create({
        brokerageId,
        firstName,
        lastName,
        phone: rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`,
        status: 'active',
        leadScore: 50,
        leadSource: 'whatsapp_inbound',
        tags: ['WhatsApp Lead', 'Inbound'],
      })
      logger.info(`Created new Lead ${contact._id} (${firstName} ${lastName}) from inbound WhatsApp +${rawFrom}`)
    }

    const bodyText = msg.text || msg.caption || `[Received WhatsApp ${msg.type}]`
    const isOptOut = /^(stop|unsubscribe|cancel|quit|opt-out|optout)$/i.test(bodyText.trim())

    if (contact) {
      // Handle Opt-Out Keyword
      if (isOptOut) {
        if (!contact.tags) contact.tags = []
        if (!contact.tags.includes('DNC')) contact.tags.push('DNC')
        if (!contact.tags.includes('Opt-Out')) contact.tags.push('Opt-Out')
        contact.status = 'do_not_contact'
        contact.dncStatus = 'opted_out'
        contact.optedOutAt = new Date()
        await contact.save()
        logger.info(`Contact ${contact._id} opted out via WhatsApp reply STOP`)
      }

      // Find or create conversation (search by contactId OR phone suffix)
      let conversation = await Conversation.findOne({
        $or: [
          { contactId: contact._id },
          { contactPhone: { $regex: phoneSuffix } }
        ],
        brokerageId,
      }).sort({ updatedAt: -1 })

      if (!conversation) {
        conversation = await Conversation.create({
          brokerageId,
          contactId: contact._id,
          contactName: `${contact.firstName} ${contact.lastName}`.trim(),
          contactPhone: contact.phone || (rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`),
          contactEmail: contact.email || '',
          lastMessageText: bodyText,
          lastMessageAt: new Date(),
          lastChannel: 'whatsapp',
          unreadCount: 1,
          aiIsaEnabled: false,
        })
      } else {
        conversation.contactId = contact._id
        conversation.contactName = `${contact.firstName} ${contact.lastName}`.trim()
        conversation.contactPhone = contact.phone || conversation.contactPhone
        conversation.lastMessageText = bodyText
        conversation.lastMessageAt = new Date()
        conversation.lastChannel = 'whatsapp'
        conversation.unreadCount = (conversation.unreadCount || 0) + 1
        await conversation.save()
      }

      // Save Message
      const messageDoc = await Message.create({
        brokerageId,
        conversationId: conversation._id,
        contactId: contact._id,
        sender: 'lead',
        senderName: `${contact.firstName} ${contact.lastName}`.trim(),
        channel: 'whatsapp',
        body: bodyText,
        direction: 'inbound',
        deliveryStatus: 'delivered',
        mediaUrl: msg.mediaUrl,
        mediaType: msg.type,
      })

      // Log Activity
      await Activity.create({
        contactId: contact._id,
        brokerageId,
        type: 'whatsapp',
        description: `Inbound WhatsApp from lead: "${bodyText.slice(0, 80)}..."`,
        metadata: {
          messageId: msg.messageId,
          channel: 'whatsapp',
        },
      })

      // Socket.io real-time alert with comprehensive room delivery
      const io = getSocketServer()
      if (io) {
        const payload = {
          conversationId: conversation._id.toString(),
          message: {
            id: messageDoc._id.toString(),
            _id: messageDoc._id.toString(),
            conversationId: conversation._id.toString(),
            contactId: contact._id.toString(),
            body: bodyText,
            channel: 'whatsapp',
            sender: 'lead',
            senderType: 'lead',
            senderName: `${contact.firstName} ${contact.lastName}`.trim(),
            direction: 'inbound',
            deliveryStatus: 'delivered',
            createdAt: messageDoc.createdAt.toISOString(),
            mediaUrl: msg.mediaUrl,
            mediaType: msg.type,
          },
        }

        io.to(`brokerage:${brokerageId.toString()}`).emit('message:new', payload)
        io.to(`conversation:${conversation._id.toString()}`).emit('message:new', payload)
        io.emit('message:new', payload)

        io.to(`brokerage:${brokerageId.toString()}`).emit('conversation:updated', {
          conversationId: conversation._id.toString(),
        })
        io.emit('conversation:updated', {
          conversationId: conversation._id.toString(),
        })

        io.to(`brokerage:${brokerageId.toString()}`).emit('notification:new', {
          id: `notif_${Date.now()}`,
          title: '💬 New WhatsApp Message',
          message: `${contact.firstName} ${contact.lastName}: "${bodyText.slice(0, 60)}"`,
          type: 'message',
          link: '/inbox',
          createdAt: new Date().toISOString(),
        })
      }

      // AI ISA Autonomous Trigger if enabled and not an opt-out
      if (!isOptOut && conversation.aiIsaEnabled) {
        handleInboundLeadChat({
          conversationId: conversation._id.toString(),
          contactId: contact._id.toString(),
          inboundText: bodyText,
          channel: 'whatsapp',
        }).catch((err: any) => {
          logger.error('Failed to trigger AI ISA for inbound WhatsApp:', err)
        })
      }
    }
  }

  return { processedCount: parsedMessages.length }
}

// ── 5. WhatsApp Broadcast Campaign Engine ────────────────
export const createAndExecuteBroadcast = async (
  input: CreateBroadcastInput,
  caller: IUser
): Promise<WhatsAppBroadcastDto> => {
  const brokerageId = caller.brokerageId

  // Determine Target Contacts Filter
  const filter: Record<string, any> = { brokerageId, isDeleted: false, phone: { $exists: true, $ne: '' } }

  if (input.targetAudience === 'dormant') {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    filter.$or = [{ lastContactedAt: { $lt: ninetyDaysAgo } }, { lastContactedAt: { $exists: false } }]
  } else if (input.targetAudience === 'high_score') {
    filter.leadScore = { $gte: 75 }
  } else if (input.targetAudience === 'buyers') {
    filter.propertyInterests = { $exists: true, $ne: [] }
  } else if (input.targetAudience === 'custom_tag' && input.targetTag) {
    filter.tags = input.targetTag
  }

  const targetContacts = (await Contact.find(filter).limit(200).lean()) as unknown as IContact[]

  const tmpl = await WhatsAppTemplate.findOne({ brokerageId, name: input.templateName })

  const broadcast = await WhatsAppBroadcast.create({
    brokerageId,
    title: input.title,
    templateId: tmpl?._id,
    templateName: input.templateName,
    targetAudience: input.targetAudience,
    targetTag: input.targetTag,
    recipientCount: targetContacts.length,
    status: 'processing',
    customVariables: input.customVariables || {},
    scheduledAt: new Date(),
    createdBy: caller._id,
  })

  // Execute Sends Asynchronously in background
  let sent = 0
  let failed = 0

  for (const c of targetContacts) {
    if (c.tags?.some((t) => ['DNC', 'dnc', 'opt_out'].includes(t))) {
      failed++
      continue
    }

    try {
      await sendWhatsAppMessage(
        {
          contactId: c._id.toString(),
          type: 'template',
          templateName: input.templateName,
          templateVariables: {
            firstName: c.firstName,
            propertyAddress: c.propertyInterests?.[0] || '120 Ocean View Dr',
            estimatedValue: '$875,000',
            cmaLink: 'https://proppulse.io/cma',
            ...(input.customVariables || {}),
          },
        },
        caller
      )
      sent++
    } catch {
      failed++
    }
  }

  broadcast.sentCount = sent
  broadcast.deliveredCount = sent
  broadcast.failedCount = failed
  broadcast.status = 'completed'
  broadcast.completedAt = new Date()
  await broadcast.save()

  return formatBroadcastDto(broadcast)
}

// ── 6. Get Broadcast History ────────────────────────────
export const getWhatsAppBroadcasts = async (
  tenantFilter: Record<string, any>,
  caller?: IUser
): Promise<WhatsAppBroadcastDto[]> => {
  const brokerageId = caller?.brokerageId || tenantFilter?.brokerageId
  const filter = brokerageId ? { brokerageId } : tenantFilter
  const list = (await WhatsAppBroadcast.find(filter).sort({ createdAt: -1 }).limit(50).lean()) as unknown as IWhatsAppBroadcast[]
  return list.map(formatBroadcastDto)
}

// ── 7. Get Tenant WhatsApp Configuration ────────────────
export const getTenantWhatsAppConfig = async (brokerageId: string | mongoose.Types.ObjectId) => {
  const brokerage = await Brokerage.findById(brokerageId).select('+whatsappConfig.accessTokenEncrypted').lean()
  if (!brokerage) {
    throw new Error('Brokerage not found')
  }

  const config = brokerage.whatsappConfig || { status: 'disconnected' }
  const hasTokenConfigured = Boolean(config.accessTokenEncrypted)
  const isUsingSystemFallback = !hasTokenConfigured && whatsAppProvider.isLiveMode()

  return {
    wabaId: config.wabaId || '',
    phoneNumberId: config.phoneNumberId || '',
    displayPhoneNumber: config.displayPhoneNumber || '',
    qualityRating: config.qualityRating || 'UNKNOWN',
    tier: config.tier || 'TIER_1K',
    status: config.status || 'disconnected',
    verifiedName: config.verifiedName || '',
    lastTestedAt: config.lastTestedAt || null,
    hasTokenConfigured,
    isUsingSystemFallback,
  }
}

// ── 8. Update Tenant WhatsApp Configuration ─────────────
export const updateTenantWhatsAppConfig = async (
  brokerageId: string | mongoose.Types.ObjectId,
  input: {
    wabaId?: string
    phoneNumberId?: string
    displayPhoneNumber?: string
    accessToken?: string
  }
) => {
  const brokerage = await Brokerage.findById(brokerageId)
  if (!brokerage) {
    throw new Error('Brokerage not found')
  }

  if (!brokerage.whatsappConfig) {
    brokerage.whatsappConfig = { status: 'disconnected' }
  }

  if (input.wabaId !== undefined) brokerage.whatsappConfig.wabaId = input.wabaId.trim()
  if (input.phoneNumberId !== undefined) brokerage.whatsappConfig.phoneNumberId = input.phoneNumberId.trim()
  if (input.displayPhoneNumber !== undefined) brokerage.whatsappConfig.displayPhoneNumber = input.displayPhoneNumber.trim()

  if (input.accessToken && input.accessToken.trim()) {
    const cleanToken = input.accessToken.trim()
    const phoneId = input.phoneNumberId?.trim() || brokerage.whatsappConfig.phoneNumberId

    if (!phoneId) {
      throw new Error('Phone Number ID is required when connecting an Access Token')
    }

    // Verify token with Meta Graph API
    const verifyRes = await whatsAppProvider.verifyConnection(phoneId, cleanToken)
    if (!verifyRes.success) {
      throw new Error(`Meta verification failed: ${verifyRes.error || 'Invalid credentials'}`)
    }

    // Auto-subscribe WABA to App Webhook events
    const wabaId = input.wabaId?.trim() || brokerage.whatsappConfig.wabaId
    if (wabaId) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cleanToken}` },
        })
        logger.info(`WABA ${wabaId} successfully subscribed to App Webhooks`)
      } catch (err: any) {
        logger.warn(`Failed to auto-subscribe WABA ${wabaId} to webhooks: ${err?.message}`)
      }
    }

    brokerage.whatsappConfig.accessTokenEncrypted = encrypt(cleanToken)
    brokerage.whatsappConfig.status = 'connected'
    brokerage.whatsappConfig.verifiedName = verifyRes.verifiedName || ''
    if (verifyRes.displayPhoneNumber) brokerage.whatsappConfig.displayPhoneNumber = verifyRes.displayPhoneNumber
    if (verifyRes.qualityRating) brokerage.whatsappConfig.qualityRating = verifyRes.qualityRating as any
    brokerage.whatsappConfig.lastTestedAt = new Date()
  }

  await brokerage.save()
  return getTenantWhatsAppConfig(brokerageId)
}

// ── 9. Test Tenant WhatsApp Connection ──────────────────
export const testTenantWhatsAppConnection = async (
  brokerageId: string | mongoose.Types.ObjectId,
  testPhone?: string
) => {
  const credentials = await whatsAppProvider.resolveTenantCredentials(brokerageId)
  if (!credentials.phoneNumberId || !credentials.token) {
    throw new Error('No WhatsApp credentials configured for this brokerage')
  }

  const verifyRes = await whatsAppProvider.verifyConnection(credentials.phoneNumberId, credentials.token)
  if (!verifyRes.success) {
    throw new Error(`Meta connection failed: ${verifyRes.error}`)
  }

  const brokerage = await Brokerage.findById(brokerageId)
  if (brokerage && brokerage.whatsappConfig) {
    // Ensure WABA is subscribed to webhooks
    if (brokerage.whatsappConfig.wabaId && credentials.token) {
      try {
        await fetch(`https://graph.facebook.com/v19.0/${brokerage.whatsappConfig.wabaId}/subscribed_apps`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${credentials.token}` },
        })
      } catch (e: any) {
        logger.warn(`Failed to subscribe WABA on test: ${e?.message}`)
      }
    }

    brokerage.whatsappConfig.verifiedName = verifyRes.verifiedName || brokerage.whatsappConfig.verifiedName
    if (verifyRes.qualityRating) brokerage.whatsappConfig.qualityRating = verifyRes.qualityRating as any
    brokerage.whatsappConfig.lastTestedAt = new Date()
    await brokerage.save()
  }

  let handshakeResult = null
  if (testPhone && testPhone.trim()) {
    handshakeResult = await whatsAppProvider.sendTextMessage(
      testPhone.trim(),
      `🚀 PropPulse WhatsApp Integration Test: Connected successfully to ${verifyRes.verifiedName || 'your brokerage'}!`,
      { brokerageId }
    )
  }

  return {
    success: true,
    verifiedName: verifyRes.verifiedName,
    displayPhoneNumber: verifyRes.displayPhoneNumber,
    qualityRating: verifyRes.qualityRating,
    handshakeResult,
    message: `Connected successfully to Meta WhatsApp Cloud API! Verified Account: "${verifyRes.verifiedName || 'Business WABA'}"`,
  }
}

// ── 10. Disconnect Tenant WhatsApp ──────────────────────
export const disconnectTenantWhatsApp = async (brokerageId: string | mongoose.Types.ObjectId) => {
  const brokerage = await Brokerage.findById(brokerageId)
  if (!brokerage) throw new Error('Brokerage not found')

  if (brokerage.whatsappConfig) {
    brokerage.whatsappConfig.status = 'disconnected'
    brokerage.whatsappConfig.accessTokenEncrypted = undefined
    await brokerage.save()
  }

  return { success: true, message: 'WhatsApp integration disconnected' }
}
