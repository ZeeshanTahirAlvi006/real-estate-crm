import { Request, Response, NextFunction } from 'express'
import { cmaStoryService } from './cmaStory.service.js'
import { sendSuccess } from '../../../utils/apiResponse.js'
import { logger } from '../../../utils/logger.js'
import { GenerateCmaStoryInput } from './cmaStory.types.js'

export class CmaStoryController {
  /**
   * POST /api/seller-radar/cma/narrative
   * Synthesize MLS comps into personalized valuation storytelling
   */
  async generateNarrative(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: GenerateCmaStoryInput = req.body

      logger.info(
        `Synthesizing CMA narrative in ${input.mode} mode with ${input.comparables?.length || 0} comps`
      )

      const narrative = await cmaStoryService.generateNarrative(input)

      sendSuccess(res, narrative, 'CMA valuation narrative synthesized successfully', 200)
    } catch (err: any) {
      logger.error('Error generating CMA narrative:', err?.message || err)
      next(err)
    }
  }
}

export const cmaStoryController = new CmaStoryController()
