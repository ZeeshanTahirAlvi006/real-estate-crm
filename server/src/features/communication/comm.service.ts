import mongoose from 'mongoose'
import { emailProvider } from './providers/email.provider.js'
import { smsProvider } from './providers/sms.provider.js'
import { whatsAppProvider } from './providers/whatsapp.provider.js'
import { voiceProvider } from './providers/voice.provider.js'
import { ICommunicationProvider, ProviderSendResult } from './providers/ICommunicationProvider.js'
import { UnifiedSendInput, QuickTemplateDto, OptOutInput, OptBackInInput } from './comm.types.js'
import { Contact } from '../../models/Contact.js'
import { Conversation } from '../../models/Conversation.js'
import { Message } from '../../models/Message.js'
import { Activity } from '../../models/Activity.js'
import { getSocketServer } from '../../config/socket.js'
import { logger } from '../../utils/logger.js'
import { AppError } from '../../middleware/errorHandler.js'

// In-memory / initial quick templates
export const QUICK_TEMPLATES: QuickTemplateDto[] = [
  {
    id: 'tmpl-1',
    title: 'Initial Property Inquiry Greeting',
    channel: 'all',
    category: 'intro',
    subject: 'Thank you for your property inquiry!',
    body: 'Hi {{firstName}}! Thanks for reaching out regarding property listings in {{neighborhood}}. Are you looking to buy, sell, or invest in the near future?',
    variables: ['firstName', 'neighborhood'],
  },
  {
    id: 'tmpl-2',
    title: 'Schedule In-Person Viewing',
    channel: 'all',
    category: 'showing',
    subject: 'Scheduling private viewing for {{propertyAddress}}',
    body: 'Hi {{firstName}}, I would love to schedule a private tour of {{propertyAddress}} for you. Does tomorrow afternoon or this weekend work best for your schedule?',
    variables: ['firstName', 'propertyAddress'],
  },
  {
    id: 'tmpl-3',
    title: 'Instant CMA Valuation Report',
    channel: 'all',
    category: 'cma',
    subject: 'Your Custom Home Valuation Report',
    body: 'Hi {{firstName}}, I prepared a customized Comparative Market Analysis (CMA) valuation for your home. You can view the live report here: {{cmaLink}}',
    variables: ['firstName', 'cmaLink'],
  },
  {
    id: 'tmpl-4',
    title: 'Follow-Up on Active Interest',
    channel: 'all',
    category: 'followup',
    subject: 'Following up on our recent conversation',
    body: 'Hi {{firstName}}, just following up to see if you had any questions on the latest properties we reviewed together. Let me know if you would like me to adjust any search criteria!',
    variables: ['firstName'],
  },
  {
    id: 'tmpl-5',
    title: 'Pre-Approval Verification',
    channel: 'all',
    category: 'intro',
    subject: 'Financing pre-approval status',
    body: 'Hi {{firstName}}, great connecting! Have you already established pre-approval with a preferred lender, or would you like me to introduce you to one of our trusted financing partners?',
    variables: ['firstName'],
  },
]

export class CommunicationService {
  private providers: Record<string, ICommunicationProvider> = {
    email: emailProvider,
    sms: smsProvider,
    whatsapp: whatsAppProvider,
    voice: voiceProvider,
  }

  public getProvider(channel: string): ICommunicationProvider {
    const provider = this.providers[channel]
    if (!provider) {
      throw new AppError(`Unsupported communication channel: ${channel}`)
    }
    return provider
  }

  /**
   * Replace template placeholders with dynamic variables
   */
  public compileTemplate(text: string, variables?: Record<string, string>): string {
    if (!variables) return text
    let compiled = text
    for (const [key, value] of Object.entries(variables)) {
      compiled = compiled.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''))
    }
    return compiled
  }

  /**
   * Unified Send Message (Email, SMS, WhatsApp, Voice)
   * Enforces DNC checks, records Message & Activity, and updates Conversation in real time
   */
  public async sendUnifiedMessage(
    input: UnifiedSendInput,
    userId: string,
    brokerageId: string,
    senderName: string = 'PropPulse Agent'
  ): Promise<{ success: boolean; messageId: string; status: string; previewUrl?: string }> {
    const channel = input.channel
    const recipient = input.to.trim()
    const compiledText = this.compileTemplate(input.text, input.templateVariables)

    // 1. Contact & DNC Pre-Send Verification Guard
    let contact = null
    if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
      contact = await Contact.findOne({ _id: input.contactId, brokerageId }).lean()
    } else if (channel === 'email') {
      contact = await Contact.findOne({ email: recipient.toLowerCase(), brokerageId }).lean()
    } else {
      contact = await Contact.findOne({ phone: recipient, brokerageId }).lean()
    }

    if (contact) {
      if (contact.dncStatus === 'opted_out') {
        throw new AppError(
          `Recipient has opted out of communication (${contact.phone || contact.email}). TCPA Compliance Guard prevented outbound dispatch.`
        )
      }
      if (contact.dncStatus === 'dnc_federal' || contact.dncStatus === 'dnc_state') {
        throw new AppError(
          `Recipient is registered on the Do Not Call (DNC) registry (${contact.dncStatus.toUpperCase()}). Outbound communication blocked.`
        )
      }
    }

    // 2. Dispatch through Channel Provider
    const provider = this.getProvider(channel)
    const result: ProviderSendResult = await provider.send({
      to: recipient,
      subject: input.subject,
      text: compiledText,
      html: input.html,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
      templateName: input.templateName,
      templateVariables: input.templateVariables,
      brokerageId,
      userId,
      contactId: contact?._id?.toString() || input.contactId,
      conversationId: input.conversationId,
    })

    if (!result.success) {
      throw new AppError(result.error || `Failed to send ${channel} message`)
    }

    // 3. Atomically upsert Conversation and store Message in DB
    const contactId = contact?._id || input.contactId
    let conversationId = input.conversationId

    if (!conversationId && contactId) {
      const existingConvo = await Conversation.findOne({
        contactId,
        brokerageId,
      })

      if (existingConvo) {
        conversationId = existingConvo._id.toString()
      } else {
        const newConvo = await Conversation.create({
          brokerageId,
          contactId,
          channel,
          unreadCount: 0,
          isStarred: false,
          dncStatus: contact?.dncStatus || 'clean',
          aiIsaEnabled: false,
          leadScore: contact?.leadScore || 50,
          tags: contact?.tags || [],
          lastMessage: {
            body: compiledText,
            createdAt: new Date(),
            senderType: 'agent',
            channel,
          },
        })
        conversationId = newConvo._id.toString()
      }
    }

    // Create Message record
    const messageDoc = await Message.create({
      brokerageId,
      conversationId: conversationId || new mongoose.Types.ObjectId(),
      contactId,
      senderId: userId,
      senderName,
      senderType: 'agent',
      channel,
      direction: 'outbound',
      body: compiledText,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
      status: result.status === 'failed' ? 'failed' : 'sent',
    })

    // Update Conversation lastMessage atomically
    if (conversationId) {
      await Conversation.findByIdAndUpdate(conversationId, {
        $set: {
          lastMessage: {
            body: compiledText,
            createdAt: new Date(),
            senderType: 'agent',
            channel,
          },
          lastChannel: channel,
          updatedAt: new Date(),
        },
      })
    }

    // Create timeline Activity under Contact
    if (contactId) {
      await Activity.create({
        brokerageId,
        contactId,
        type: channel === 'email' ? 'email_sent' : channel === 'voice' ? 'call_logged' : 'sms_sent',
        description: `Sent outbound ${channel.toUpperCase()}: "${compiledText.substring(0, 60)}${compiledText.length > 60 ? '...' : ''}"`,
        metadata: {
          messageId: result.messageId,
          channel,
          previewUrl: result.previewUrl,
        },
        performedBy: userId,
      })
    }

    // 4. Broadcast live Socket.io event to brokerage room
    try {
      const io = getSocketServer()
      if (io) {
        io.to(`brokerage:${brokerageId}`).emit('message:new', {
          conversationId,
          message: messageDoc.toObject(),
        })
      }
    } catch {
      // Non-blocking socket broadcast
    }

    logger.info(`[CommunicationService] Dispatched ${channel.toUpperCase()} to ${recipient.substring(0, 4)}*** (ID: ${result.messageId})`)

    return {
      success: true,
      messageId: result.messageId,
      status: result.status,
      previewUrl: result.previewUrl,
    }
  }

  /**
   * Process incoming text for automated STOP / UNSUBSCRIBE keywords
   */
  public async handleOptOutKeywords(
    body: string,
    senderPhoneOrEmail: string,
    brokerageId?: string
  ): Promise<{ isOptOut: boolean; isReConsent: boolean }> {
    const cleanText = body.trim().toUpperCase()
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'OPT-OUT', 'END', 'REVOKE']
    const reConsentKeywords = ['START', 'UNSTOP', 'YES']

    const isOptOut = optOutKeywords.includes(cleanText)
    const isReConsent = reConsentKeywords.includes(cleanText)

    if (isOptOut) {
      const filter: Record<string, any> = {
        $or: [{ phone: senderPhoneOrEmail }, { email: senderPhoneOrEmail.toLowerCase() }],
      }
      if (brokerageId) filter.brokerageId = brokerageId

      await Contact.updateMany(filter, {
        $set: {
          dncStatus: 'opted_out',
          optedOutAt: new Date(),
        },
      })

      logger.info(`[OptOutEngine] Contact (${senderPhoneOrEmail.substring(0, 4)}***) opted out via keyword "${cleanText}"`)
    } else if (isReConsent) {
      const filter: Record<string, any> = {
        $or: [{ phone: senderPhoneOrEmail }, { email: senderPhoneOrEmail.toLowerCase() }],
      }
      if (brokerageId) filter.brokerageId = brokerageId

      await Contact.updateMany(filter, {
        $set: {
          dncStatus: 'clean',
          optedOutAt: null,
        },
      })

      logger.info(`[OptOutEngine] Contact (${senderPhoneOrEmail.substring(0, 4)}***) re-consented via keyword "${cleanText}"`)
    }

    return { isOptOut, isReConsent }
  }

  /**
   * Manual Opt-Out endpoint
   */
  public async optOut(input: OptOutInput, brokerageId: string, performedBy?: string): Promise<{ success: boolean; message: string }> {
    const query: Record<string, any> = { brokerageId }
    if (input.contactId) {
      query._id = input.contactId
    } else if (input.phone) {
      query.phone = input.phone
    } else if (input.email) {
      query.email = input.email.toLowerCase()
    }

    const updated = await Contact.updateMany(query, {
      $set: {
        dncStatus: 'opted_out',
        optedOutAt: new Date(),
      },
    })

    if (input.contactId) {
      await Activity.create({
        brokerageId,
        contactId: input.contactId,
        type: 'status_changed',
        description: `Contact marked as OPTED OUT (${input.reason || 'Manual TCPA opt-out'})`,
        performedBy,
      })
    }

    return {
      success: true,
      message: `Successfully opted out ${updated.modifiedCount} contact record(s)`,
    }
  }

  /**
   * Manual Opt-Back-In (Re-consent) endpoint
   */
  public async optBackIn(input: OptBackInInput, brokerageId: string, performedBy?: string): Promise<{ success: boolean; message: string }> {
    const query: Record<string, any> = { brokerageId }
    if (input.contactId) {
      query._id = input.contactId
    } else if (input.phone) {
      query.phone = input.phone
    } else if (input.email) {
      query.email = input.email.toLowerCase()
    }

    const updated = await Contact.updateMany(query, {
      $set: {
        dncStatus: 'clean',
        optedOutAt: null,
      },
    })

    if (input.contactId) {
      await Activity.create({
        brokerageId,
        contactId: input.contactId,
        type: 'status_changed',
        description: 'Contact re-consented to receive communications',
        performedBy,
      })
    }

    return {
      success: true,
      message: `Successfully re-consented ${updated.modifiedCount} contact record(s)`,
    }
  }

  /**
   * Retrieve communication quick reply templates
   */
  public getQuickTemplates(channel?: string): QuickTemplateDto[] {
    if (!channel || channel === 'all') return QUICK_TEMPLATES
    return QUICK_TEMPLATES.filter((t) => t.channel === 'all' || t.channel === channel)
  }
}

export const commService = new CommunicationService()
