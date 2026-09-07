import crypto from 'crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

// Derive 32-byte key from ENCRYPTION_MASTER_KEY hex or fallback
const getEncryptionKey = (): Buffer => {
  const masterKey = env.ENCRYPTION_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  return Buffer.from(masterKey, 'hex')
}

/**
 * Encrypt a plain text string using AES-256-GCM
 */
export const encryptText = (text: string): string => {
  if (!text) return ''
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encryptedHex
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt an AES-256-GCM encrypted string
 */
export const decryptText = (encryptedData: string): string => {
  if (!encryptedData) return ''
  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format')
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const key = getEncryptionKey()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Hash API Key using SHA-256 for secure DB storage
 */
export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Generate API key pair: unmasked raw key (returned once), prefix, and SHA-256 hash
 */
export const generateApiKeyPair = (
  prefix: string = 'pk_live'
): { rawKey: string; keyPrefix: string; keyHash: string } => {
  const randomBytes = crypto.randomBytes(24).toString('hex')
  const rawKey = `${prefix}_${randomBytes}`
  const keyPrefix = `${prefix}_${randomBytes.substring(0, 6)}...`
  const keyHash = hashApiKey(rawKey)

  return { rawKey, keyPrefix, keyHash }
}

// Backward-compatibility aliases for existing codebase modules
export const encrypt = (text: string): string => encryptText(text)
export const decrypt = (encryptedData: string): string => decryptText(encryptedData)
export const hashSha256 = (text: string): string => hashApiKey(text)
export const generateSecureToken = (lengthInBytes: number = 32): string =>
  crypto.randomBytes(lengthInBytes).toString('hex')

