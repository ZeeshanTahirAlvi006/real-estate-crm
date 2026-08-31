import { env } from '../../../config/env.js'
import { logger } from '../../../utils/logger.js'

export interface WhatsAppSendResult {
  messageId: string
  status: 'sent' | 'delivered' | 'failed'
  isLive: boolean
  providerResponse?: any
}

export interface ParsedInboundWhatsAppMessage {
  from: string
  messageId: string
  timestamp: number
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'interactive' | 'unknown'
  text?: string
  mediaUrl?: string
  mediaType?: string
  caption?: string
  interactiveButtonId?: string
  interactiveButtonTitle?: string
}

export class WhatsAppProvider {
  private token?: string
  private phoneNumberId?: string
  private verifyToken: string

  constructor() {
    this.token = env.META_WHATSAPP_TOKEN
    this.phoneNumberId = env.META_PHONE_NUMBER_ID
    this.verifyToken = env.META_VERIFY_TOKEN
  }

  public isLiveMode(): boolean {
    return Boolean(this.token && this.phoneNumberId)
  }

  private formatMetaError(error: any): string {
    const code = error?.code
    if (code === 131030) {
      return `Recipient not in allowed list.`
    }
    if (code === 132001) {
      return `Template not registered.`
    }
    if (code === 131047) {
      return `Customer 24-hour service window has expired. Please send the "hello_world" template first to reopen the 24-hour chat window.`
    }
    return 'Meta WhatsApp delivery failed'
  }

  // 1. Verify Webhook (Meta handshake)
  public verifyWebhook(
    mode: string,
    token: string,
    challenge: string
  ): { isValid: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === this.verifyToken) {
      logger.info('WhatsApp webhook handshake verified successfully')
      return { isValid: true, challenge }
    }
    logger.warn('WhatsApp webhook handshake failed token verification')
    return { isValid: false }
  }

  // 2. Send Plain Text Message
  public async sendTextMessage(
    to: string,
    body: string,
    options?: { previewUrl?: boolean }
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = to.replace(/\D/g, '')

    if (this.isLiveMode()) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanPhone,
              type: 'text',
              text: {
                preview_url: options?.previewUrl ?? false,
                body,
              },
            }),
          }
        )

        const data: any = await response.json()
        if (data.error) {
          logger.error('Meta WhatsApp API error on text send:', data.error)
          throw new Error(this.formatMetaError(data.error))
        }

        const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`
        return { messageId, status: 'sent', isLive: true, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
    }
  }

  // 3. Send Pre-Approved Template Message
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    components: any[] = []
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = to.replace(/\D/g, '')

    if (this.isLiveMode()) {
      try {
        const payload: Record<string, any> = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
          },
        }

        if (components && components.length > 0) {
          payload.template.components = components
        }

        const response = await fetch(
          `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        )

        const data: any = await response.json()
        if (data.error) {
          logger.error('Meta WhatsApp API error on template send:', data.error)
          throw new Error(this.formatMetaError(data.error))
        }

        const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`
        return { messageId, status: 'sent', isLive: true, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
    }
  }

  // 4. Send Rich Media Message (Image, PDF, Audio, Video)
  public async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = to.replace(/\D/g, '')

    if (this.isLiveMode()) {
      try {
        const payload: Record<string, any> = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: mediaType,
          [mediaType]: {
            link: mediaUrl,
            ...(caption && mediaType !== 'audio' ? { caption } : {}),
          },
        }

        const response = await fetch(
          `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        )

        const data: any = await response.json()
        if (data.error) {
          logger.error('Meta WhatsApp API error on media send:', data.error)
          throw new Error(this.formatMetaError(data.error))
        }

        const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`
        return { messageId, status: 'sent', isLive: true, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
    }
  }

  // 5. Parse Meta Webhook Payload
  public parseWebhookPayload(payload: any): ParsedInboundWhatsAppMessage[] {
    const parsed: ParsedInboundWhatsAppMessage[] = []

    if (!payload?.entry || !Array.isArray(payload.entry)) {
      return parsed
    }

    for (const entry of payload.entry) {
      const changes = entry.changes || []
      for (const change of changes) {
        const value = change.value
        if (!value || !value.messages || !Array.isArray(value.messages)) continue

        for (const msg of value.messages) {
          const from = msg.from
          const messageId = msg.id
          const timestamp = Number(msg.timestamp) || Math.floor(Date.now() / 1000)
          const type = msg.type

          const item: ParsedInboundWhatsAppMessage = {
            from,
            messageId,
            timestamp,
            type: 'unknown',
          }

          if (type === 'text') {
            item.type = 'text'
            item.text = msg.text?.body || ''
          } else if (type === 'image') {
            item.type = 'image'
            item.mediaUrl = msg.image?.link || msg.image?.id
            item.caption = msg.image?.caption
          } else if (type === 'document') {
            item.type = 'document'
            item.mediaUrl = msg.document?.link || msg.document?.id
            item.caption = msg.document?.caption || msg.document?.filename
          } else if (type === 'audio') {
            item.type = 'audio'
            item.mediaUrl = msg.audio?.link || msg.audio?.id
          } else if (type === 'video') {
            item.type = 'video'
            item.mediaUrl = msg.video?.link || msg.video?.id
            item.caption = msg.video?.caption
          } else if (type === 'interactive') {
            item.type = 'interactive'
            item.interactiveButtonId =
              msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id
            item.interactiveButtonTitle =
              msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title
            item.text = item.interactiveButtonTitle
          }

          parsed.push(item)
        }
      }
    }

    return parsed
  }
}

export const whatsAppProvider = new WhatsAppProvider()
