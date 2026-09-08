import mongoose from 'mongoose'
import { env } from '../../../config/env.js'
import { logger } from '../../../utils/logger.js'
import { Brokerage } from '../../../models/Brokerage.js'
import { decrypt } from '../../../utils/cryptoHelper.js'

export interface WhatsAppSendResult {
  messageId: string
  status: 'sent' | 'delivered' | 'failed'
  isLive: boolean
  providerResponse?: any
  isTenantConfigured?: boolean
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
  senderName?: string
}

import {
  ICommunicationProvider,
  OutboundMessageOptions,
  ProviderSendResult,
  MessageDeliveryStatus,
} from './ICommunicationProvider.js'

export class WhatsAppProvider implements ICommunicationProvider {
  public readonly channel = 'whatsapp' as const
  private verifyToken: string

  constructor() {
    this.verifyToken = env.META_VERIFY_TOKEN
  }

  private getToken(): string | undefined {
    return process.env.META_WHATSAPP_TOKEN || env.META_WHATSAPP_TOKEN
  }

  private getPhoneNumberId(): string | undefined {
    return process.env.META_PHONE_NUMBER_ID || env.META_PHONE_NUMBER_ID
  }

  public isLiveMode(): boolean {
    const token = this.getToken()
    const phoneId = this.getPhoneNumberId()
    return Boolean(token && phoneId && token.trim().length > 10 && phoneId.trim().length > 3)
  }

  public async resolveTenantCredentials(brokerageId?: string | mongoose.Types.ObjectId): Promise<{
    token?: string
    phoneNumberId?: string
    isLive: boolean
    isTenantConfigured: boolean
  }> {
    if (brokerageId) {
      try {
        const brokerage = await Brokerage.findById(brokerageId).select('+whatsappConfig.accessTokenEncrypted').lean()
        if (
          brokerage?.whatsappConfig?.status === 'connected' &&
          brokerage.whatsappConfig.phoneNumberId &&
          brokerage.whatsappConfig.accessTokenEncrypted
        ) {
          const token = decrypt(brokerage.whatsappConfig.accessTokenEncrypted)
          return {
            token,
            phoneNumberId: brokerage.whatsappConfig.phoneNumberId,
            isLive: true,
            isTenantConfigured: true,
          }
        }
      } catch (err: any) {
        logger.warn(`Failed to decrypt WhatsApp credentials for brokerage ${brokerageId}: ${err?.message}`)
      }
    }

    const fallbackToken = this.getToken()
    const fallbackPhoneId = this.getPhoneNumberId()
    const isLive = Boolean(fallbackToken && fallbackPhoneId && fallbackToken.trim().length > 10 && fallbackPhoneId.trim().length > 3)

    return {
      token: fallbackToken,
      phoneNumberId: fallbackPhoneId,
      isLive,
      isTenantConfigured: false,
    }
  }

  public async verifyConnection(
    phoneNumberId: string,
    accessToken: string
  ): Promise<{
    success: boolean
    verifiedName?: string
    displayPhoneNumber?: string
    qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'
    codeVerificationStatus?: string
    error?: string
  }> {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })
      const data: any = await response.json()
      if (data.error) {
        return { success: false, error: this.formatMetaError(data.error) }
      }
      return {
        success: true,
        verifiedName: data.verified_name || data.name,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating || 'UNKNOWN',
        codeVerificationStatus: data.code_verification_status,
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reach Meta Graph API' }
    }
  }

  public formatPhoneNumber(to: string): string {
    let clean = to.replace(/\D/g, '')
    // Handle standard Pakistani local mobile format (03xx-xxxxxxx -> 923xxxxxxxxx)
    if (clean.length === 11 && clean.startsWith('03')) {
      clean = `92${clean.slice(1)}`
    }
    // Prepend US/North America country code '1' if standard 10-digit number without country code
    else if (clean.length === 10) {
      clean = `1${clean}`
    }
    return clean
  }

  private formatMetaError(error: any): string {
    const code = error?.code
    const message = error?.message || error?.error_user_msg || ''
    const details = error?.error_data?.details || error?.error_user_title || ''

    if (code === 190 || error?.type === 'OAuthException') {
      return `Meta WhatsApp Access Token has expired or is invalid (OAuthException Code 190). Please generate a fresh token in Meta Developer Dashboard (WhatsApp > API Setup) and update META_WHATSAPP_TOKEN in server/.env.`
    }
    if (code === 131030) {
      return `Recipient phone number is not in your Meta Sandbox Allowed Test List (Code 131030). In Meta Developer Portal (WhatsApp > API Setup), add this phone number to the "To" test recipients list.`
    }
    if (code === 132001) {
      return `Template is not registered or approved in your Meta Business Account (Code 132001).`
    }
    if (code === 131047) {
      return `Customer 24-hour service window has expired. Please send the "hello_world" template first to reopen the 24-hour chat window (Code 131047).`
    }
    if (code === 131026) {
      return `Message undeliverable. The phone number may not have WhatsApp or is restricted (Code 131026).`
    }
    if (code === 131042) {
      return `Meta WhatsApp Business Account payment or business verification issue (Code 131042).`
    }
    if (code === 100) {
      return `Invalid Meta template parameters (Code 100): ${message || details || 'Check template variables'}`
    }

    if (message) {
      return `Meta WhatsApp API Error (${code || 'Unknown'}): ${message}${details ? ` - ${details}` : ''}`
    }

    return 'Meta WhatsApp delivery failed. Please verify your Meta Cloud API credentials in server/.env.'
  }

  // 1. Verify Webhook (Meta handshake)
  public verifyWebhook(
    mode: string,
    token: string,
    challenge: string
  ): { isValid: boolean; challenge?: string } {
    const expectedToken = this.verifyToken || process.env.META_VERIFY_TOKEN
    if (mode === 'subscribe' && token === expectedToken
    ) {
      logger.info(`WhatsApp webhook handshake verified successfully! Challenge: ${challenge}`)
      return { isValid: true, challenge }
    }
    logger.warn(`WhatsApp webhook handshake failed verification. Received token: "${token}", Expected: "${expectedToken}", Mode: "${mode}"`)
    return { isValid: false }
  }

  // 2. Send Plain Text Message
  public async sendTextMessage(
    to: string,
    body: string,
    options?: { previewUrl?: boolean; brokerageId?: string | mongoose.Types.ObjectId }
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = this.formatPhoneNumber(to)
    const { token, phoneNumberId, isLive, isTenantConfigured } = await this.resolveTenantCredentials(options?.brokerageId)

    if (isLive && token && phoneNumberId) {
      try {
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
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
          // If 24-hour service window is closed (code 131047), automatically fallback to pre-approved hello_world template
          if (data.error.code === 131047) {
            logger.info(`WhatsApp 24h window closed for +${cleanPhone}. Sending official hello_world template handshake...`)
            return this.sendTemplateMessage(cleanPhone, 'hello_world', 'en_US', [], { brokerageId: options?.brokerageId })
          }

          logger.error('Meta WhatsApp API error on text send:', data.error)
          throw new Error(this.formatMetaError(data.error))
        }

        const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`
        return { messageId, status: 'sent', isLive: true, isTenantConfigured, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }

    logger.warn('WhatsAppProvider: Running in simulated test mode (no tenant or dev credentials configured).')
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
      isTenantConfigured: false,
    }
  }

  // 3. Send Pre-Approved Template Message
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en_US',
    components: any[] = [],
    options?: { brokerageId?: string | mongoose.Types.ObjectId }
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = this.formatPhoneNumber(to)
    const { token, phoneNumberId, isLive, isTenantConfigured } = await this.resolveTenantCredentials(options?.brokerageId)

    if (isLive && token && phoneNumberId) {
      try {
        const payload: Record<string, any> = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
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
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
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
        return { messageId, status: 'sent', isLive: true, isTenantConfigured, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
      isTenantConfigured: false,
    }
  }

  // 4. Send Rich Media Message (Image, PDF, Audio, Video)
  public async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'document' | 'audio' | 'video',
    mediaUrl: string,
    caption?: string,
    options?: { brokerageId?: string | mongoose.Types.ObjectId }
  ): Promise<WhatsAppSendResult> {
    const cleanPhone = this.formatPhoneNumber(to)
    const { token, phoneNumberId, isLive, isTenantConfigured } = await this.resolveTenantCredentials(options?.brokerageId)

    if (isLive && token && phoneNumberId) {
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
          `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
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
        return { messageId, status: 'sent', isLive: true, isTenantConfigured, providerResponse: data }
      } catch (err: any) {
        logger.error('Failed to send WhatsApp message:', err?.message)
        throw err
      }
    }
    return {
      messageId: `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'sent',
      isLive: false,
      isTenantConfigured: false,
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

        const contactProfile = value.contacts?.[0]?.profile
        const profileName = contactProfile?.name

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
            senderName: profileName,
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

  public async send(options: OutboundMessageOptions): Promise<ProviderSendResult> {
    const timestamp = new Date().toISOString()
    try {
      if (options.templateName) {
        const components: any[] = []
        if (options.templateVariables && Object.keys(options.templateVariables).length > 0) {
          const parameters = Object.values(options.templateVariables).map((text) => ({
            type: 'text',
            text,
          }))
          components.push({ type: 'body', parameters })
        }

        const result = await this.sendTemplateMessage(
          options.to,
          options.templateName,
          'en_US',
          components,
          { brokerageId: options.brokerageId }
        )
        return {
          success: result.status !== 'failed',
          messageId: result.messageId,
          channel: 'whatsapp',
          status: result.status,
          carrierInfo: result.isLive ? 'Meta WhatsApp Cloud API' : 'WhatsApp Sandbox Simulator',
          timestamp,
        }
      }

      if (options.mediaUrl && options.mediaType) {
        const result = await this.sendMediaMessage(
          options.to,
          options.mediaType as any,
          options.mediaUrl,
          options.text,
          { brokerageId: options.brokerageId }
        )
        return {
          success: result.status !== 'failed',
          messageId: result.messageId,
          channel: 'whatsapp',
          status: result.status,
          carrierInfo: result.isLive ? 'Meta WhatsApp Cloud API' : 'WhatsApp Sandbox Simulator',
          timestamp,
        }
      }

      const result = await this.sendTextMessage(
        options.to,
        options.text,
        { brokerageId: options.brokerageId }
      )
      return {
        success: result.status !== 'failed',
        messageId: result.messageId,
        channel: 'whatsapp',
        status: result.status,
        carrierInfo: result.isLive ? 'Meta WhatsApp Cloud API' : 'WhatsApp Sandbox Simulator',
        timestamp,
      }
    } catch (err: any) {
      return {
        success: false,
        messageId: `err-wa-${Date.now()}`,
        channel: 'whatsapp',
        status: 'failed',
        error: err?.message || 'WhatsApp message dispatch failed',
        timestamp,
      }
    }
  }

  public async getStatus(messageId: string): Promise<MessageDeliveryStatus> {
    return {
      messageId,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    }
  }
}

export const whatsAppProvider = new WhatsAppProvider()

