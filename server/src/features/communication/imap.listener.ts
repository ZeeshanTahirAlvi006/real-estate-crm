import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { Contact } from '../../models/Contact.js'
import { Conversation } from '../../models/Conversation.js'
import { Message } from '../../models/Message.js'
import { Activity } from '../../models/Activity.js'
import { getSocketServer } from '../../config/socket.js'
import { commService } from './comm.service.js'
import { handleInboundLeadChat } from '../ai-isa/aiIsa.service.js'
import { logger } from '../../utils/logger.js'

export class ImapListenerService {
  private client: ImapFlow | null = null
  private isRunning: boolean = false
  private isConnecting: boolean = false
  private reconnectTimer: NodeJS.Timeout | null = null

  public async start(): Promise<void> {
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!user || !pass) {
      logger.info('[IMAP Listener] SMTP_USER or SMTP_PASS not set — skipping IMAP live sync.')
      return
    }

    if (this.isRunning || this.isConnecting) return
    this.isConnecting = true

    try {
      this.client = new ImapFlow({
        host: process.env.IMAP_HOST as string,
        port: parseInt(process.env.IMAP_PORT as string, 10),
        secure: true,
        auth: {
          user,
          pass,
        },
        logger: false,
      })

      this.client.on('error', (err) => {
        logger.error(`[IMAP Listener] Error: ${err.message}`)
        this.scheduleReconnect()
      })

      this.client.on('close', () => {
        if (this.isRunning) {
          logger.warn('[IMAP Listener] Connection closed, scheduling reconnect...')
          this.scheduleReconnect()
        }
      })

      await this.client.connect()
      this.isRunning = true
      this.isConnecting = false
      logger.info(`[IMAP Listener] ✅ Connected to Gmail IMAP (${user}) — Listening for live incoming email replies!`)

      // Open INBOX
      await this.client.mailboxOpen('INBOX')

      // Listen for new messages via IMAP IDLE
      this.client.on('exists', async () => {
        try {
          await this.processNewIncomingEmails()
        } catch (err: any) {
          logger.error(`[IMAP Listener] Error processing new incoming email: ${err.message}`)
        }
      })

      // Immediate check on boot
      this.processNewIncomingEmails().catch((err) => {
        logger.error(`[IMAP Listener] Initial scan error: ${err.message}`)
      })

      // Fallback periodic polling every 10 seconds
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = setInterval(() => {
        if (this.isRunning) {
          this.processNewIncomingEmails().catch(() => {})
        }
      }, 10000)
    } catch (err: any) {
      this.isConnecting = false
      logger.warn(`[IMAP Listener] Failed to connect: ${err.message}. Will retry in 30 seconds.`)
      this.scheduleReconnect()
    }
  }

  private pollTimer: NodeJS.Timeout | null = null

  private scheduleReconnect(): void {
    this.isRunning = false
    this.isConnecting = false
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.start()
    }, 30000)
  }

  /**
   * Fetches and processes any UNSEEN incoming emails
   */
  public async processNewIncomingEmails(): Promise<void> {
    if (!this.client || !this.isRunning) return

    const myEmail = (process.env.SMTP_USER as string).toLowerCase().trim()
    const lock = await this.client.getMailboxLock('INBOX')

    try {
      // Only search recent messages (last 2 hours) to avoid processing historical personal inbox backlog
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const searchResult = await this.client.search({ since: twoHoursAgo, seen: false }, { uid: true })
      if (!searchResult || searchResult.length === 0) return

      for (const uid of searchResult) {
        try {
          const fetched = await this.client.fetchOne(uid.toString(), { source: true, flags: true }, { uid: true })
          if (!fetched || !fetched.source) continue

          const parsed = await simpleParser(fetched.source)
          const senderAddress = (parsed.from?.value?.[0]?.address || '').toLowerCase().trim()
          const subject = parsed.subject || 'No Subject'
          const rawContent = parsed.text || parsed.html || ''
          const bodyText = this.cleanEmailBody(rawContent) || rawContent.trim()

          // 1. Skip self-sent emails
          if (!senderAddress || senderAddress === myEmail) {
            continue
          }

          // 2. STRICT RULE: ONLY process if sender is an ALREADY REGISTERED Contact in this CRM
          const contact = await Contact.findOne({ email: senderAddress, isDeleted: { $ne: true } })
          if (!contact) {
            // Not a CRM contact — ignore personal email completely!
            continue
          }

          logger.info(`[IMAP Listener] 📬 Received CRM email reply from contact: ${contact.firstName} ${contact.lastName} (${senderAddress}) | Subject: "${subject}"`)

          const brokerageId = contact.brokerageId

          // 3. Find or Create Conversation for this Contact
          let conversation = await Conversation.findOne({ contactId: contact._id, brokerageId })
          if (!conversation) {
            conversation = await Conversation.create({
              brokerageId,
              contactId: contact._id,
              contactName: `${contact.firstName} ${contact.lastName}`.trim(),
              contactEmail: senderAddress,
              contactPhone: contact.phone || '',
              lastChannel: 'email',
              lastMessageText: bodyText.slice(0, 150),
              lastMessageAt: new Date(),
              unreadCount: 1,
              aiIsaEnabled: false,
            })
          } else {
            conversation.lastMessageText = bodyText.slice(0, 150)
            conversation.lastMessageAt = new Date()
            conversation.lastChannel = 'email'
            conversation.unreadCount = (conversation.unreadCount || 0) + 1
            await conversation.save()
          }

          // 4. Create Inbound Message Record
          const messageDoc = await Message.create({
            brokerageId,
            conversationId: conversation._id,
            contactId: contact._id,
            sender: 'lead',
            senderName: `${contact.firstName} ${contact.lastName}`.trim(),
            channel: 'email',
            body: bodyText,
            direction: 'inbound',
            deliveryStatus: 'delivered',
          })

          // 5. Create Activity Timeline entry
          await Activity.create({
            contactId: contact._id,
            brokerageId,
            type: 'email',
            description: `Received Email: "${bodyText.slice(0, 80)}${bodyText.length > 80 ? '...' : ''}"`,
            metadata: {
              conversationId: conversation._id.toString(),
              messageId: messageDoc._id.toString(),
              subject,
            },
          })

          // 6. Broadcast Real-Time Socket Event to UI
          const io = getSocketServer()
          if (io) {
            io.to(`brokerage:${brokerageId.toString()}`).emit('message:new', {
              conversationId: conversation._id.toString(),
              message: {
                id: messageDoc._id.toString(),
                conversationId: conversation._id.toString(),
                body: bodyText,
                channel: 'email',
                senderType: 'lead',
                senderName: `${contact.firstName} ${contact.lastName}`.trim(),
                createdAt: messageDoc.createdAt.toISOString(),
              },
            })
          }

          // 7. Check for Opt-Out Keywords (e.g. STOP, UNSUBSCRIBE)
          await commService.handleOptOutKeywords(bodyText, contact.email || contact.phone, brokerageId.toString())

          // 8. Trigger AI ISA Autonomous Response if enabled
          if (conversation.aiIsaEnabled) {
            logger.info(`[IMAP Listener] Triggering AI ISA auto-pilot response for ${senderAddress}...`)
            handleInboundLeadChat({
              conversationId: conversation._id.toString(),
              contactId: contact._id.toString(),
              inboundText: bodyText,
              channel: 'email',
            }).catch((err) => {
              logger.error(`[IMAP Listener] Error in AI ISA response: ${err?.message}`)
            })
          }

          // Mark email as read in Gmail
          await this.client.messageFlagsAdd({ uid: uid.toString() }, ['\\Seen'], { uid: true })
        } catch (err: any) {
          logger.error(`[IMAP Listener] Error processing message UID ${uid}: ${err.message}`)
        }
      }
    } finally {
      lock.release()
    }
  }

  /**
   * Cleans an email body by stripping quoted reply headers, previous thread history, and mobile signatures.
   */
  private cleanEmailBody(rawText: string): string {
    if (!rawText) return ''
    let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // 1. Cut off before standard multi-line or single-line "On <date>, <sender> wrote:" patterns
    const onWroteRegex = /\n\s*On\s+[\s\S]+?wrote:\s*(\n|$)/i
    const onWroteMatch = text.match(onWroteRegex)
    if (onWroteMatch && onWroteMatch.index !== undefined) {
      text = text.slice(0, onWroteMatch.index)
    }

    // 2. Cut off before "-----Original Message-----"
    const originalMsgRegex = /\n\s*-+\s*Original Message\s*-+/i
    const origMatch = text.match(originalMsgRegex)
    if (origMatch && origMatch.index !== undefined) {
      text = text.slice(0, origMatch.index)
    }

    // 3. Cut off before Outlook style "From: ... Sent: ... To: ... Subject: ..."
    const outlookHeaderRegex = /\n\s*From:\s+.+\n\s*Sent:\s+.+/i
    const outlookMatch = text.match(outlookHeaderRegex)
    if (outlookMatch && outlookMatch.index !== undefined) {
      text = text.slice(0, outlookMatch.index)
    }

    // 4. Cut off before long underscore/dash dividers (e.g. ___________________)
    const dividerRegex = /\n\s*_{8,}|\n\s*-{8,}/
    const dividerMatch = text.match(dividerRegex)
    if (dividerMatch && dividerMatch.index !== undefined) {
      text = text.slice(0, dividerMatch.index)
    }

    // 5. Filter out lines starting with quotation '>' and common mobile signatures
    const lines = text.split('\n')
    const cleanLines = lines.filter((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('>')) return false
      if (/^Sent from my (iPhone|iPad|Galaxy|Android|phone)/i.test(trimmed)) return false
      if (/^Get Outlook for (iOS|Android)/i.test(trimmed)) return false
      return true
    })

    return cleanLines.join('\n').trim()
  }

  public async stop(): Promise<void> {
    this.isRunning = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.client) {
      try {
        await this.client.logout()
      } catch {
        // Safe close
      }
      this.client = null
    }
    logger.info('[IMAP Listener] Stopped.')
  }
}

export const imapListenerService = new ImapListenerService()
