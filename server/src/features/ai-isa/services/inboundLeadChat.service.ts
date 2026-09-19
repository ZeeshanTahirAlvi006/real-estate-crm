import mongoose from 'mongoose'
import { Contact } from '../../../models/Contact.js'
import { Activity } from '../../../models/Activity.js'
import { Conversation } from '../../../models/Conversation.js'
import { Message } from '../../../models/Message.js'
import { AiIsaConfig, IAiIsaConfig } from '../../../models/AiIsaConfig.js'
import { IUser } from '../../../models/User.js'
import { AppError } from '../../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../../utils/constants.js'
import { logger } from '../../../utils/logger.js'
import { getSocketServer } from '../../../config/socket.js'
import { whatsAppProvider } from '../../communication/providers/whatsapp.provider.js'
import { emailProvider } from '../../communication/providers/email.provider.js'
import { ExtractedCriteriaState } from '../aiIsa.types.js'
import { startTimer } from './aiIsa.common.js'
import { extractCriteriaFromMessage, simulateAiIsaChat } from './aiChatSimulation.service.js'

// --- HELPER: Reconstruct Conversation History ---
const reconstructHistory = async (conversationId: mongoose.Types.ObjectId) => {
  const historyDocs = await Message.find({ conversationId })
    .select('direction sender body createdAt')
    .sort({ createdAt: 1 })
    .limit(16)
    .lean()

  const conversationHistory: Array<{ role: 'lead' | 'assistant'; text: string }> = []
  let accumulatedCriteria: ExtractedCriteriaState = {}

  for (const doc of historyDocs) {
    const isLead = doc.direction === 'inbound' || doc.sender === 'lead'
    conversationHistory.push({
      role: isLead ? 'lead' : 'assistant',
      text: doc.body,
    })
    if (isLead) {
      accumulatedCriteria = extractCriteriaFromMessage(doc.body, accumulatedCriteria)
    }
  }

  return { conversationHistory, accumulatedCriteria }
}

// --- HELPER: Delivery and Side Effects ---
const deliverAiResponse = async (
  result: any,
  contact: any,
  conversation: any,
  channel: 'whatsapp' | 'email',
  config: IAiIsaConfig | null
) => {
  const brokerageId = contact.brokerageId
  const senderName = config?.persona?.name ? `${config.persona.name} (AI ISA)` : 'Sarah Jenkins (AI ISA)'

  // 1. Persist Message Doc
  const messageDoc = await Message.create({
    brokerageId,
    conversationId: conversation._id,
    contactId: contact._id,
    sender: 'agent',
    senderName,
    channel,
    body: result.reply,
    direction: 'outbound',
    deliveryStatus: 'delivered',
  })

  // 2. Atomic Update Conversation Thread
  Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageText: result.reply,
        lastMessageAt: new Date(),
        lastChannel: channel,
        unreadCount: 0,
      },
    }
  ).catch((err) => logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 78] Conversation update log error: ${err.message}`))

  // 3. Emit Real-Time Socket Event to UI Inbox
  const io = getSocketServer()
  if (io) {
    const payload = {
      conversationId: conversation._id.toString(),
      message: {
        id: messageDoc._id.toString(),
        _id: messageDoc._id.toString(),
        conversationId: conversation._id.toString(),
        contactId: contact._id.toString(),
        body: result.reply,
        channel,
        sender: 'agent',
        senderType: 'ai_isa',
        senderName,
        direction: 'outbound',
        deliveryStatus: 'delivered',
        createdAt: messageDoc.createdAt.toISOString(),
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
  }

  // 4. Outbound Provider Delivery (WhatsApp / Email)
  if (channel === 'whatsapp' && contact.phone) {
    whatsAppProvider.sendTextMessage(contact.phone, result.reply, {
      brokerageId: contact.brokerageId,
    }).catch((err: any) => logger.error(`Failed to send outbound WhatsApp reply: ${err?.message}`))
  } else if (channel === 'email' && contact.email) {
    emailProvider.send({
      to: contact.email,
      subject: 'Response regarding your real estate inquiry',
      text: result.reply,
    }).catch((err: any) => logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 123] Failed to send outbound Email reply: ${err?.message}`))
  }

  // 5. Log Activity Timeline (Decoupled)
  Activity.create({
    contactId: contact._id,
    brokerageId,
    type: channel as any,
    description: `AI ISA Autonomous reply sent via ${channel.toUpperCase()}: "${result.reply.slice(0, 80)}..."`,
    metadata: {
      isAiIsa: true,
      conversationId: conversation._id.toString(),
      messageId: messageDoc._id.toString(),
      channel,
      criteria: JSON.stringify(result.extractedCriteria),
    },
    createdByName: `${senderName}`,
  }).catch((err) => logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 140] Inbound chat activity log error: ${err.message}`))
}

export const handleInboundLeadChat = async (input: {
  conversationId: string
  contactId: string
  inboundText: string
  channel: 'whatsapp' | 'email'
}): Promise<void> => {
  const stopTimer = startTimer('handleInboundLeadChat')
  try {
    if (!mongoose.Types.ObjectId.isValid(input.contactId) || !mongoose.Types.ObjectId.isValid(input.conversationId)) {
      stopTimer()
      return
    }

    const contact = await Contact.findById(new mongoose.Types.ObjectId(input.contactId))
      .select('_id brokerageId phone email')
      .lean()
    if (!contact) {
      stopTimer()
      return
    }

    const brokerageId = contact.brokerageId
    const conversation = await Conversation.findById(new mongoose.Types.ObjectId(input.conversationId))
      .select('_id aiIsaEnabled')
      .lean()
    if (!conversation || conversation.aiIsaEnabled === false) {
      stopTimer()
      return
    }

    const config = (await AiIsaConfig.findOne({ brokerageId }).select('isEnabled persona').lean()) as IAiIsaConfig | null
    if (config && config.isEnabled === false) {
      stopTimer()
      return
    }

    const { conversationHistory, accumulatedCriteria } = await reconstructHistory(conversation._id)

    const result = await simulateAiIsaChat(
      {
        leadMessage: input.inboundText,
        contactId: input.contactId,
        conversationHistory,
        currentCriteriaState: accumulatedCriteria,
      },
      { _id: new mongoose.Types.ObjectId(), brokerageId } as any
    )

    if (result.reply) {
      await deliverAiResponse(result, contact, conversation, input.channel, config)
    }
    stopTimer()
  } catch (error) {
    stopTimer()
    logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 197] Inbound chat handler error: ${error}`)
    throw error
  }
}

// --- HELPER: Find or Create Contact for Handshake ---
const findOrCreateContactForHandshake = async (cleanPhone: string, leadName: string, brokerageId: any) => {
  let contact: any = await Contact.findOne({
    brokerageId,
    phone: { $regex: cleanPhone.slice(-10) },
    isDeleted: false,
  }).select('_id firstName lastName phone email').lean()

  if (!contact) {
    const created = await Contact.create({
      firstName: leadName.split(' ')[0] || 'Client',
      lastName: leadName.split(' ').slice(1).join(' ') || 'Lead',
      phone: `+${cleanPhone}`,
      brokerageId,
      leadSource: 'WhatsApp Inbound',
      leadScore: 60,
      tags: ['WHATSAPP_TEST', 'AI_QUALIFIED_PENDING'],
      status: 'active',
      isAcknowledged: true,
    })
    contact = created.toObject()
  }

  if (!contact) {
    throw new AppError('Failed to create or find contact', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return contact
}

// --- HELPER: Find or Create Conversation for Handshake ---
const findOrCreateConversationForHandshake = async (contact: any, caller: IUser) => {
  let conversation: any = await Conversation.findOne({ brokerageId: caller.brokerageId, contactId: contact._id })
    .select('_id')
    .lean()

  if (!conversation) {
    const createdConv = await Conversation.create({
      brokerageId: caller.brokerageId,
      contactId: contact._id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      contactPhone: contact.phone,
      contactEmail: contact.email || '',
      assignedAgentId: caller._id,
      lastMessageText: '',
      lastMessageAt: new Date(),
      lastChannel: 'whatsapp',
      unreadCount: 0,
      aiIsaEnabled: true,
    })
    conversation = createdConv.toObject()
  } else {
    Conversation.updateOne({ _id: conversation._id }, { $set: { aiIsaEnabled: true } })
      .catch((err) => logger.error(`[AI ISA] Conversation update error: ${err.message}`))
  }

  if (!conversation) {
    throw new AppError('Failed to create or find conversation', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  return conversation
}

// --- HELPER: Deliver Handshake Message ---
const deliverHandshakeMessage = async (
  contact: any,
  conversation: any,
  greetingText: string,
  personaName: string,
  caller: IUser
) => {
  let sendResult
  try {
    sendResult = await whatsAppProvider.sendTextMessage(contact.phone, greetingText, { brokerageId: caller.brokerageId })
  } catch (err: any) {
    logger.error(`WhatsApp provider send error: ${err?.message}`)
    sendResult = { messageId: `wamid_sim_${Date.now()}`, status: 'sent' as const, isLive: false }
  }

  const messageDoc = await Message.create({
    brokerageId: caller.brokerageId,
    conversationId: conversation._id,
    contactId: contact._id,
    sender: 'agent',
    senderId: caller._id,
    senderName: `${personaName} (AI ISA)`,
    channel: 'whatsapp',
    body: greetingText,
    direction: 'outbound',
    deliveryStatus: sendResult?.status || 'sent',
  })

  Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessageText: greetingText,
        lastMessageAt: new Date(),
        lastChannel: 'whatsapp',
      },
    }
  ).catch((err) => logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 303] Conversation update error: ${err.message}`))

  const io = getSocketServer()
  if (io) {
    io.to(`brokerage:${caller.brokerageId.toString()}`).emit('message:new', {
      conversationId: conversation._id.toString(),
      message: {
        id: messageDoc._id.toString(),
        conversationId: conversation._id.toString(),
        body: greetingText,
        channel: 'whatsapp',
        senderType: 'agent',
        senderName: `${personaName} (AI ISA)`,
        createdAt: messageDoc.createdAt.toISOString(),
      },
    })
  }

  Activity.create({
    contactId: contact._id,
    brokerageId: caller.brokerageId,
    type: 'whatsapp',
    description: `AI ISA initiated WhatsApp handshake to ${contact.phone}`,
    metadata: { isAiIsa: true },
    createdBy: caller._id,
    createdByName: `${(caller as any).firstName || ''} ${(caller as any).lastName || ''}`.trim() || 'System',
  }).catch((err) => logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 329] Handshake activity log error: ${err.message}`))

  return Boolean(sendResult?.isLive)
}

export const initiateWhatsAppHandshake = async (
  phone: string,
  leadName: string = 'Valued Client',
  caller: IUser
): Promise<{ success: boolean; conversationId: string; contactId: string; message: string; replyText: string }> => {
  const stopTimer = startTimer('initiateWhatsAppHandshake')
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 7) {
      throw new AppError('Please provide a valid phone number with country code (e.g. +1... or +92...)', HTTP_STATUS.BAD_REQUEST)
    }

    const contact = await findOrCreateContactForHandshake(cleanPhone, leadName, caller.brokerageId)
    const conversation = await findOrCreateConversationForHandshake(contact, caller)

    const config = (await AiIsaConfig.findOne({ brokerageId: caller.brokerageId }).select('persona').lean()) as IAiIsaConfig | null
    const personaName = config?.persona?.name || 'Maya'
    const brokerageName = config?.persona?.brokerageName || 'our real estate advisory team'

    const greetingText = `Hi ${contact.firstName}! This is ${personaName} from ${brokerageName}. 🏡 I saw your inquiry about properties in your search area! Are you looking to buy, sell, or explore upcoming exclusive listings?`

    const isLive = await deliverHandshakeMessage(contact, conversation, greetingText, personaName, caller)

    stopTimer()
    return {
      success: true,
      conversationId: conversation._id.toString(),
      contactId: contact._id.toString(),
      message: isLive
        ? `Live WhatsApp message dispatched to ${contact.phone}! Check your phone & text back to chat with AI ISA.`
        : `Note: META_PHONE_NUMBER_ID is missing in server/.env. Handshake created in CRM simulation mode. Add META_PHONE_NUMBER_ID to deliver to your physical phone.`,
      replyText: greetingText,
    }
  } catch (error) {
    stopTimer()
    logger.error(`[server/src/features/ai-isa/services/inboundLeadChat.service.ts: Line 369] Handshake error: ${error}`)
    throw error
  }
}
