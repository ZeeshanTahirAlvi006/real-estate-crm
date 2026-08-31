import { Brokerage } from '../models/Brokerage.js'
import {
  scanDuplicates,
  scanEmails,
  scanPhones,
  getHealthScore,
} from '../features/data-health/dataHealth.service.js'
import { cacheGet, cacheSet, cacheDelete } from '../config/redis.js'
import { logAuditEvent } from '../utils/auditLogger.js'
import { logger } from '../utils/logger.js'

const JOB_LOCK_KEY = 'lock:job:data_health_scan'
const LOCK_TTL_SECONDS = 1800 // 30 minutes maximum run lock
let isLocalRunning = false

export interface JobExecutionResult {
  success: boolean
  brokeragesProcessed: number
  totalScanned: number
  totalIssuesFound: number
  durationMs: number
  skipped?: boolean
  error?: string
}

/**
 * Executes a full database data health scan across all active brokerages + Concurrency protection.
 */
export const runDataHealthScanJob = async (): Promise<JobExecutionResult> => {
  const startTime = Date.now()

  // 1. Concurrency Guard (Local Process + Distributed Redis Lock)
  if (isLocalRunning) {
    logger.warn('DataHealthJob Execution skipped: Local job already in progress.')
    return {
      success: false,
      brokeragesProcessed: 0,
      totalScanned: 0,
      totalIssuesFound: 0,
      durationMs: 0,
      skipped: true,
      error: 'Job already running locally',
    }
  }

  const existingLock = await cacheGet(JOB_LOCK_KEY)
  if (existingLock) {
    logger.warn('DataHealthJob Execution skipped: Distributed lock is active.')
    return {
      success: false,
      brokeragesProcessed: 0,
      totalScanned: 0,
      totalIssuesFound: 0,
      durationMs: 0,
      skipped: true,
      error: 'Distributed lock active',
    }
  }

  // Acquire Locks
  isLocalRunning = true
  await cacheSet(JOB_LOCK_KEY, 'locked', LOCK_TTL_SECONDS)

  let brokeragesProcessed = 0
  let totalScanned = 0
  let totalIssuesFound = 0

  try {
    logger.info('Starting scheduled multi-tenant data health scan...')

    // 2. Fetch all active brokerages (lean query for minimal memory footprint)
    const activeBrokerages = await Brokerage.find({ isActive: true })
      .select('_id name')
      .lean()

    if (!activeBrokerages.length) {
      logger.info('No active brokerages found to scan.')
      return {
        success: true,
        brokeragesProcessed: 0,
        totalScanned: 0,
        totalIssuesFound: 0,
        durationMs: Date.now() - startTime,
      }
    }

    // 3. Process each brokerage with error isolation
    for (const brokerage of activeBrokerages) {
      const brokerageStartTime = Date.now()
      const tenantFilter = { brokerageId: brokerage._id }

      try {
        // Run scans in parallel per brokerage for performance
        const [dupResult, emailResult, phoneResult] = await Promise.all([
          scanDuplicates(tenantFilter),
          scanEmails(tenantFilter),
          scanPhones(tenantFilter),
        ])

        // Recalculate and persist DataHealthLog snapshot
        await getHealthScore(tenantFilter)

        const brokerageIssues =
          (dupResult.issuesFound || 0) +
          (emailResult.issuesFound || 0) +
          (phoneResult.issuesFound || 0)

        const brokerageScanned = dupResult.scannedCount || 0
        totalScanned += brokerageScanned
        totalIssuesFound += brokerageIssues
        brokeragesProcessed++

        const brokerageDuration = Date.now() - brokerageStartTime

        // Production-safe log (no customer PII)
        logger.info(
          `Brokerage scan complete.Duration=${brokerageDuration}ms`
        )
      } catch (err: any) {
        // Error isolation: single brokerage failure does not stop the loop
        logger.error(
          `Error scanning brokerage: ${err?.message || 'Unknown error'}`
        )
      }
    }

    const totalDuration = Date.now() - startTime
    logger.info(
      `Finished data health scan. TotalDuration=${totalDuration}ms`
    )

    // 4. Record system audit event
    await logAuditEvent({
      action: 'job.data_health_scan.completed',
      resource: 'System',
      details: {
        brokeragesProcessed,
        totalContactsScanned: totalScanned,
        totalIssuesFound,
        durationMs: totalDuration,
      },
      status: 'success',
    })

    return {
      success: true,
      brokeragesProcessed,
      totalScanned,
      totalIssuesFound,
      durationMs: totalDuration,
    }
  } catch (globalError: any) {
    const totalDuration = Date.now() - startTime
    logger.error(`Error during scan execution: ${globalError?.message}`)

    await logAuditEvent({
      action: 'job.data_health_scan.failed',
      resource: 'System',
      status: 'failure',
      failureReason: globalError?.message || 'Unknown fatal error',
      details: { durationMs: totalDuration },
    })

    return {
      success: false,
      brokeragesProcessed,
      totalScanned,
      totalIssuesFound,
      durationMs: totalDuration,
      error: globalError?.message,
    }
  } finally {
    // Release locks
    isLocalRunning = false
    await cacheDelete(JOB_LOCK_KEY)
  }
}
