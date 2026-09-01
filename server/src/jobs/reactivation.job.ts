import { ReactivationCampaign, IReactivationCampaign } from '../models/ReactivationCampaign.js'
import { Contact, IContact } from '../models/Contact.js'
import { Activity } from '../models/Activity.js'
import { checkFairHousingCompliance } from '../features/ai-isa/fairHousingGuard.js'
import { cacheGet, cacheSet, cacheDelete } from '../config/redis.js'
import { logAuditEvent } from '../utils/auditLogger.js'
import { logger } from '../utils/logger.js'

const JOB_LOCK_KEY = 'lock:job:reactivation_campaign'
const LOCK_TTL_SECONDS = 1800 // 30-minute max execution window
const BATCH_SIZE = 50 // Contacts processed per campaign per run
let isLocalRunning = false

export interface ReactivationJobResult {
  success: boolean
  campaignsProcessed: number
  totalContacted: number
  totalSkipped: number
  durationMs: number
  skipped?: boolean
  error?: string
}

/**
 * Generates a personalized reactivation message for a contact by interpolating
 * template variables. Uses deterministic variable substitution for speed (no LLM call).
 * Fair Housing compliance is enforced on every generated message.
 */
const generatePersonalizedMessage = (
  template: string,
  contact: Pick<IContact, 'firstName' | 'lastName' | 'city' | 'propertyInterests'>
): { text: string; passed: boolean } => {
  let text = template
    .replace(/\{\{firstName\}\}/gi, contact.firstName || 'there')
    .replace(/\{\{lastName\}\}/gi, contact.lastName || '')
    .replace(/\{\{city\}\}/gi, contact.city || 'your area')
    .replace(/\{\{propertyInterests\}\}/gi, (contact.propertyInterests || []).slice(0, 2).join(', ') || 'homes')

  // Enforce Fair Housing compliance on generated copy
  const check = checkFairHousingCompliance(text)
  if (!check.passed) {
    return { text: '', passed: false }
  }

  return { text, passed: true }
}

/**
 * Executes the autonomous reactivation campaign job.
 * Queries dormant leads per active campaign, generates personalized outreach,
 * logs Activity records, and updates campaign counters atomically.
 *
 * @param targetCampaignId - Optional: run for a single campaign. Omit for all active campaigns.
 */
export const runReactivationCampaignJob = async (
  targetCampaignId?: string
): Promise<ReactivationJobResult> => {
  const startTime = Date.now()

  // ── 1. Concurrency Guard ──────────────────────────────
  if (isLocalRunning) {
    logger.warn('ReactivationJob: Skipped — local execution already in progress.')
    return {
      success: false, campaignsProcessed: 0, totalContacted: 0,
      totalSkipped: 0, durationMs: 0, skipped: true,
      error: 'Job already running locally',
    }
  }

  const existingLock = await cacheGet(JOB_LOCK_KEY)
  if (existingLock) {
    logger.warn('ReactivationJob: Skipped — distributed lock active.')
    return {
      success: false, campaignsProcessed: 0, totalContacted: 0,
      totalSkipped: 0, durationMs: 0, skipped: true,
      error: 'Distributed lock active',
    }
  }

  // Acquire locks
  isLocalRunning = true
  await cacheSet(JOB_LOCK_KEY, 'locked', LOCK_TTL_SECONDS)

  let campaignsProcessed = 0
  let totalContacted = 0
  let totalSkipped = 0

  try {
    logger.info('ReactivationJob: Starting campaign execution cycle.')

    // ── 2. Fetch target campaigns ───────────────────────
    const campaignQuery: Record<string, any> = { status: 'active' }
    if (targetCampaignId) {
      campaignQuery._id = targetCampaignId
    }

    const activeCampaigns = await ReactivationCampaign.find(campaignQuery)
      .select('_id brokerageId name channel messageTemplate dormantDaysThreshold')
      .lean() as Pick<
        IReactivationCampaign,
        '_id' | 'brokerageId' | 'name' | 'channel' | 'messageTemplate' | 'dormantDaysThreshold'
      >[]

    if (!activeCampaigns.length) {
      logger.info('ReactivationJob: No active campaigns found.')
      return {
        success: true, campaignsProcessed: 0, totalContacted: 0,
        totalSkipped: 0, durationMs: Date.now() - startTime,
      }
    }

    // ── 3. Process each campaign with error isolation ───
    for (const campaign of activeCampaigns) {
      const campaignStartTime = Date.now()

      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - (campaign.dormantDaysThreshold || 90))

        // Find dormant contacts: not deleted, not DNC/archived, and not contacted since cutoff
        const dormantContacts = await Contact.find({
          brokerageId: campaign.brokerageId,
          isDeleted: false,
          status: { $nin: ['do_not_contact', 'archived'] },
          $or: [
            { lastContactedAt: { $lt: cutoffDate } },
            { lastContactedAt: { $exists: false } },
          ],
          tags: { $ne: 'REACTIVATION_SENT' }, // Skip already-reactivated contacts in this cycle
        })
          .select('_id firstName lastName city propertyInterests brokerageId tags lastContactedAt')
          .limit(BATCH_SIZE)
          .lean() as Pick<
            IContact,
            '_id' | 'firstName' | 'lastName' | 'city' | 'propertyInterests' | 'brokerageId' | 'tags' | 'lastContactedAt'
          >[]

        if (!dormantContacts.length) {
          logger.info(`ReactivationJob: No dormant contacts for campaign. Duration=${Date.now() - campaignStartTime}ms`)
          campaignsProcessed++
          continue
        }

        let batchContacted = 0
        let batchSkipped = 0

        // Prepare bulk operations for atomic batch update
        const activityInserts: Array<{
          contactId: any
          brokerageId: any
          type: string
          description: string
          createdByName: string
        }> = []
        const contactUpdateIds: any[] = []

        for (const contact of dormantContacts) {
          const { text, passed } = generatePersonalizedMessage(
            campaign.messageTemplate,
            contact
          )

          if (!passed) {
            batchSkipped++
            continue
          }

          // Queue Activity record
          activityInserts.push({
            contactId: contact._id,
            brokerageId: contact.brokerageId,
            type: campaign.channel,
            description: `[Reactivation] ${text.slice(0, 120)}`,
            createdByName: 'AI Reactivation Engine',
          })

          contactUpdateIds.push(contact._id)
          batchContacted++
        }

        // Batch insert all Activity records in one DB round-trip
        if (activityInserts.length > 0) {
          await Activity.insertMany(activityInserts, { ordered: false })
        }

        // Batch update contacts: set lastContactedAt and add REACTIVATION_SENT tag
        if (contactUpdateIds.length > 0) {
          await Contact.updateMany(
            { _id: { $in: contactUpdateIds } },
            {
              $set: { lastContactedAt: new Date() },
              $addToSet: { tags: 'REACTIVATION_SENT' },
            }
          )
        }

        // Atomic campaign counter update
        await ReactivationCampaign.updateOne(
          { _id: campaign._id },
          {
            $inc: { contactedCount: batchContacted, totalLeads: batchContacted },
            $set: { lastRunAt: new Date(), lastExecutedAt: new Date() },
          }
        )

        totalContacted += batchContacted
        totalSkipped += batchSkipped
        campaignsProcessed++

        logger.info(
          `ReactivationJob: Campaign batch complete. Contacted=${batchContacted} Skipped=${batchSkipped} Duration=${Date.now() - campaignStartTime}ms`
        )
      } catch (err: any) {
        // Error isolation: one campaign failure does not halt the loop
        logger.error(`ReactivationJob: Campaign processing error — ${err?.message || 'Unknown'}`)
      }
    }

    const totalDuration = Date.now() - startTime
    logger.info(`ReactivationJob: Cycle complete. Campaigns=${campaignsProcessed} Contacted=${totalContacted} Duration=${totalDuration}ms`)

    await logAuditEvent({
      action: 'job.reactivation_campaign.completed',
      resource: 'System',
      details: { campaignsProcessed, totalContacted, totalSkipped, durationMs: totalDuration },
      status: 'success',
    })

    return {
      success: true,
      campaignsProcessed,
      totalContacted,
      totalSkipped,
      durationMs: totalDuration,
    }
  } catch (globalError: any) {
    const totalDuration = Date.now() - startTime
    logger.error(`ReactivationJob: Fatal error — ${globalError?.message || 'Unknown'}`)

    await logAuditEvent({
      action: 'job.reactivation_campaign.failed',
      resource: 'System',
      status: 'failure',
      failureReason: globalError?.message || 'Unknown fatal error',
      details: { durationMs: totalDuration },
    })

    return {
      success: false,
      campaignsProcessed,
      totalContacted,
      totalSkipped,
      durationMs: totalDuration,
      error: globalError?.message,
    }
  } finally {
    // Release locks — always runs
    isLocalRunning = false
    await cacheDelete(JOB_LOCK_KEY)
  }
}
