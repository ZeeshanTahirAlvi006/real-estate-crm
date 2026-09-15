import cron, { ScheduledTask } from 'node-cron'
import { runDataHealthScanJob } from './dataHealthScan.job.js'
import { runReactivationCampaignJob } from './reactivation.job.js'
import { runHomeAnniversaryJob } from './homeAnniversary.job.js'
import { recordScheduledRun } from '../features/ai-isa/isa.scheduler.js'
import { logger } from '../utils/logger.js'

export const SYSTEM_TIMEZONE = 'Asia/Karachi'

interface JobRegistryEntry {
  name: string
  cronExpression: string
  task: ScheduledTask
}

const activeJobs: JobRegistryEntry[] = []
let isSchedulerRunning = false

/**
 * Initializes and starts all recurring system background jobs.
 * Enforces timezone (Asia/Karachi) and non-overlapping execution.
 */
export const startScheduler = (): void => {
  if (isSchedulerRunning) {
    logger.warn('[server/src/jobs/scheduler.ts: Line 25] Scheduler is already running. Skipping duplicate startup.')
    return
  }

  logger.info(`[server/src/jobs/scheduler.ts: Line 29] Initializing system background jobs...`)

  try {
    // ── 1. Daily Data Health & Deduplication Scan (2:00 AM PKT) ───────────
    // Cron: 0 2 * * * = At 02:00 AM every day
    const dataHealthTask = cron.schedule(
      '0 2 * * *',
      async () => {
        logger.info('[server/src/jobs/scheduler.ts: Line 37] Triggering scheduled Data Health Scan Job')
        try {
          await runDataHealthScanJob()
        } catch (jobErr: any) {
          logger.error(`[server/src/jobs/scheduler.ts: Line 41] Error running Data Health Scan Job: ${jobErr?.message}`)
        }
      },
      {
        name: 'daily_data_health_scan',
        timezone: SYSTEM_TIMEZONE,
        noOverlap: true,
      }
    )

    activeJobs.push({
      name: 'daily_data_health_scan',
      cronExpression: '0 2 * * * (Daily at 02:00 AM PKT)',
      task: dataHealthTask,
    })

    // ── 2. Daily Reactivation Campaign Scan (3:00 AM PKT) ────────────────
    // Cron: 0 3 * * * = At 03:00 AM every day
    const reactivationTask = cron.schedule(
      '0 3 * * *',
      async () => {
        logger.info('[server/src/jobs/scheduler.ts: Line 62] Triggering scheduled Reactivation Campaign Job')
        try {
          const result = await runReactivationCampaignJob()
          recordScheduledRun(result)
        } catch (jobErr: any) {
          logger.error(`[server/src/jobs/scheduler.ts: Line 67] Error running Reactivation Campaign Job: ${jobErr?.message}`)
        }
      },
      {
        name: 'daily_reactivation_scan',
        timezone: SYSTEM_TIMEZONE,
        noOverlap: true,
      }
    )

    activeJobs.push({
      name: 'daily_reactivation_scan',
      cronExpression: '0 3 * * * (Daily at 03:00 AM PKT)',
      task: reactivationTask,
    })

    // ── 3. Daily Home Purchase Anniversary Scan (4:00 AM PKT) ───────────
    // Cron: 0 4 * * * = At 04:00 AM every day
    const anniversaryTask = cron.schedule(
      '0 4 * * *',
      async () => {
        logger.info('[server/src/jobs/scheduler.ts: Line 88] Triggering scheduled Home Purchase Anniversary Job')
        try {
          await runHomeAnniversaryJob()
        } catch (jobErr: any) {
          logger.error(`[server/src/jobs/scheduler.ts: Line 92] Error running Home Anniversary Job: ${jobErr?.message}`)
        }
      },
      {
        name: 'daily_home_anniversary_scan',
        timezone: SYSTEM_TIMEZONE,
        noOverlap: true,
      }
    )

    activeJobs.push({
      name: 'daily_home_anniversary_scan',
      cronExpression: '0 4 * * * (Daily at 04:00 AM PKT)',
      task: anniversaryTask,
    })

    isSchedulerRunning = true
    logger.info(
      `[server/src/jobs/scheduler.ts: Line 110] Background scheduler started successfully.`
    )
  } catch (error: any) {
    logger.error(`[server/src/jobs/scheduler.ts: Line 113] Failed to initialize cron jobs: ${error?.message}`)
  }
}

/**
 * Gracefully terminates all running cron jobs on server shutdown.
 */
export const stopScheduler = async (): Promise<void> => {
  if (!isSchedulerRunning && activeJobs.length === 0) {
    return
  }

  logger.info('[server/src/jobs/scheduler.ts: Line 125]Stopping all background jobs...')
  for (const job of activeJobs) {
    try {
      await job.task.stop()
    } catch (err: any) {
      logger.warn(`[server/src/jobs/scheduler.ts: Line 130] Error stopping job "${job.name}": ${err?.message}`)
    }
  }

  activeJobs.length = 0
  isSchedulerRunning = false
  logger.info('[server/src/jobs/scheduler.ts: Line 136] All background jobs stopped successfully.')
}

/**
 * Returns current health and registered jobs status of the scheduler.
 */
export const getSchedulerStatus = () => {
  return {
    isRunning: isSchedulerRunning,
    timezone: SYSTEM_TIMEZONE,
    activeJobsCount: activeJobs.length,
    jobs: activeJobs.map((j) => ({
      name: j.name,
      cronExpression: j.cronExpression,
    })),
  }
}
