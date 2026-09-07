import { Request, Response, NextFunction } from 'express'
import {
  uploadSingleFile,
  uploadMultipleFiles,
  listBrokerageFiles,
  deleteBrokerageFile,
} from './file.service.js'
import { sendSuccess, sendPaginated } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'

// POST /api/files/upload
export const uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const folder = (req.body?.folder as string) || 'documents'

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const results = await uploadMultipleFiles(req.files as Express.Multer.File[], req.user, folder)
      sendSuccess(res, results, `${results.length} files uploaded successfully`, HTTP_STATUS.CREATED)
      return
    }

    if (req.file) {
      const result = await uploadSingleFile(req.file, req.user, folder)
      sendSuccess(res, result, 'File uploaded successfully', HTTP_STATUS.CREATED)
      return
    }

    sendSuccess(res, null, 'No file uploaded', HTTP_STATUS.BAD_REQUEST)
  } catch (error) {
    next(error)
  }
}

// GET /api/files
export const getFiles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 25
    const { files, total } = await listBrokerageFiles(req.query, req.user)
    sendPaginated(res, files, total, page, limit, 'Files retrieved successfully')
  } catch (error) {
    next(error)
  }
}

// DELETE /api/files/:id
export const removeFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    const fileId = req.params.id as string
    await deleteBrokerageFile(fileId, req.user)
    sendSuccess(res, null, 'File deleted successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
