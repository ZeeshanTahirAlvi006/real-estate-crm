import { Request, Response } from 'express'
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  sendWhatsAppMessage,
  processInboundWebhook,
  createAndExecuteBroadcast,
  getWhatsAppBroadcasts,
  getTenantWhatsAppConfig,
  updateTenantWhatsAppConfig,
  testTenantWhatsAppConnection,
  disconnectTenantWhatsApp,
} from './whatsapp.service.js'
import { whatsAppProvider } from './providers/whatsapp.provider.js'
import { sendSuccess, sendError } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// 1. Meta Webhook Verification (GET)
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = (req.query['hub.mode'] || req.query['hub_mode'] || req.query.mode || 'subscribe') as string
  const token = (req.query['hub.verify_token'] || req.query['hub_verify_token'] || req.query.verify_token || req.query.token) as string
  const challenge = (req.query['hub.challenge'] || req.query['hub_challenge'] || req.query.challenge) as string

  const result = whatsAppProvider.verifyWebhook(mode, token, challenge)

  if (result.isValid && result.challenge) {
    res.status(200).send(result.challenge)
    return
  }

  res.status(403).send('Verification failed')
}

// 2. Meta Inbound Webhook Event Receiver (POST)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('[WhatsApp Webhook] Received Meta POST event:', JSON.stringify(req.body))
    // Immediately acknowledge Meta to avoid webhook retry loops
    res.status(200).send('EVENT_RECEIVED')

    // Process Inbound payload in background
    await processInboundWebhook(req.body)
  } catch (err: any) {
    console.error('[WhatsApp Webhook] Processing error:', err?.message)
  }
}

// 3. Get WhatsApp Templates (GET)
export const getTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const tenantFilter = (req as any).tenantFilter || {}
    const templates = await getWhatsAppTemplates(tenantFilter, caller)
    sendSuccess(res, templates, 'WhatsApp templates retrieved successfully')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

// 4. Create WhatsApp Template (POST)
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const template = await createWhatsAppTemplate(req.body, caller)
    sendSuccess(res, template, 'WhatsApp template created successfully', HTTP_STATUS.CREATED)
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}

// 5. Send Single WhatsApp Message (POST)
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const result = await sendWhatsAppMessage(
      req.body,
      caller,
      req.ip,
      req.headers['user-agent']
    )
    sendSuccess(res, result, 'WhatsApp message sent successfully')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}

// 6. Create & Execute WhatsApp Broadcast (POST)
export const createBroadcast = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const result = await createAndExecuteBroadcast(req.body, caller)
    sendSuccess(res, result, 'WhatsApp broadcast campaign initiated successfully', HTTP_STATUS.CREATED)
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}

// 7. Get Broadcast Campaigns (GET)
export const getBroadcasts = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const tenantFilter = (req as any).tenantFilter || {}
    const broadcasts = await getWhatsAppBroadcasts(tenantFilter, caller)
    sendSuccess(res, broadcasts, 'WhatsApp broadcast campaigns retrieved')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

// 8. Simulate Inbound WhatsApp message (for Dev / Testing)
export const simulateInbound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromPhone, text } = req.body
    const simulatedPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: fromPhone || '13105550199',
                    id: `wamid_sim_inbound_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000),
                    type: 'text',
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    }

    const result = await processInboundWebhook(simulatedPayload)
    sendSuccess(res, result, 'Simulated inbound WhatsApp event processed')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

// 9. Get Tenant WhatsApp Integration Config (GET)
export const getTenantConfigHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const config = await getTenantWhatsAppConfig(caller.brokerageId)
    sendSuccess(res, config, 'WhatsApp configuration retrieved')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}

// 10. Update Tenant WhatsApp Integration Config (PATCH)
export const updateTenantConfigHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const config = await updateTenantWhatsAppConfig(caller.brokerageId, req.body)
    sendSuccess(res, config, 'WhatsApp configuration updated successfully')
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}

// 11. Test Live WhatsApp Connection (POST)
export const testTenantConnectionHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const result = await testTenantWhatsAppConnection(caller.brokerageId, req.body?.testPhone)
    sendSuccess(res, result, result.message)
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}

// 12. Disconnect Tenant WhatsApp (POST)
export const disconnectTenantHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const caller = (req as any).user
    const result = await disconnectTenantWhatsApp(caller.brokerageId)
    sendSuccess(res, result, result.message)
  } catch (err: any) {
    sendError(res, err.message, HTTP_STATUS.BAD_REQUEST)
  }
}
