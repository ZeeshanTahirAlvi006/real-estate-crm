import mongoose from 'mongoose'
import { CallLog, ICallLog } from '../../models/CallLog.js'
import { VoicemailDrop, IVoicemailDrop } from '../../models/VoicemailDrop.js'
import { DialerQueueItem } from '../../models/DialerQueueItem.js'
import { Contact, IContact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { IUser } from '../../models/User.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { matchLocalPresence } from './localPresence.js'
import { generateCallSummary } from './transcription.service.js'
import { getSocketServer } from '../../config/socket.js'
import {
  CallLogResponseDto,
  VoicemailDropDto,
  DialerQueueContactDto,
  SaveDispositionInput,
  DialerStatsDto,
  EnqueueContactsInput,
  StartParallelSessionInput,
  StartParallelSessionResult,
} from './dialer.types.js'

// ── Default Voicemail Seeds ─────────────────────────────
const DEFAULT_VOICEMAIL_SEEDS = [
  {
    name: 'Quick Follow Up',
    title: 'Quick Follow Up',
    audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
    durationSeconds: 24,
    category: 'followup' as const,
    isDefault: true,
  },
  {
    name: 'Price Drop Alert',
    title: 'Price Drop Alert',
    audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
    durationSeconds: 28,
    category: 'price_drop' as const,
    isDefault: false,
  },
  {
    name: 'Off-Market Opportunity',
    title: 'Off-Market Opportunity',
    audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
    durationSeconds: 32,
    category: 'seller_equity' as const,
    isDefault: false,
  },
]

// ── Formatters ──────────────────────────────────────────
const formatCallLogDto = (log: ICallLog): CallLogResponseDto => ({
  id: log._id.toString(),
  contactId: log.contactId.toString(),
  contactName: log.contactName,
  contactPhone: log.contactPhone,
  agentId: log.agentId.toString(),
  agentName: log.agentName,
  durationSeconds: log.durationSeconds,
  direction: log.direction,
  disposition: log.disposition,
  recordingUrl: log.recordingUrl,
  liveTranscript: log.liveTranscript,
  sentiment: log.sentiment,
  aiSummary: log.aiSummary,
  notes: log.notes,
  linesUsed: log.linesUsed,
  lineIndex: log.lineIndex,
  createdAt: log.createdAt.toISOString(),
})

const formatVoicemailDropDto = (drop: IVoicemailDrop): VoicemailDropDto => ({
  id: drop._id.toString(),
  name: drop.name,
  title: drop.title,
  audioUrl: drop.audioUrl,
  durationSeconds: drop.durationSeconds,
  category: drop.category,
  isDefault: drop.isDefault,
})

// ── 1. Smart Queue Generator with Local Presence ─────────
export const getSmartQueue = async (
  tenantFilter: Record<string, any>
): Promise<DialerQueueContactDto[]> => {
  // Check if explicit items are queued
  const queuedItems = await DialerQueueItem.find({
    ...tenantFilter,
    status: 'queued',
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(50)
    .populate('contactId')
    .lean()

  if (queuedItems.length > 0) {
    const results: DialerQueueContactDto[] = []
    for (const item of queuedItems) {
      const c = item.contactId as unknown as IContact
      if (c && !c.isDeleted && !c.tags?.some((t) => ['DNC', 'dnc', 'Do Not Call'].includes(t))) {
        const isDnc = c.tags?.some((t) => ['DNC', 'dnc'].includes(t))
        const phone = c.phone || ''
        results.push({
          id: item._id.toString(),
          contactId: c._id.toString(),
          firstName: c.firstName,
          lastName: c.lastName,
          phone,
          email: c.email,
          leadScore: c.leadScore,
          leadSource: c.leadSource,
          dncStatus: isDnc ? 'dnc_federal' : 'clean',
          lastContactedAt: c.lastContactedAt?.toISOString(),
          propertyInterest: c.propertyInterests?.[0],
          notes: c.notes,
          priority: item.priority,
          localPresence: phone ? matchLocalPresence(phone) : undefined,
        })
      }
    }
    if (results.length > 0) return results
  }

  // Auto-generate Smart Queue from Contacts
  const filter = {
    ...tenantFilter,
    isDeleted: false,
    phone: { $exists: true, $ne: '' },
    tags: { $nin: ['DNC', 'dnc', 'Do Not Call'] },
  }

  // Load contacts sorted by Lead Score (descending) and uncalled first
  const contacts = ((await Contact.find(filter)
    .sort({ lastContactedAt: 1, leadScore: -1 })
    .limit(50)
    .lean()) as unknown) as IContact[]

  return contacts.map((c, index) => {
    const priority = Math.max(50, Math.min(100, (c.leadScore || 50) + (c.lastContactedAt ? 0 : 20)))
    const phone = c.phone || ''
    return {
      id: c._id.toString(),
      contactId: c._id.toString(),
      firstName: c.firstName,
      lastName: c.lastName,
      phone,
      email: c.email,
      leadScore: c.leadScore,
      leadSource: c.leadSource,
      dncStatus: 'clean',
      lastContactedAt: c.lastContactedAt ? new Date(c.lastContactedAt).toISOString() : undefined,
      propertyInterest: c.propertyInterests?.[0],
      notes: c.notes,
      priority: priority - index,
      localPresence: phone ? matchLocalPresence(phone) : undefined,
    }
  })
}

// ── 2. Enqueue Contacts Manually ────────────────────────
export const enqueueContacts = async (
  input: EnqueueContactsInput,
  caller: IUser
): Promise<{ enqueuedCount: number }> => {
  const brokerageId = caller.brokerageId
  let count = 0

  for (const contactId of input.contactIds) {
    if (!mongoose.Types.ObjectId.isValid(contactId)) continue
    const cid = new mongoose.Types.ObjectId(contactId)

    await DialerQueueItem.findOneAndUpdate(
      { brokerageId, contactId: cid },
      {
        brokerageId,
        contactId: cid,
        agentId: caller._id,
        priority: input.priority || 50,
        status: 'queued',
      },
      { upsert: true, new: true }
    )
    count++
  }

  return { enqueuedCount: count }
}

// ── 3. Clear Queue ──────────────────────────────────────
export const clearQueue = async (tenantFilter: Record<string, any>): Promise<{ success: boolean }> => {
  await DialerQueueItem.updateMany(
    { ...tenantFilter, status: 'queued' },
    { status: 'completed' }
  )
  return { success: true }
}

// ── 4. Save Call Disposition + AI Summary + Activity ─────
export const saveCallDisposition = async (
  input: SaveDispositionInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<CallLogResponseDto> => {
  const brokerageId = caller.brokerageId
  const contactId = new mongoose.Types.ObjectId(input.contactId)

  // Default demo recording URL if none supplied
  const recordingUrl =
    input.recordingUrl || 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3'

  let finalAiSummary = input.aiSummary
  let finalSentiment: 'positive' | 'neutral' | 'negative' = input.sentiment || 'neutral'
  let nextAction = ''

  // Auto-generate AI summary from live transcript if transcript exists
  if (input.liveTranscript && !finalAiSummary) {
    try {
      const summaryResult = await generateCallSummary(
        input.liveTranscript,
        input.contactName,
        input.durationSeconds
      )
      finalAiSummary = summaryResult.summary
      finalSentiment =
        summaryResult.sentiment === 'positive' || summaryResult.sentiment === 'ready_to_close'
          ? 'positive'
          : summaryResult.sentiment === 'skeptical'
            ? 'negative'
            : 'neutral'
      nextAction = summaryResult.nextActionSuggestion
    } catch {
      finalAiSummary = `Call completed (${input.durationSeconds}s) with disposition: ${input.disposition}`
    }
  }

  // 1. Create CallLog
  const log = await CallLog.create({
    brokerageId,
    contactId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    agentId: caller._id,
    agentName: `${caller.firstName} ${caller.lastName}`,
    durationSeconds: input.durationSeconds,
    direction: input.direction || 'outbound',
    disposition: input.disposition,
    recordingUrl,
    liveTranscript: input.liveTranscript,
    sentiment: finalSentiment,
    aiSummary: finalAiSummary,
    notes: input.notes,
    linesUsed: input.linesUsed || 1,
    lineIndex: input.lineIndex || 0,
  })

  // 2. Load Contact & Update
  const contact = await Contact.findById(contactId)
  if (contact) {
    contact.lastContactedAt = new Date()

    // If DNC requested, auto-tag with DNC and adjust status
    if (input.disposition === 'dnc_requested') {
      if (!contact.tags) contact.tags = []
      if (!contact.tags.includes('DNC')) contact.tags.push('DNC')
      if (!contact.tags.includes('Do Not Call')) contact.tags.push('Do Not Call')
      contact.status = 'do_not_contact'

      // Skip any remaining queue items for this contact
      await DialerQueueItem.updateMany(
        { contactId, status: 'queued' },
        { status: 'skipped' }
      )
    }

    await contact.save()

    // 3. Create Timeline Activity
    const dispLabel = input.disposition.replace(/_/g, ' ').toUpperCase()
    const summarySuffix = finalAiSummary ? `\n🤖 AI Summary: ${finalAiSummary}` : ''
    const nextActionSuffix = nextAction ? `\n⚡ Suggested Next Step: ${nextAction}` : ''

    await Activity.create({
      contactId: contact._id,
      brokerageId,
      type: 'call',
      description: `Phone Call (${input.durationSeconds}s) — Disposition: ${dispLabel}. ${input.notes || ''}${summarySuffix}${nextActionSuffix}`.trim(),
      metadata: {
        callLogId: log._id.toString(),
        disposition: input.disposition,
        durationSeconds: String(input.durationSeconds),
        recordingUrl,
        aiSummary: finalAiSummary,
        sentiment: finalSentiment,
      },
      createdBy: caller._id,
      createdByName: `${caller.firstName} ${caller.lastName}`,
    })
  }

  // 4. Mark Queue Item as Completed
  await DialerQueueItem.updateMany(
    { contactId, status: 'queued' },
    { status: 'completed', lastAttemptAt: new Date(), $inc: { attemptCount: 1 } }
  )

  // 5. System Audit Event
  await logAuditEvent({
    action: 'call.logged',
    userId: caller._id.toString(),
    resource: 'CallLog',
    resourceId: log._id.toString(),
    details: {
      contactId: input.contactId,
      disposition: input.disposition,
      durationSeconds: input.durationSeconds,
      linesUsed: input.linesUsed,
      aiSummary: finalAiSummary,
    },
    ipAddress: clientIp,
    userAgent,
  })

  return formatCallLogDto(log)
}

// ── 5. Get Paginated Call Logs ──────────────────────────
export const getCallLogs = async (
  query: { page?: number; limit?: number; disposition?: string; search?: string },
  tenantFilter: Record<string, any>
): Promise<{ logs: CallLogResponseDto[]; total: number }> => {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 25))
  const skip = (page - 1) * limit

  const filter: Record<string, any> = { ...tenantFilter }
  if (query.disposition && query.disposition !== 'all') {
    filter.disposition = query.disposition
  }
  if (query.search) {
    const regex = new RegExp(query.search, 'i')
    filter.$or = [{ contactName: regex }, { contactPhone: regex }, { agentName: regex }]
  }

  const [logs, total] = await Promise.all([
    ((await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()) as unknown) as Promise<ICallLog[]>,
    CallLog.countDocuments(filter),
  ])

  return {
    logs: logs.map(formatCallLogDto),
    total,
  }
}

// ── 6. Get or Seed Voicemail Drops ──────────────────────
export const getVoicemailDrops = async (
  tenantFilter: Record<string, any>,
  caller: IUser
): Promise<VoicemailDropDto[]> => {
  let drops = ((await VoicemailDrop.find(tenantFilter).lean()) as unknown) as IVoicemailDrop[]

  if (drops.length === 0 && caller.brokerageId) {
    const seeded = await Promise.all(
      DEFAULT_VOICEMAIL_SEEDS.map((seed) =>
        VoicemailDrop.create({
          ...seed,
          brokerageId: caller.brokerageId,
          createdBy: caller._id,
        })
      )
    )
    drops = seeded.map((s) => s.toObject() as IVoicemailDrop)
  }

  return drops.map(formatVoicemailDropDto)
}

// ── 7. Create Custom Voicemail Drop ─────────────────────
export const createVoicemailDrop = async (
  input: {
    name: string
    title: string
    audioUrl: string
    durationSeconds?: number
    category?: any
    isDefault?: boolean
  },
  caller: IUser
): Promise<VoicemailDropDto> => {
  const brokerageId = caller.brokerageId

  if (input.isDefault) {
    await VoicemailDrop.updateMany({ brokerageId }, { isDefault: false })
  }

  const drop = await VoicemailDrop.create({
    ...input,
    brokerageId,
    createdBy: caller._id,
  })

  return formatVoicemailDropDto(drop)
}

// ── 8. Start Multi-Line (1 / 3 / 5-Line) Parallel Session ─
export const startParallelSession = async (
  input: StartParallelSessionInput,
  caller: IUser
): Promise<StartParallelSessionResult> => {
  const sessionId = `par_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  const lines = input.targets.slice(0, input.lineCount).map((target, idx) => {
    const localPres = matchLocalPresence(target.phone, caller.brokerageId?.toString())
    return {
      lineIndex: idx,
      contactId: target.id,
      contactName: target.name,
      contactPhone: target.phone,
      state: 'dialing' as const,
      localPresence: localPres,
    }
  })

  // Broadcast WebSocket session event to brokerage room
  const io = getSocketServer()
  if (io && caller.brokerageId) {
    io.to(`brokerage:${caller.brokerageId.toString()}`).emit('dialer:parallel_started', {
      sessionId,
      agentId: caller._id.toString(),
      lineCount: input.lineCount,
      lines,
    })
  }

  return {
    sessionId,
    lineCount: input.lineCount,
    lines,
    startedAt: new Date().toISOString(),
  }
}

// ── 9. Real-Time Dialer KPIs & Stats ────────────────────
export const getDialerStats = async (
  tenantFilter: Record<string, any>
): Promise<DialerStatsDto> => {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const filter = { ...tenantFilter, createdAt: { $gte: startOfDay } }
  const todayLogs = ((await CallLog.find(filter).lean()) as unknown) as ICallLog[]

  const totalCallsToday = todayLogs.length
  let totalTalkTimeSeconds = 0
  let connectedCalls = 0
  const dispositionsBreakdown: Record<string, number> = {}

  for (const log of todayLogs) {
    totalTalkTimeSeconds += log.durationSeconds || 0
    dispositionsBreakdown[log.disposition] = (dispositionsBreakdown[log.disposition] || 0) + 1

    if (!['no_answer', 'wrong_number'].includes(log.disposition)) {
      connectedCalls++
    }
  }

  const connectRatePercent =
    totalCallsToday > 0 ? Math.round((connectedCalls / totalCallsToday) * 100) : 0
  const avgDurationSeconds =
    totalCallsToday > 0 ? Math.round(totalTalkTimeSeconds / totalCallsToday) : 0

  return {
    totalCallsToday,
    connectRatePercent,
    totalTalkTimeSeconds,
    avgDurationSeconds,
    dispositionsBreakdown,
  }
}

// ── 10. Twilio Token Generator (with Dev fallback) ───────
export const getTwilioToken = async (
  caller: IUser
): Promise<{ token: string; identity: string; isLiveTwilio: boolean }> => {
  const identity = `agent_${caller._id.toString()}`

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const apiKey = process.env.TWILIO_API_KEY
  const apiSecret = process.env.TWILIO_API_SECRET
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

  if (accountSid && (authToken || (apiKey && apiSecret)) && twimlAppSid) {
    try {
      const twilioPkgName = 'twilio'
      const twilioModule: any = await import(/* @vite-ignore */ twilioPkgName)
      const AccessToken = twilioModule.default.jwt.AccessToken
      const VoiceGrant = AccessToken.VoiceGrant

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true,
      })

      const token = new AccessToken(
        accountSid,
        apiKey || accountSid,
        apiSecret || authToken || '',
        { identity, ttl: 3600 }
      )
      token.addGrant(voiceGrant)

      return {
        token: token.toJwt(),
        identity,
        isLiveTwilio: true,
      }
    } catch {
      // Fall back
    }
  }

  return {
    token: `dev_webrtc_token_${Buffer.from(identity).toString('base64')}_${Date.now()}`,
    identity,
    isLiveTwilio: false,
  }
}
