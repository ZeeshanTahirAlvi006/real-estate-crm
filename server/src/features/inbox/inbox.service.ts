import mongoose from 'mongoose'
import { Conversation, IConversation } from '../../models/Conversation.js'
import { Message, IMessage } from '../../models/Message.js'
import { Contact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS, USER_ROLES } from '../../utils/constants.js'
import { emitNewMessage } from '../../config/socket.js'
import { whatsAppProvider } from '../communication/providers/whatsapp.provider.js'
import { emailProvider } from '../communication/providers/email.provider.js'
import {
  ConversationDto,
  MessageDto,
  SendMessageInput,
  StartConversationInput,
  ListConversationsQuery,
} from './inbox.types.js'

// Format DTOs
export const formatConversationDto = (c: any): ConversationDto => {
  const contact = typeof c.contactId === 'object' && c.contactId ? c.contactId : null
  const contactIdStr = contact?._id ? contact._id.toString() : (c.contactId ? c.contactId.toString() : '')
  const leadScore = contact?.leadScore ?? c.leadScore ?? 50
  const dncStatus = contact?.dncStatus ?? c.dncStatus ?? 'clean'

  return {
    id: c._id ? c._id.toString() : c.id,
    contactId: contactIdStr,
    contactName: c.contactName,
    contactPhone: c.contactPhone || contact?.phone || '',
    contactEmail: c.contactEmail || contact?.email,
    contactAvatar: c.contactAvatar,
    assignedAgentId: c.assignedAgentId?.toString(),
    assignedAgentName: c.assignedAgentName,
    lastMessageText: c.lastMessageText || '',
    lastMessageAt: c.lastMessageAt ? (typeof c.lastMessageAt === 'string' ? c.lastMessageAt : new Date(c.lastMessageAt).toISOString()) : new Date().toISOString(),
    lastChannel: c.lastChannel || 'whatsapp',
    unreadCount: c.unreadCount || 0,
    aiIsaEnabled: c.aiIsaEnabled !== false,
    status: c.status || 'active',
    tags: c.tags || [],
    leadScore,
    dncStatus,
    createdAt: c.createdAt ? (typeof c.createdAt === 'string' ? c.createdAt : new Date(c.createdAt).toISOString()) : new Date().toISOString(),
    updatedAt: c.updatedAt ? (typeof c.updatedAt === 'string' ? c.updatedAt : new Date(c.updatedAt).toISOString()) : new Date().toISOString(),
  }
}

export const formatMessageDto = (m: IMessage): MessageDto => ({
  id: m._id.toString(),
  conversationId: m.conversationId.toString(),
  contactId: m.contactId.toString(),
  sender: m.sender,
  senderName: m.senderName,
  senderId: m.senderId?.toString(),
  channel: m.channel,
  body: m.body,
  direction: m.direction,
  deliveryStatus: m.deliveryStatus,
  fairHousingFlags: m.fairHousingFlags,
  createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
  updatedAt: m.updatedAt ? m.updatedAt.toISOString() : new Date().toISOString(),
})

// Check tenant access
const verifyTenantAccess = (caller: IUser, brokerageId: mongoose.Types.ObjectId | string) => {
  if (caller.role === USER_ROLES.SUPER_ADMIN) return true
  return caller.brokerageId.toString() === brokerageId.toString()
}

// 1. List Conversations
export const listConversations = async (
  caller: IUser,
  query: ListConversationsQuery,
  tenantFilter: Record<string, any>
): Promise<{ conversations: ConversationDto[]; total: number }> => {
  const filter: Record<string, any> = { ...tenantFilter }

  if (query.channel && query.channel !== 'all') {
    filter.lastChannel = query.channel
  }

  if (query.status) {
    filter.status = query.status
  }

  if (query.search?.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i')
    filter.$or = [
      { contactName: searchRegex },
      { contactPhone: searchRegex },
      { contactEmail: searchRegex },
      { lastMessageText: searchRegex },
    ]
  }

  // If user is lead/client, they only see their own conversation
  if (caller.role === USER_ROLES.LEAD) {
    filter.$or = [
      { contactEmail: caller.email },
      { contactPhone: caller.phone },
    ]
  } else if (caller.role === USER_ROLES.AGENT) {
    // If user is agent, they see conversations assigned to them or their brokerage
    filter.$or = [
      ...(filter.$or || []),
      { assignedAgentId: caller._id },
      { assignedAgentId: { $exists: false } },
      { assignedAgentId: null },
    ]
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .populate('contactId', 'leadScore dncStatus email phone')
      .sort({ lastMessageAt: -1 })
      .limit(Number(query.limit) || 50)
      .lean(),
    Conversation.countDocuments(filter),
  ])

  return {
    conversations: (conversations as unknown as IConversation[]).map(formatConversationDto),
    total,
  }
}

// 2. Get Messages for Conversation
export const getMessages = async (
  conversationId: string,
  caller: IUser,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: MessageDto[]; total: number }> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', HTTP_STATUS.BAD_REQUEST)
  }

  const conv = await Conversation.findById(conversationId)
  if (!conv) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyTenantAccess(caller, conv.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const skip = (page - 1) * limit
  const [messages, total] = await Promise.all([
    Message.find({ conversationId: conv._id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ conversationId: conv._id }),
  ])

  return {
    messages: (messages as unknown as IMessage[]).map(formatMessageDto),
    total,
  }
}

// 3. Send Message
export const sendMessage = async (
  conversationId: string,
  input: SendMessageInput,
  caller: IUser
): Promise<MessageDto> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', HTTP_STATUS.BAD_REQUEST)
  }

  const conv = await Conversation.findById(conversationId)
  if (!conv) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyTenantAccess(caller, conv.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  const channel = input.channel || conv.lastChannel || 'sms'
  const isLeadCaller = caller.role === USER_ROLES.LEAD

  const message = await Message.create({
    conversationId: conv._id,
    brokerageId: conv.brokerageId,
    contactId: conv.contactId,
    sender: isLeadCaller ? 'lead' : 'agent',
    senderName: `${caller.firstName} ${caller.lastName}`,
    senderId: caller._id,
    channel,
    body: input.body,
    direction: isLeadCaller ? 'inbound' : 'outbound',
    deliveryStatus: 'delivered',
    fairHousingFlags: input.fairHousingFlags || [],
  })

  // Update conversation
  conv.lastMessageText = input.body
  conv.lastMessageAt = new Date()
  conv.lastChannel = channel
  await conv.save()

  // Timeline Activity
  await Activity.create({
    contactId: conv.contactId,
    brokerageId: conv.brokerageId,
    type: channel as any,
    description: `Sent ${channel.toUpperCase()} message: "${input.body.slice(0, 80)}${input.body.length > 80 ? '...' : ''}"`,
    metadata: {
      conversationId: conv._id.toString(),
      messageId: message._id.toString(),
      channel,
    },
    createdBy: caller._id,
    createdByName: `${caller.firstName} ${caller.lastName}`,
  })

  const formattedMsg = formatMessageDto(message)
  const formattedConv = formatConversationDto(conv)

  // Real-time broadcast
  emitNewMessage(formattedMsg, formattedConv)

  // Live WhatsApp Gateway Transmission
  if (channel === 'whatsapp' && !isLeadCaller) {
    let destPhone = conv.contactPhone
    if (!destPhone) {
      const contactDoc = await Contact.findById(conv.contactId)
      destPhone = contactDoc?.phone || ''
    }
    if (destPhone) {
      whatsAppProvider
        .sendTextMessage(destPhone, input.body, { brokerageId: conv.brokerageId })
        .catch((err) => {
          console.error('Failed to send live WhatsApp text message:', err)
        })
    }
  }

  // Live Email Gateway Transmission (Gmail SMTP)
  if (channel === 'email' && !isLeadCaller && conv.contactEmail) {
    emailProvider.send({
      to: conv.contactEmail,
      subject: `Update regarding your property inquiry`,
      text: input.body,
    }).catch((err) => {
      console.error('Failed to send live email message:', err)
    })
  }

  // AI ISA Autonomous Response Simulation
  if (conv.aiIsaEnabled && isLeadCaller) {
    scheduleAiIsaResponse(conv)
  }

  return formattedMsg
}

// 4. Mark Conversation as Read
export const markConversationRead = async (
  conversationId: string,
  caller: IUser
): Promise<ConversationDto> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', HTTP_STATUS.BAD_REQUEST)
  }

  const conv = await Conversation.findById(conversationId)
  if (!conv) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyTenantAccess(caller, conv.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  conv.unreadCount = 0
  await conv.save()

  await Message.updateMany(
    { conversationId: conv._id, deliveryStatus: { $ne: 'read' } },
    { deliveryStatus: 'read' }
  )

  const formatted = formatConversationDto(conv)
  return formatted
}

// 5. Toggle AI ISA Assistant
export const toggleAiIsa = async (
  conversationId: string,
  enabled: boolean,
  caller: IUser
): Promise<ConversationDto> => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation ID', HTTP_STATUS.BAD_REQUEST)
  }

  const conv = await Conversation.findById(conversationId)
  if (!conv) throw new AppError('Conversation not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyTenantAccess(caller, conv.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  conv.aiIsaEnabled = enabled
  await conv.save()

  return formatConversationDto(conv)
}

// 6. Start or Find Conversation with Contact
export const startConversation = async (
  input: StartConversationInput,
  caller: IUser
): Promise<ConversationDto> => {
  if (!mongoose.Types.ObjectId.isValid(input.contactId)) {
    throw new AppError('Invalid contact ID', HTTP_STATUS.BAD_REQUEST)
  }

  const contact = await Contact.findById(input.contactId)
  if (!contact) throw new AppError('Contact not found', HTTP_STATUS.NOT_FOUND)
  if (!verifyTenantAccess(caller, contact.brokerageId)) {
    throw new AppError('Access denied', HTTP_STATUS.FORBIDDEN)
  }

  let conv = await Conversation.findOne({
    contactId: contact._id,
    brokerageId: contact.brokerageId,
  })

  if (!conv) {
    conv = await Conversation.create({
      brokerageId: contact.brokerageId,
      contactId: contact._id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      contactPhone: contact.phone,
      contactEmail: contact.email,
      assignedAgentId: contact.assignedAgentId || caller._id,
      assignedAgentName: `${caller.firstName} ${caller.lastName}`,
      lastMessageText: input.initialMessage || 'Conversation initiated',
      lastMessageAt: new Date(),
      lastChannel: input.channel || 'sms',
      unreadCount: 0,
      aiIsaEnabled: true,
      status: 'active',
      tags: contact.tags || [],
    })
  }

  if (input.initialMessage) {
    const msg = await Message.create({
      conversationId: conv._id,
      brokerageId: conv.brokerageId,
      contactId: conv.contactId,
      sender: 'agent',
      senderName: `${caller.firstName} ${caller.lastName}`,
      senderId: caller._id,
      channel: input.channel || 'sms',
      body: input.initialMessage,
      direction: 'outbound',
      deliveryStatus: 'delivered',
    })

    conv.lastMessageText = input.initialMessage
    conv.lastMessageAt = new Date()
    await conv.save()

    emitNewMessage(
      formatMessageDto(msg),
      formatConversationDto({ ...conv.toObject(), contactId: contact })
    )
  }

  return formatConversationDto({ ...conv.toObject(), contactId: contact })
}

// 7. AI ISA Response Simulation Engine
const AI_RESPONSES = [
  "Thanks for checking in! Yes, we're definitely looking for a 4-bed home in Austin with a good backyard. Budget is around $650k.",
  "Hi! We are pre-approved with Wells Fargo and hoping to close before October. Would Saturday at 2 PM work for a walkthrough?",
  "Sounds great! We also need to sell our current condo in Round Rock first. Could you send us an estimate of what it might be worth?",
  "Yes, we received the property list. 742 Evergreen Terrace looks like our top choice! Can we submit an initial offer?",
]

const scheduleAiIsaResponse = (conv: IConversation) => {
  setTimeout(async () => {
    try {
      const freshConv = await Conversation.findById(conv._id)
      if (!freshConv || !freshConv.aiIsaEnabled) return

      // Pick contextual or rotating response
      const replyBody = AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)]

      const replyMsg = await Message.create({
        conversationId: freshConv._id,
        brokerageId: freshConv.brokerageId,
        contactId: freshConv.contactId,
        sender: 'lead',
        senderName: freshConv.contactName,
        channel: freshConv.lastChannel,
        body: replyBody,
        direction: 'inbound',
        deliveryStatus: 'delivered',
      })

      freshConv.lastMessageText = replyBody
      freshConv.lastMessageAt = new Date()
      freshConv.unreadCount = (freshConv.unreadCount || 0) + 1
      await freshConv.save()

      await Activity.create({
        contactId: freshConv.contactId,
        brokerageId: freshConv.brokerageId,
        type: freshConv.lastChannel as any,
        description: `Incoming ${freshConv.lastChannel.toUpperCase()} from ${freshConv.contactName}: "${replyBody.slice(0, 80)}"`,
        metadata: {
          conversationId: freshConv._id.toString(),
          messageId: replyMsg._id.toString(),
        },
      })

      emitNewMessage(formatMessageDto(replyMsg), formatConversationDto(freshConv))
    } catch (err) {
      console.error('Failed to dispatch AI ISA simulation response:', err)
    }
  }, 2500)
}
