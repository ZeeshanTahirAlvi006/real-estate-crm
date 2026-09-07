import fs from 'fs'
import path from 'path'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'
import { LOCAL_UPLOADS_DIR, getS3Client } from '../config/storage.js'
import { logger } from './logger.js'

export interface SaveFileResult {
  storageKey: string
  url: string
  provider: 'local' | 's3'
}

export class FileStorageService {
  /**
   * Save a file buffer to storage (Local or S3 depending on env.STORAGE_PROVIDER)
   */
  static async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder: string = 'general'
  ): Promise<SaveFileResult> {
    const timestamp = Date.now()
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${timestamp}_${safeName}`
    const storageKey = `${folder}/${fileName}`

    if (env.STORAGE_PROVIDER === 's3') {
      const s3 = getS3Client()
      if (s3 && env.AWS_S3_BUCKET) {
        await s3.send(
          new PutObjectCommand({
            Bucket: env.AWS_S3_BUCKET,
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
          })
        )

        const baseUrl =
          env.AWS_S3_PUBLIC_URL || `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_S3_REGION}.amazonaws.com`
        const url = `${baseUrl}/${storageKey}`

        return {
          storageKey,
          url,
          provider: 's3',
        }
      }
      logger.warn('S3 requested but S3 client unavailable. Falling back to local storage.')
    }

    // Local Storage Fallback
    const targetSubdir = path.join(LOCAL_UPLOADS_DIR, folder)
    if (!fs.existsSync(targetSubdir)) {
      fs.mkdirSync(targetSubdir, { recursive: true })
    }

    const localFilePath = path.join(targetSubdir, fileName)
    await fs.promises.writeFile(localFilePath, buffer)

    const url = `${env.API_PUBLIC_URL}/uploads/${folder}/${fileName}`

    return {
      storageKey,
      url,
      provider: 'local',
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(storageKey: string, provider: 'local' | 's3'): Promise<boolean> {
    try {
      if (provider === 's3') {
        const s3 = getS3Client()
        if (s3 && env.AWS_S3_BUCKET) {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: env.AWS_S3_BUCKET,
              Key: storageKey,
            })
          )
          return true
        }
      }

      // Local storage deletion
      const localFilePath = path.join(LOCAL_UPLOADS_DIR, storageKey)
      if (fs.existsSync(localFilePath)) {
        await fs.promises.unlink(localFilePath)
      }
      return true
    } catch (error) {
      logger.error(`Failed to delete file with key ${storageKey}:`, error)
      return false
    }
  }
}
