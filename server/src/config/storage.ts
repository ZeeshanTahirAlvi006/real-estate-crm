import fs from 'fs'
import path from 'path'
import { S3Client } from '@aws-sdk/client-s3'
import { env } from './env.js'
import { logger } from '../utils/logger.js'

export const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')

// Auto-create local uploads directory if using local storage or fallback
export const initStorage = (): void => {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true })
    logger.info(`Created local uploads directory at: ${LOCAL_UPLOADS_DIR}`)
  }
}

// Lazy/Conditional S3 Client Initialization
let s3ClientInstance: S3Client | null = null

export const getS3Client = (): S3Client | null => {
  if (env.STORAGE_PROVIDER !== 's3') {
    return null
  }

  if (!s3ClientInstance) {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.AWS_S3_BUCKET) {
      logger.warn('⚠️ AWS S3 credentials missing in environment. S3 uploads will fail.')
      return null
    }

    s3ClientInstance = new S3Client({
      region: env.AWS_S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
    logger.info('☁️ AWS S3 client initialized')
  }

  return s3ClientInstance
}

// Initialize local storage directory immediately on load
initStorage()
