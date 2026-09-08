import {
  ICommunicationProvider,
  OutboundMessageOptions,
  ProviderSendResult,
  MessageDeliveryStatus,
  InboundWebhookResult,
} from './ICommunicationProvider.js'
import { logger } from '../../../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'

export class VoiceProvider implements ICommunicationProvider {
  public readonly channel = 'voice' as const
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
      logger.info('VoiceProvider initialized in LIVE Twilio Voice mode')
    } else {
      logger.info('VoiceProvider initialized in Free Developer Voice Simulator (Zero-Card)')
    }
  }

  public formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9+]/g, '')
    if (cleaned.startsWith('+')) return cleaned
    if (cleaned.startsWith('03') && cleaned.length === 11) return `+92${cleaned.substring(1)}`
    if (cleaned.length === 10) return `+1${cleaned}`
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`
    return `+${cleaned}`
  }

  public async send(options: OutboundMessageOptions): Promise<ProviderSendResult> {
    const timestamp = new Date().toISOString()
    const formattedTo = this.formatPhoneNumber(options.to)

    // 1. Live Twilio Voice API Dispatch
    if (this.isLive) {
      try {
        const authHeader = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
        const bodyParams = new URLSearchParams()
        bodyParams.append('To', formattedTo)
        bodyParams.append('From', options.from || this.fromNumber)

        // Simple TwiML voice greeting / message
        const twiml = `<Response><Say voice="Polly.Joanna">${options.text.replace(/&/g, '&amp;')}</Say></Response>`
        bodyParams.append('Twiml', twiml)

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`,
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
          const errorMsg = data?.message || `Twilio Voice HTTP error ${res.status}`
          logger.warn(`[VoiceProvider] Twilio API call failed: ${errorMsg}`)
          return {
            success: false,
            messageId: `err-${uuidv4()}`,
            channel: 'voice',
            status: 'failed',
            error: errorMsg,
            timestamp,
          }
        }

        return {
          success: true,
          messageId: data.sid,
          channel: 'voice',
          status: 'queued',
          carrierInfo: data.status || 'initiated',
          timestamp,
        }
      } catch (err: any) {
        logger.error(`[VoiceProvider] Twilio voice call error: ${err?.message}`)
        return {
          success: false,
          messageId: `err-${uuidv4()}`,
          channel: 'voice',
          status: 'failed',
          error: err?.message || 'Voice network failure',
          timestamp,
        }
      }
    }

    // 2. Zero-Card Developer Voice Simulator
    const callSid = `CA${uuidv4().replace(/-/g, '').substring(0, 32)}`
    logger.info(`[Voice Sandbox] Simulated Call initiated to ${formattedTo.substring(0, 5)}*** (CallSID: ${callSid})`)

    return {
      success: true,
      messageId: callSid,
      channel: 'voice',
      status: 'delivered',
      carrierInfo: 'Developer Voice Sandbox',
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
    return {
      isHandled: true,
      channel: 'voice',
      from: payload?.From || payload?.from || '',
      to: payload?.To || payload?.to,
      messageId: payload?.CallSid || payload?.messageId,
      rawPayload: payload,
    }
  }
}

export const voiceProvider = new VoiceProvider()
