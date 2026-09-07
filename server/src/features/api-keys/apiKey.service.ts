import { ApiKey, IApiKey } from '../../models/ApiKey.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { generateApiKeyPair } from '../../utils/cryptoHelper.js'
import { CreateApiKeyPayload, CreateApiKeyResponse } from './apiKey.types.js'

export const listTenantApiKeys = async (user: IUser): Promise<IApiKey[]> => {
  const keys = await ApiKey.find({
    brokerageId: user.brokerageId,
  }).sort({ createdAt: -1 })

  return keys
}

export const createTenantApiKey = async (
  payload: CreateApiKeyPayload,
  user: IUser
): Promise<CreateApiKeyResponse> => {
  const { name, scopes, expiresInDays } = payload

  // 1. Generate key pair
  const { rawKey, keyPrefix, keyHash } = generateApiKeyPair('pk_live')

  let expiresAt: Date | undefined = undefined
  if (expiresInDays) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  // 2. Persist in database
  const apiKeyDoc = await ApiKey.create({
    brokerageId: user.brokerageId,
    name,
    keyPrefix,
    keyHash,
    scopes: scopes && scopes.length > 0 ? scopes : ['webhook'],
    expiresAt,
    createdBy: user._id,
  })

  return {
    id: apiKeyDoc._id.toString(),
    name: apiKeyDoc.name,
    keyPrefix: apiKeyDoc.keyPrefix,
    rawKey, // Return raw key ONLY ONCE to client
    scopes: apiKeyDoc.scopes,
    expiresAt: apiKeyDoc.expiresAt,
    createdAt: apiKeyDoc.createdAt,
  }
}

export const revokeTenantApiKey = async (
  keyId: string,
  user: IUser
): Promise<void> => {
  const apiKey = await ApiKey.findOne({
    _id: keyId,
    brokerageId: user.brokerageId,
  })

  if (!apiKey) {
    throw new AppError('API key not found', HTTP_STATUS.NOT_FOUND)
  }

  if (apiKey.revokedAt) {
    throw new AppError('API key is already revoked', HTTP_STATUS.BAD_REQUEST)
  }

  apiKey.revokedAt = new Date()
  await apiKey.save()
}
