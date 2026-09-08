import {
  ICommunicationProvider,
  OutboundMessageOptions,
  ProviderSendResult,
  MessageDeliveryStatus,
  InboundWebhookResult,
} from './ICommunicationProvider.js'
import { logger } from '../../../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'

export class SmsProvider implements ICommunicationProvider {
  public readonly channel = 'sms' as const
  private accountSid: string
  private authToken: string
  private fromNumber: string
  private isLive: boolean

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || ''
    this.authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || ''
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim() || ''
    this.isLive = Boolean(
      this.accountSid.startsWith('AC') &&
      this.authToken.length > 10 &&
      this.fromNumber.length > 5
    )

    if (this.isLive) {
      logger.info('SmsProvider initialized in LIVE Twilio mode')
    } else {
      logger.info('SmsProvider initialized in Free Developer Sandbox / Simulation mode (Zero-Card)')
    }
  }

  public formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9+]/g, '')
    if (cleaned.startsWith('+')) return cleaned
    if (cleaned.startsWith('03') && cleaned.length === 11) return `+92${cleaned.substring(1)}`
    if (cleaned.length === 10) return `+1${cleaned}`
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`
    if (cleaned.length === 12 && cleaned.startsWith('92')) return `+${cleaned}`
    return `+${cleaned}`
  }

  public async send(options: OutboundMessageOptions): Promise<ProviderSendResult> {
    const timestamp = new Date().toISOString()
    const formattedTo = this.formatPhoneNumber(options.to)
    const textBody = options.text.trim()

    if (!textBody) {
      return {
        success: false,
        messageId: `err-${uuidv4()}`,
        channel: 'sms',
        status: 'failed',
        error: 'SMS message body cannot be empty',
        timestamp,
      }
    }

    // 1. Live Twilio API Dispatch (if credentials configured)
    if (this.isLive) {
      try {
        const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
        const bodyParams = new URLSearchParams()
        bodyParams.append('To', formattedTo)
        bodyParams.append('From', options.from || this.fromNumber)
        bodyParams.append('Body', textBody)
        if (options.mediaUrl) {
          bodyParams.append('MediaUrl', options.mediaUrl)
        }

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: bodyParams.toString(),
          }
        )

        const data: any = await res.json()

        if (!res.ok) {
          const errorMsg = data?.message || `Twilio HTTP error ${res.status}`
          logger.warn(`[SmsProvider] Twilio API rejected send: ${errorMsg}`)
          return {
            success: false,
            messageId: `err-${uuidv4()}`,
            channel: 'sms',
            status: 'failed',
            error: errorMsg,
            timestamp,
          }
        }

        return {
          success: true,
          messageId: data.sid,
          channel: 'sms',
          status: 'sent',
          carrierInfo: data.direction || 'outbound-api',
          timestamp,
        }
      } catch (err: any) {
        logger.error(`[SmsProvider] Twilio network error: ${err?.message}`)
        return {
          success: false,
          messageId: `err-${uuidv4()}`,
          channel: 'sms',
          status: 'failed',
          error: err?.message || 'Twilio connection failure',
          timestamp,
        }
      }
    }

    // 2. Zero-Card Developer Sandbox & Simulator
    const simulatedSid = `SM${uuidv4().replace(/-/g, '').substring(0, 32)}`
    logger.info(`[SMS Sandbox] Simulated SMS sent to ${formattedTo.substring(0, 5)}***: "${textBody.substring(0, 30)}..." (SID: ${simulatedSid})`)

    return {
      success: true,
      messageId: simulatedSid,
      channel: 'sms',
      status: 'delivered',
      carrierInfo: 'Developer SMS Sandbox',
      timestamp,
    }
  }

  public async getStatus(messageId: string): Promise<MessageDeliveryStatus> {
    return {
      messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    }
  }

  public async handleWebhook(payload: any): Promise<InboundWebhookResult> {
    const from = payload?.From || payload?.from || ''
    const body = payload?.Body || payload?.body || ''
    const messageId = payload?.MessageSid || payload?.messageId || `inbound-${uuidv4()}`

    const normalizedBody = body.trim().toUpperCase()
    const optOutKeywords = ['STOP', 'UNSUBSCRIBE', 'QUIT', 'CANCEL', 'OPT-OUT', 'END', 'REVOKE']
    const isOptOut = optOutKeywords.includes(normalizedBody)

    return {
      isHandled: true,
      channel: 'sms',
      from,
      to: payload?.To || payload?.to,
      body,
      messageId,
      isOptOut,
      optOutKeyword: isOptOut ? normalizedBody : undefined,
      rawPayload: payload,
    }
  }
}

export const smsProvider = new SmsProvider()
