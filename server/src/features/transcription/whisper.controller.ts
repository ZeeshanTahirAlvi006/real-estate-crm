import { Request, Response, NextFunction } from 'express'
import { whisperService } from './whisper.service.js'
import { IUser } from '../../models/User.js'
import { sendSuccess } from '../../utils/apiResponse.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { AppError } from '../../middleware/errorHandler.js'

export class WhisperController {
  /**
   * POST /api/transcription/voice-note
   * Upload audio recording, transcribe with Whisper, extract entities, and update MongoDB Contact & Activity
   */
  async uploadVoiceNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      if (!user) {
        throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED)
      }

      const file = req.file
      if (!file) {
        throw new AppError('Audio file is required (field name: "audio")', HTTP_STATUS.BAD_REQUEST)
      }

      const options = {
        contactId: req.body?.contactId,
        dealId: req.body?.dealId,
        promptHint: req.body?.promptHint,
      }

      const result = await whisperService.processVoiceNote(file, user, options)

      sendSuccess(
        res,
        result,
        result.contactUpdated
          ? 'Voice note transcribed, entity action items extracted, and CRM updated'
          : 'Voice note transcribed and entity action items extracted',
        HTTP_STATUS.CREATED
      )
    } catch (err) {
      next(err)
    }
  }

  /**
   * POST /api/transcription/extract-text
   * Extract real estate entities and scheduled follow-up tasks from raw text/transcript
   */
  async extractFromText(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      if (!user) {
        throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED)
      }

      const { text, contactId } = req.body
      const result = await whisperService.extractFromTextOnly({ text, contactId }, user)

      sendSuccess(res, result, 'Entities extracted successfully')
    } catch (err) {
      next(err)
    }
  }

  /**
   * GET /api/transcription/contact/:contactId
   * Retrieve all voice note activities for a specific contact
   */
  async getContactVoiceNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as IUser
      if (!user) {
        throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED)
      }

      const { contactId } = req.params
      const id = Array.isArray(contactId) ? contactId[0] : contactId
      const notes = await whisperService.getContactVoiceNotes(id, user)

      sendSuccess(res, notes, 'Contact voice notes retrieved')
    } catch (err) {
      next(err)
    }
  }
}

export const whisperController = new WhisperController()
