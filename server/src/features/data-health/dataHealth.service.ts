import mongoose from 'mongoose'
import { Contact, IContact } from '../../models/Contact.js'
import { Deal } from '../../models/Deal.js'
import { Activity } from '../../models/Activity.js'
import { DuplicateCandidate } from '../../models/DuplicateCandidate.js'
import { DataHealthLog } from '../../models/DataHealthLog.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import { logger } from '../../utils/logger.js'
import { BoundedLruCache } from '../../utils/lruCache.js'
import { cacheGet, cacheSet, cacheInvalidatePattern } from '../../config/redis.js'
import { buildCacheKey, safeJsonParse, recordDbMetric } from '../../utils/cacheHelper.js'
import {
  jaroWinklerSimilarity,
  normalizePhone,
  isValidPhoneFormat,
  isValidEmailSyntax,
  batchVerifyDomains,
} from './fuzzyMatcher.js'
import {
  DataHealthScoreResponse,
  DuplicateCandidateDto,
  DuplicateContactSummary,
  MergeContactInput,
  ScanResultDto,
  ContactDataIssue,
  ContactWithDataIssues,
} from './dataHealth.types.js'

// ── Two-Tier Caching Invariants (PERF-R-003, DI-003) ──────────────
export const healthScoreL1Cache = new BoundedLruCache<DataHealthScoreResponse>(500, 60)
export const duplicateCandidatesL1Cache = new BoundedLruCache<DuplicateCandidateDto[]>(500, 60)

export const invalidateDataHealthCache = async (brokerageId?: string): Promise<void> => {
  healthScoreL1Cache.clear()
  duplicateCandidatesL1Cache.clear()

  if (brokerageId) {
    try {
      await cacheInvalidatePattern(`pp:${brokerageId}:data-health:*`)
    } catch (err: any) {
      logger.warn(`[Cache] Redis invalidation failed for brokerage ${brokerageId}: ${err.message}`)
    }
  }
}

// ── Grade Calculator Helper ─────────────────────────────
const calculateGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ── Batch Counts Aggregator (Eliminates N+1 Queries) ────
export const getBatchedEntityCounts = async (
  contactIds: mongoose.Types.ObjectId[]
): Promise<{ dealCounts: Map<string, number>; activityCounts: Map<string, number> }> => {
  if (contactIds.length === 0) {
    return { dealCounts: new Map(), activityCounts: new Map() }
  }

  const [dealAgg, actAgg] = await Promise.all([
    Deal.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { contactId: { $in: contactIds }, isDeleted: false } },
      { $group: { _id: '$contactId', count: { $sum: 1 } } },
    ]),
    Activity.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { contactId: { $in: contactIds } } },
      { $group: { _id: '$contactId', count: { $sum: 1 } } },
    ]),
  ])

  const dealCounts = new Map<string, number>()
  for (const item of dealAgg) {
    dealCounts.set(item._id.toString(), item.count)
  }

  const activityCounts = new Map<string, number>()
  for (const item of actAgg) {
    activityCounts.set(item._id.toString(), item.count)
  }

  return { dealCounts, activityCounts }
}

// ── Contact Summary Builder (Zero DB Hits) ──────────────
const buildContactSummary = (
  c: any,
  dealCount: number,
  activityCount: number
): DuplicateContactSummary => ({
  id: c._id.toString(),
  firstName: c.firstName,
  lastName: c.lastName,
  email: c.email || '',
  phone: c.phone || '',
  address: c.address,
  city: c.city,
  state: c.state,
  zipCode: c.zipCode,
  tags: c.tags || [],
  leadSource: c.leadSource || 'Manual Entry',
  leadScore: c.leadScore ?? 50,
  dealCount,
  activityCount,
  createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString(),
})

// ── 1. Calculate & Retrieve Data Health Score ───────────
export const getHealthScore = async (
  tenantFilter: Record<string, any>,
  persistLog: boolean = false
): Promise<{ score: DataHealthScoreResponse; source: 'l1' | 'l2' | 'db' }> => {
  const brokerageId = tenantFilter.brokerageId ? String(tenantFilter.brokerageId) : 'global'
  const cacheKey = buildCacheKey(brokerageId, 'data-health', { op: 'score' })

  // L1 In-Memory Hit (< 0.05ms)
  const l1Hit = healthScoreL1Cache.get(cacheKey)
  if (l1Hit && !persistLog) {
    return { score: l1Hit, source: 'l1' }
  }

  // L2 Redis Hit (< 1.0ms)
  if (!persistLog) {
    try {
      const rawL2 = await cacheGet(cacheKey)
      if (rawL2) {
        const parsed = safeJsonParse<DataHealthScoreResponse>(rawL2)
        if (parsed) {
          healthScoreL1Cache.set(cacheKey, parsed, 60)
          return { score: parsed, source: 'l2' }
        }
      }
    } catch (err: any) {
      logger.warn(`[Redis] Error reading cache key ${cacheKey}: ${err.message}. Falling back to DB.`)
    }
  }

  // Database Execution Path (< 10ms target)
  const t0 = process.hrtime.bigint()
  const filter = { ...tenantFilter, isDeleted: false }

  // Projection constraints: only fields needed for health score calculation
  const contacts = await Contact.find(filter)
    .select('_id email phone address tags')
    .lean() as unknown as Array<{ _id: any; email?: string; phone?: string; address?: string; tags?: string[] }>

  const totalContacts = contacts.length

  const duplicatesCount = await DuplicateCandidate.countDocuments({
    ...tenantFilter,
    status: 'pending',
  })

  let unverifiedPhones = 0
  let invalidEmails = 0
  let missingFields = 0

  for (const c of contacts) {
    if (!c.phone || !isValidPhoneFormat(c.phone)) {
      unverifiedPhones++
    }
    if (!c.email || !isValidEmailSyntax(c.email)) {
      invalidEmails++
    }
    if (!c.email || !c.phone || !c.address || (c.tags && c.tags.length === 0)) {
      missingFields++
    }
  }

  const duplicatePenalty = Math.min(30, duplicatesCount * 6)
  const emailPenalty = totalContacts > 0 ? Math.min(25, Math.round((invalidEmails / totalContacts) * 40)) : 0
  const phonePenalty = totalContacts > 0 ? Math.min(25, Math.round((unverifiedPhones / totalContacts) * 40)) : 0
  const missingPenalty = totalContacts > 0 ? Math.min(20, Math.round((missingFields / totalContacts) * 30)) : 0

  const overallScore = Math.max(0, Math.min(100, 100 - (duplicatePenalty + emailPenalty + phonePenalty + missingPenalty)))
  const grade = calculateGrade(overallScore)

  // Persist snapshot log only when explicitly requested (e.g. background scan job, triggerFullScan)
  if (persistLog && tenantFilter.brokerageId) {
    await DataHealthLog.create({
      brokerageId: tenantFilter.brokerageId,
      score: overallScore,
      grade,
      duplicatesFound: duplicatesCount,
      unverifiedPhones,
      invalidEmails,
      missingFields,
      totalContactsScanned: totalContacts,
      scannedAt: new Date(),
    })
  }

  // Load historical trend (last 7 data points) with lean projection
  const logs = await DataHealthLog.find({ ...tenantFilter })
    .select('score scannedAt')
    .sort({ scannedAt: -1 })
    .limit(7)
    .lean()

  const trend = logs.reverse().map((l) => ({
    date: new Date(l.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: l.score,
  }))

  if (trend.length === 0) {
    trend.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: overallScore,
    })
  }

  recordDbMetric('getHealthScore', t0, 30)

  const response: DataHealthScoreResponse = {
    overallScore,
    grade,
    duplicatesFound: duplicatesCount,
    unverifiedPhones,
    invalidEmails,
    missingFields,
    totalContacts,
    lastScanAt: new Date().toISOString(),
    trend,
  }

  // Warm L1 & L2 caches
  healthScoreL1Cache.set(cacheKey, response, 60)
  cacheSet(cacheKey, JSON.stringify(response), 300).catch(() => {})

  return { score: response, source: 'db' }
}

// ── 2. List Pending Duplicate Candidates ────────────────
export const listDuplicateCandidates = async (
  tenantFilter: Record<string, any>
): Promise<{ duplicates: DuplicateCandidateDto[]; source: 'l1' | 'l2' | 'db' }> => {
  const brokerageId = tenantFilter.brokerageId ? String(tenantFilter.brokerageId) : 'global'
  const cacheKey = buildCacheKey(brokerageId, 'data-health', { op: 'duplicates' })

  const l1Hit = duplicateCandidatesL1Cache.get(cacheKey)
  if (l1Hit) {
    return { duplicates: l1Hit, source: 'l1' }
  }

  try {
    const rawL2 = await cacheGet(cacheKey)
    if (rawL2) {
      const parsed = safeJsonParse<DuplicateCandidateDto[]>(rawL2)
      if (parsed) {
        duplicateCandidatesL1Cache.set(cacheKey, parsed, 60)
        return { duplicates: parsed, source: 'l2' }
      }
    }
  } catch (err: any) {
    logger.warn(`[Redis] Error reading duplicates cache: ${err.message}`)
  }

  const t0 = process.hrtime.bigint()

  // Use compound covering index { brokerageId: 1, status: 1, matchScore: -1, createdAt: -1 }
  const candidates = await DuplicateCandidate.find({
    ...tenantFilter,
    status: 'pending',
  })
    .sort({ matchScore: -1, createdAt: -1 })
    .limit(100)
    .populate({
      path: 'primaryContactId',
      select: '_id firstName lastName email phone address city state zipCode tags leadSource leadScore isDeleted createdAt',
    })
    .populate({
      path: 'secondaryContactId',
      select: '_id firstName lastName email phone address city state zipCode tags leadSource leadScore isDeleted createdAt',
    })
    .lean()

  const contactIds: mongoose.Types.ObjectId[] = []
  for (const item of candidates) {
    const c1 = item.primaryContactId as any
    const c2 = item.secondaryContactId as any
    if (c1 && !c1.isDeleted && c1._id) contactIds.push(new mongoose.Types.ObjectId(c1._id))
    if (c2 && !c2.isDeleted && c2._id) contactIds.push(new mongoose.Types.ObjectId(c2._id))
  }

  // Resolve all deal & activity counts in ONE batched aggregation (eliminates N+1)
  const { dealCounts, activityCounts } = await getBatchedEntityCounts(contactIds)

  const results: DuplicateCandidateDto[] = []

  for (const item of candidates) {
    const c1 = item.primaryContactId as any
    const c2 = item.secondaryContactId as any

    if (!c1 || !c2 || c1.isDeleted || c2.isDeleted) {
      continue
    }

    const c1Id = c1._id.toString()
    const c2Id = c2._id.toString()

    results.push({
      id: item._id.toString(),
      contact1: buildContactSummary(c1, dealCounts.get(c1Id) || 0, activityCounts.get(c1Id) || 0),
      contact2: buildContactSummary(c2, dealCounts.get(c2Id) || 0, activityCounts.get(c2Id) || 0),
      matchScore: item.matchScore,
      matchFields: item.matchFields,
      status: item.status,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date(item.createdAt).toISOString(),
    })
  }

  recordDbMetric('listDuplicateCandidates', t0, 10)

  duplicateCandidatesL1Cache.set(cacheKey, results, 60)
  cacheSet(cacheKey, JSON.stringify(results), 300).catch(() => {})

  return { duplicates: results, source: 'db' }
}

// ── 3. High-Performance Blocked Duplicate Scanner ───────
export const scanDuplicates = async (
  tenantFilter: Record<string, any>
): Promise<ScanResultDto> => {
  const t0 = process.hrtime.bigint()

  // Projected lean query ordered by createdAt
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false })
    .select('_id firstName lastName email phone address brokerageId createdAt')
    .sort({ createdAt: 1 })
    .lean() as unknown as Array<{
      _id: mongoose.Types.ObjectId
      firstName: string
      lastName: string
      email?: string
      phone?: string
      address?: string
      brokerageId: mongoose.Types.ObjectId
    }>

  if (contacts.length <= 1) {
    return {
      scannedCount: contacts.length,
      issuesFound: 0,
      message: `Fuzzy scan completed. Analyzed ${contacts.length} contacts, found 0 new duplicate candidate(s).`,
    }
  }

  // Pre-fetch existing candidate pairs into an in-memory hash set to eliminate N+1 queries
  const existingRecords = await DuplicateCandidate.find({
    ...tenantFilter,
  })
    .select('primaryContactId secondaryContactId')
    .lean()

  const existingPairs = new Set<string>()
  for (const r of existingRecords) {
    const id1 = r.primaryContactId.toString()
    const id2 = r.secondaryContactId.toString()
    existingPairs.add(`${id1}:${id2}`)
    existingPairs.add(`${id2}:${id1}`)
  }

  // Blocked clustering: Bucket contacts by exact normalized phone, email, and name tokens
  const phoneBuckets = new Map<string, number[]>()
  const emailBuckets = new Map<string, number[]>()
  const nameBuckets = new Map<string, number[]>()

  for (let idx = 0; idx < contacts.length; idx++) {
    const c = contacts[idx]
    const p = normalizePhone(c.phone)
    if (p && p.length >= 10) {
      const list = phoneBuckets.get(p) || []
      list.push(idx)
      phoneBuckets.set(p, list)
    }

    if (c.email && c.email.includes('@')) {
      const emailNorm = c.email.trim().toLowerCase()
      const list = emailBuckets.get(emailNorm) || []
      list.push(idx)
      emailBuckets.set(emailNorm, list)
    }

    // Name blocking token: first initial + first 3 letters of last name
    const fInit = (c.firstName || '').trim().toLowerCase().charAt(0)
    const lPart = (c.lastName || '').trim().toLowerCase().slice(0, 3)
    if (fInit && lPart) {
      const token = `${fInit}:${lPart}`
      const list = nameBuckets.get(token) || []
      list.push(idx)
      nameBuckets.set(token, list)
    }
  }

  // Build unique candidate comparison pairs (eliminates O(N^2) Cartesian product)
  const candidatePairs = new Set<string>()
  const addPair = (i: number, j: number) => {
    if (i === j) return
    const min = Math.min(i, j)
    const max = Math.max(i, j)
    candidatePairs.add(`${min}:${max}`)
  }

  for (const indices of phoneBuckets.values()) {
    if (indices.length > 1) {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          addPair(indices[i], indices[j])
        }
      }
    }
  }

  for (const indices of emailBuckets.values()) {
    if (indices.length > 1) {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          addPair(indices[i], indices[j])
        }
      }
    }
  }

  for (const indices of nameBuckets.values()) {
    if (indices.length > 1 && indices.length < 50) {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          addPair(indices[i], indices[j])
        }
      }
    }
  }

  const newCandidatesToInsert: any[] = []

  for (const pairKey of candidatePairs) {
    const [iStr, jStr] = pairKey.split(':')
    const i = parseInt(iStr, 10)
    const j = parseInt(jStr, 10)

    const c1 = contacts[i]
    const c2 = contacts[j]

    const id1 = c1._id.toString()
    const id2 = c2._id.toString()

    if (existingPairs.has(`${id1}:${id2}`)) {
      continue
    }

    const matchFields: string[] = []
    let matchScore = 0

    // 1. Email check
    if (c1.email && c2.email && c1.email.trim().toLowerCase() === c2.email.trim().toLowerCase()) {
      matchFields.push('email')
      matchScore = Math.max(matchScore, 100)
    }

    // 2. Phone check
    const phone1 = normalizePhone(c1.phone)
    const phone2 = normalizePhone(c2.phone)
    if (phone1 && phone2 && phone1 === phone2) {
      matchFields.push('phone')
      matchScore = Math.max(matchScore, 95)
    }

    // 3. Name check via Jaro-Winkler
    const fullName1 = `${c1.firstName} ${c1.lastName}`.trim()
    const fullName2 = `${c2.firstName} ${c2.lastName}`.trim()
    const nameSim = jaroWinklerSimilarity(fullName1, fullName2)

    if (nameSim >= 0.88) {
      matchFields.push('name')
      matchScore = Math.max(matchScore, Math.round(nameSim * 100))
    }

    // 4. Address check
    if (c1.address && c2.address) {
      const addrSim = jaroWinklerSimilarity(c1.address, c2.address)
      if (addrSim >= 0.90) {
        matchFields.push('address')
        matchScore = Math.max(matchScore, Math.round(addrSim * 100))
      }
    }

    if (matchScore >= 85 && matchFields.length > 0) {
      newCandidatesToInsert.push({
        brokerageId: c1.brokerageId,
        primaryContactId: c1._id,
        secondaryContactId: c2._id,
        matchScore,
        matchFields,
        status: 'pending',
      })
      existingPairs.add(`${id1}:${id2}`)
    }
  }

  let newDuplicatesFound = 0
  if (newCandidatesToInsert.length > 0) {
    try {
      const inserted = await DuplicateCandidate.insertMany(newCandidatesToInsert, { ordered: false })
      newDuplicatesFound = inserted.length
    } catch (err: any) {
      newDuplicatesFound = err.insertedDocs ? err.insertedDocs.length : newCandidatesToInsert.length
    }
  }

  recordDbMetric('scanDuplicates', t0, 50)
  invalidateDataHealthCache(tenantFilter.brokerageId?.toString()).catch(() => {})

  return {
    scannedCount: contacts.length,
    issuesFound: newDuplicatesFound,
    message: `Fuzzy scan completed. Analyzed ${contacts.length} contacts, found ${newDuplicatesFound} new duplicate candidate(s).`,
  }
}

// ── 4. Scan & Validate Email Deliverability (DNS MX) ────
export const scanEmails = async (
  tenantFilter: Record<string, any>
): Promise<ScanResultDto> => {
  const t0 = process.hrtime.bigint()
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false })
    .select('email')
    .lean() as unknown as Array<{ email?: string }>

  const domains = new Set<string>()
  for (const c of contacts) {
    if (c.email && isValidEmailSyntax(c.email)) {
      const domain = c.email.split('@')[1]?.toLowerCase().trim()
      if (domain) domains.add(domain)
    }
  }

  const domainStatusMap = await batchVerifyDomains(Array.from(domains))

  let invalidCount = 0
  for (const c of contacts) {
    if (!c.email || !isValidEmailSyntax(c.email)) {
      invalidCount++
      continue
    }
    const domain = c.email.split('@')[1]?.toLowerCase().trim()
    if (domain && domainStatusMap.get(domain) === false) {
      invalidCount++
    }
  }

  recordDbMetric('scanEmails', t0, 30)

  return {
    scannedCount: contacts.length,
    issuesFound: invalidCount,
    message: `Email MX verification complete. ${contacts.length} scanned, ${invalidCount} invalid or unresolvable address(es).`,
  }
}

// ── 5. Scan & Validate Phone Formats ────────────────────
export const scanPhones = async (
  tenantFilter: Record<string, any>
): Promise<ScanResultDto> => {
  const t0 = process.hrtime.bigint()
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false })
    .select('phone')
    .lean() as unknown as Array<{ phone?: string }>

  let unverifiedCount = 0
  for (const c of contacts) {
    if (!c.phone || !isValidPhoneFormat(c.phone)) {
      unverifiedCount++
    }
  }

  recordDbMetric('scanPhones', t0, 10)

  return {
    scannedCount: contacts.length,
    issuesFound: unverifiedCount,
    message: `Phone number validation complete. ${contacts.length} scanned, ${unverifiedCount} invalid or unformatted phone(s).`,
  }
}

// ── 6. Merge Duplicate Contacts (Atomic Updates) ────────
export const mergeContacts = async (
  candidateId: string,
  input: MergeContactInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<{ success: boolean; primaryContact: IContact }> => {
  if (!mongoose.Types.ObjectId.isValid(candidateId)) {
    throw new AppError('Invalid duplicate candidate ID', HTTP_STATUS.BAD_REQUEST)
  }

  const candidate = await DuplicateCandidate.findById(new mongoose.Types.ObjectId(candidateId))
  if (!candidate) throw new AppError('Duplicate candidate record not found', HTTP_STATUS.NOT_FOUND)

  if (!mongoose.Types.ObjectId.isValid(input.primaryContactId) || !mongoose.Types.ObjectId.isValid(input.secondaryContactId)) {
    throw new AppError('Invalid contact ID format', HTTP_STATUS.BAD_REQUEST)
  }

  const primaryObjectId = new mongoose.Types.ObjectId(input.primaryContactId)
  const secondaryObjectId = new mongoose.Types.ObjectId(input.secondaryContactId)

  const [primaryContact, secondaryContact] = await Promise.all([
    Contact.findById(primaryObjectId),
    Contact.findById(secondaryObjectId),
  ])

  if (!primaryContact || !secondaryContact) {
    throw new AppError('One or both contacts for merge could not be found', HTTP_STATUS.NOT_FOUND)
  }

  // 1. Combine Tags & Interests
  const mergedTags = [...new Set([...primaryContact.tags, ...secondaryContact.tags, ...(input.fieldOverrides?.tags || [])])]
  const mergedInterests = [...new Set([...(primaryContact.propertyInterests || []), ...(secondaryContact.propertyInterests || [])])]

  // 2. Combine Notes
  let mergedNotes = primaryContact.notes || ''
  if (secondaryContact.notes && secondaryContact.notes !== primaryContact.notes) {
    mergedNotes = mergedNotes ? `${mergedNotes}\n\n[Merged Note]: ${secondaryContact.notes}` : secondaryContact.notes
  }
  if (input.fieldOverrides?.notes) {
    mergedNotes = input.fieldOverrides.notes
  }

  // 3. Apply Field Overrides
  if (input.fieldOverrides?.firstName) primaryContact.firstName = input.fieldOverrides.firstName
  if (input.fieldOverrides?.lastName) primaryContact.lastName = input.fieldOverrides.lastName
  if (input.fieldOverrides?.email) primaryContact.email = input.fieldOverrides.email
  if (input.fieldOverrides?.phone) primaryContact.phone = input.fieldOverrides.phone
  if (input.fieldOverrides?.address) primaryContact.address = input.fieldOverrides.address
  if (input.fieldOverrides?.city) primaryContact.city = input.fieldOverrides.city
  if (input.fieldOverrides?.state) primaryContact.state = input.fieldOverrides.state
  if (input.fieldOverrides?.zipCode) primaryContact.zipCode = input.fieldOverrides.zipCode

  primaryContact.tags = mergedTags
  primaryContact.propertyInterests = mergedInterests
  primaryContact.notes = mergedNotes
  await primaryContact.save()

  // 4. Atomic updates for Deals, Activities, Secondary Contact, Candidate
  const [dealsReassigned, activitiesReassigned] = await Promise.all([
    Deal.updateMany(
      { contactId: secondaryContact._id },
      {
        contactId: primaryContact._id,
        contactName: `${primaryContact.firstName} ${primaryContact.lastName}`,
      }
    ),
    Activity.updateMany(
      { contactId: secondaryContact._id },
      { contactId: primaryContact._id }
    ),
    Contact.findByIdAndUpdate(secondaryObjectId, { $set: { isDeleted: true } }),
    DuplicateCandidate.findByIdAndUpdate(candidate._id, {
      $set: { status: 'merged', mergedAt: new Date() },
    }),
  ])

  // Invalidate tenant data health cache
  invalidateDataHealthCache(primaryContact.brokerageId.toString()).catch(() => {})

  // Decoupled Background Activity & Audit Logging (project.md § Other Issues #5)
  queueMicrotask(() => {
    Activity.create({
      contactId: primaryContact._id,
      brokerageId: primaryContact.brokerageId,
      type: 'contact_merged',
      description: `Merged with duplicate record "${secondaryContact.firstName} ${secondaryContact.lastName}" (${secondaryContact.email || secondaryContact.phone}). Reassigned ${dealsReassigned.modifiedCount} deal(s) and ${activitiesReassigned.modifiedCount} activity log(s).`,
      metadata: {
        candidateId: candidate._id.toString(),
        secondaryContactId: secondaryContact._id.toString(),
        dealsReassigned: String(dealsReassigned.modifiedCount),
        activitiesReassigned: String(activitiesReassigned.modifiedCount),
      },
      createdBy: caller._id,
      createdByName: `${caller.firstName} ${caller.lastName}`,
    }).catch((err) => logger.warn(`[Merge] Background activity log failed: ${err.message}`))

    logAuditEvent({
      action: 'contact.merged',
      userId: caller._id.toString(),
      resource: 'Contact',
      resourceId: primaryContact._id.toString(),
      details: {
        secondaryContactId: secondaryContact._id.toString(),
        dealsReassigned: dealsReassigned.modifiedCount,
        activitiesReassigned: activitiesReassigned.modifiedCount,
      },
      ipAddress: clientIp,
      userAgent,
    }).catch((err) => logger.warn(`[Merge] Background audit log failed: ${err.message}`))
  })

  return { success: true, primaryContact }
}

// ── 7. Dismiss Duplicate Candidate ──────────────────────
export const dismissDuplicate = async (
  candidateId: string,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<{ success: boolean }> => {
  if (!mongoose.Types.ObjectId.isValid(candidateId)) {
    throw new AppError('Invalid duplicate candidate ID', HTTP_STATUS.BAD_REQUEST)
  }

  const updated = await DuplicateCandidate.findByIdAndUpdate(
    new mongoose.Types.ObjectId(candidateId),
    { $set: { status: 'dismissed', dismissedAt: new Date() } },
    { new: true }
  ).lean()

  if (!updated) throw new AppError('Duplicate candidate not found', HTTP_STATUS.NOT_FOUND)

  invalidateDataHealthCache(updated.brokerageId.toString()).catch(() => {})

  // Decoupled background audit logging
  queueMicrotask(() => {
    logAuditEvent({
      action: 'duplicate_candidate.dismissed',
      userId: caller._id.toString(),
      resource: 'DuplicateCandidate',
      resourceId: candidateId,
      details: { matchScore: updated.matchScore },
      ipAddress: clientIp,
      userAgent,
    }).catch((err) => logger.warn(`[Dismiss] Background audit log failed: ${err.message}`))
  })

  return { success: true }
}

// ── 8. List Contacts with Data Health Issues (With Batched Counts) ──
export const listDataHealthIssues = async (
  tenantFilter: Record<string, any>,
  filterType?: 'all' | 'email' | 'phone',
  search?: string
): Promise<ContactWithDataIssues[]> => {
  const t0 = process.hrtime.bigint()
  const filter = { ...tenantFilter, isDeleted: false }

  // Projected lean query
  const contacts = await Contact.find(filter)
    .select(
      '_id firstName lastName email phone secondaryPhone address city state zipCode leadSource leadScore status tags notes propertyInterests assignedAgentId createdAt updatedAt lastContactedAt'
    )
    .lean() as unknown as IContact[]

  const flaggedContacts: IContact[] = []
  const flaggedMeta: Array<{
    issues: ContactDataIssue[]
    hasInvalidEmail: boolean
    hasInvalidPhone: boolean
    hasMissingFields: boolean
  }> = []

  for (const c of contacts) {
    const issues: ContactDataIssue[] = []
    let hasInvalidEmail = false
    let hasInvalidPhone = false
    let hasMissingFields = false

    // 1. Email check
    if (!c.email || !c.email.trim()) {
      hasInvalidEmail = true
      issues.push({
        type: 'email',
        field: 'email',
        title: 'Missing Email',
        description: 'No email address registered on record',
        severity: 'error',
      })
    } else if (!isValidEmailSyntax(c.email)) {
      hasInvalidEmail = true
      issues.push({
        type: 'email',
        field: 'email',
        title: 'Invalid Email Syntax',
        description: `"${c.email}" violates RFC-5322 standard email syntax`,
        severity: 'error',
      })
    }

    // 2. Phone check
    if (!c.phone || !c.phone.trim()) {
      hasInvalidPhone = true
      issues.push({
        type: 'phone',
        field: 'phone',
        title: 'Missing Phone',
        description: 'No primary phone number on record',
        severity: 'warning',
      })
    } else if (!isValidPhoneFormat(c.phone)) {
      hasInvalidPhone = true
      issues.push({
        type: 'phone',
        field: 'phone',
        title: 'Unformatted Phone',
        description: `"${c.phone}" fails E.164 10-15 digit format standard`,
        severity: 'warning',
      })
    }

    // 3. Incomplete record check
    if (!c.address || (c.tags && c.tags.length === 0)) {
      hasMissingFields = true
      const missingDetails: string[] = []
      if (!c.address) missingDetails.push('Address')
      if (!c.tags || c.tags.length === 0) missingDetails.push('Tags')
      issues.push({
        type: 'missing',
        field: 'profile',
        title: 'Incomplete Record',
        description: `Missing: ${missingDetails.join(', ')}`,
        severity: 'info',
      })
    }

    if (hasInvalidEmail || hasInvalidPhone) {
      if (filterType === 'email' && !hasInvalidEmail) continue
      if (filterType === 'phone' && !hasInvalidPhone) continue

      if (search && search.trim()) {
        const q = search.toLowerCase().trim()
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase()
        const emailMatch = (c.email || '').toLowerCase().includes(q)
        const phoneMatch = (c.phone || '').toLowerCase().includes(q)
        if (!fullName.includes(q) && !emailMatch && !phoneMatch) {
          continue
        }
      }

      flaggedContacts.push(c)
      flaggedMeta.push({ issues, hasInvalidEmail, hasInvalidPhone, hasMissingFields })
    }
  }

  // Batch count deals and activities across all flagged contacts in a single pass (eliminates N+1)
  const contactObjectIds = flaggedContacts.map((c) => new mongoose.Types.ObjectId(c._id as any))
  const { dealCounts, activityCounts } = await getBatchedEntityCounts(contactObjectIds)

  const results: ContactWithDataIssues[] = []
  for (let idx = 0; idx < flaggedContacts.length; idx++) {
    const c = flaggedContacts[idx]
    const meta = flaggedMeta[idx]
    const cId = c._id.toString()

    results.push({
      id: cId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || '',
      phone: c.phone || '',
      secondaryPhone: c.secondaryPhone,
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
      leadSource: c.leadSource || 'Manual Entry',
      leadScore: c.leadScore ?? 50,
      status: c.status || 'active',
      tags: c.tags || [],
      notes: c.notes,
      propertyInterests: c.propertyInterests || [],
      assignedAgentName: c.assignedAgentId ? (c as any).assignedAgentName : undefined,
      dealCount: dealCounts.get(cId) || 0,
      activityCount: activityCounts.get(cId) || 0,
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      lastContactedAt: c.lastContactedAt ? new Date(c.lastContactedAt).toISOString() : undefined,
      hasInvalidEmail: meta.hasInvalidEmail,
      hasInvalidPhone: meta.hasInvalidPhone,
      hasMissingFields: meta.hasMissingFields,
      issues: meta.issues,
    })
  }

  recordDbMetric('listDataHealthIssues', t0, 15)
  return results
}
