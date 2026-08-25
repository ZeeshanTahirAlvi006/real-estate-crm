import crypto from 'crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

// Get 32-byte encryption key buffer from hex string
const getKeyBuffer = (): Buffer => {
  return Buffer.from(env.ENCRYPTION_MASTER_KEY, 'hex')
}

// Encrypt plaintext string using AES-256-GCM
export const encrypt = (plainText: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKeyBuffer(), iv)
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv:authTag:encryptedPayload
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// Decrypt ciphertext string using AES-256-GCM
export const decrypt = (cipherText: string): string => {
  const parts = cipherText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }

  const [ivHex, authTagHex, encryptedPayloadHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKeyBuffer(), iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedPayloadHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Generate random cryptographically secure token (hex)
export const generateSecureToken = (byteLength: number = 32): string => {
  return crypto.randomBytes(byteLength).toString('hex')
}

// Compute SHA-256 hash
export const hashSha256 = (input: string): string => {
  return crypto.createHash('sha256').update(input).digest('hex')
}
