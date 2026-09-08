import { runReactivationCampaignJob, ReactivationJobResult } from '../../jobs/reactivation.job.js'
import { logger } from '../../utils/logger.js'

let lastRunResult: ReactivationJobResult | null = null
let lastRunTimestamp: Date | null = null

/**
 * Triggers an ad-hoc execution of the reactivation job outside the cron schedule.
 * Returns the result for API consumers.
 */
export const triggerReactivationJob = async (
  campaignId?: string
): Promise<ReactivationJobResult> => {
  logger.info('ISA Scheduler: Ad-hoc reactivation job triggered.')
  const result = await runReactivationCampaignJob(campaignId)
  lastRunResult = result
  lastRunTimestamp = new Date()
  return result
}

/**
 * Records the result from a scheduled cron execution for status queries.
 */
export const recordScheduledRun = (result: ReactivationJobResult): void => {
  lastRunResult = result
  lastRunTimestamp = new Date()
}

/**
 * Returns the last execution result and timestamp for health/status checks.
 */
export const getIsaSchedulerStatus = (): {
  lastRunTimestamp: string | null
  lastRunResult: ReactivationJobResult | null
} => ({
  lastRunTimestamp: lastRunTimestamp?.toISOString() || null,
  lastRunResult,
})
