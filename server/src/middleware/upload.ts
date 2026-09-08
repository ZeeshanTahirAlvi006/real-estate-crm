import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import { AppError } from '../middleware/errorHandler.js'
import { HTTP_STATUS } from '../utils/constants.js'

// Use memory storage for seamless processing (local buffer, S3 streaming, or CSV parsing)
const storage = multer.memoryStorage()

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Documents & Spreadsheets
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      new AppError(
        `File type '${file.mimetype}' is not supported. Allowed formats: images, PDF, CSV, Excel, Word, TXT`,
        HTTP_STATUS.BAD_REQUEST
      )
    )
  }
}

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter,
})
