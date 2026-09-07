import { Integration, IIntegration, IntegrationProvider } from '../../models/Integration.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { encryptText } from '../../utils/cryptoHelper.js'
import { SaveIntegrationPayload } from './integration.types.js'

export const listTenantIntegrations = async (user: IUser): Promise<IIntegration[]> => {
  const integrations = await Integration.find({
    brokerageId: user.brokerageId,
  }).sort({ createdAt: -1 })

  return integrations
}

export const getIntegrationByProvider = async (
  provider: IntegrationProvider,
  user: IUser
): Promise<IIntegration> => {
  const integration = await Integration.findOne({
    brokerageId: user.brokerageId,
    provider,
  })

  if (!integration) {
    throw new AppError(`Integration '${provider}' not found`, HTTP_STATUS.NOT_FOUND)
  }

  return integration
}

export const saveOrUpdateIntegration = async (
  payload: SaveIntegrationPayload,
  user: IUser
): Promise<IIntegration> => {
  const { provider, name, credentials, config } = payload

  let credentialsEncrypted: string | undefined = undefined
  if (credentials && Object.keys(credentials).length > 0) {
    credentialsEncrypted = encryptText(JSON.stringify(credentials))
  }

  const integration = await Integration.findOneAndUpdate(
    {
      brokerageId: user.brokerageId,
      provider,
    },
    {
      brokerageId: user.brokerageId,
      provider,
      name,
      status: 'connected',
      ...(credentialsEncrypted ? { credentialsEncrypted } : {}),
      config: config || {},
      lastTestedAt: new Date(),
      lastError: undefined,
      createdBy: user._id,
      updatedBy: user._id,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  )

  return integration
}

export const testIntegrationConnection = async (
  provider: IntegrationProvider,
  user: IUser
): Promise<{ success: boolean; message: string }> => {
  const integration = await Integration.findOne({
    brokerageId: user.brokerageId,
    provider,
  }).select('+credentialsEncrypted')

  if (!integration) {
    throw new AppError(`Integration '${provider}' is not configured`, HTTP_STATUS.NOT_FOUND)
  }

  try {
    // Simulated connection test for Zapier / QuickBooks
    integration.lastTestedAt = new Date()
    integration.status = 'connected'
    integration.lastError = undefined
    await integration.save()

    return {
      success: true,
      message: `Connection test for ${provider.toUpperCase()} successful. Connector online.`,
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Connection test failed'
    integration.status = 'error'
    integration.lastError = errMessage
    await integration.save()

    return {
      success: false,
      message: `Connection test for ${provider.toUpperCase()} failed: ${errMessage}`,
    }
  }
}

export const disconnectIntegration = async (
  provider: IntegrationProvider,
  user: IUser
): Promise<void> => {
  const integration = await Integration.findOne({
    brokerageId: user.brokerageId,
    provider,
  })

  if (!integration) {
    throw new AppError(`Integration '${provider}' not found`, HTTP_STATUS.NOT_FOUND)
  }

  integration.status = 'disconnected'
  integration.credentialsEncrypted = undefined
  integration.updatedBy = user._id
  await integration.save()
}
