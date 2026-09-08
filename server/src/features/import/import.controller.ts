import { Request, Response, NextFunction } from 'express'
import { previewCsvFile, executeCsvImport } from './import.service.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { AppError } from '../../middleware/errorHandler.js'

// POST /api/import/preview
export const previewImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    let csvBuffer: Buffer | null = null

    if (req.file) {
      csvBuffer = req.file.buffer
    } else if (req.body?.csvContent) {
      csvBuffer = Buffer.from(req.body.csvContent, 'utf-8')
    }

    if (!csvBuffer) {
      throw new AppError('No CSV file or text content provided for preview', HTTP_STATUS.BAD_REQUEST)
    }

    const preview = previewCsvFile(csvBuffer)
    sendSuccess(res, preview, 'CSV file parsed and mapped successfully', HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}

// POST /api/import/confirm
export const confirmImport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) return
    let csvBuffer: Buffer | undefined = undefined
    if (req.file) {
      csvBuffer = req.file.buffer
    }

    const payload = req.body
    if (typeof payload.mapping === 'string') {
      payload.mapping = JSON.parse(payload.mapping)
    }

    const result = await executeCsvImport(payload, req.user, csvBuffer)
    sendSuccess(res, result, `Import completed: ${result.insertedCount} inserted, ${result.updatedCount} updated, ${result.failedCount} failed`, HTTP_STATUS.OK)
  } catch (error) {
    next(error)
  }
}
