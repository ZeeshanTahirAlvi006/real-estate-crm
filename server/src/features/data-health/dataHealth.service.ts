import { Contact, IContact } from '../../models/Contact.js'
import { Deal } from '../../models/Deal.js'
import { Activity } from '../../models/Activity.js'
import { DuplicateCandidate } from '../../models/DuplicateCandidate.js'
import { DataHealthLog } from '../../models/DataHealthLog.js'
import { IUser } from '../../models/User.js'
import { AppError } from '../../middleware/errorHandler.js'
import { HTTP_STATUS } from '../../utils/constants.js'
import { logAuditEvent } from '../../utils/auditLogger.js'
import {
  jaroWinklerSimilarity,
  normalizePhone,
  isValidPhoneFormat,
  isValidEmailSyntax,
  verifyEmailMx,
} from './fuzzyMatcher.js'
import {
  DataHealthScoreResponse,
  DuplicateCandidateDto,
  DuplicateContactSummary,
  MergeContactInput,
  ScanResultDto,
} from './dataHealth.types.js'

// ── Grade Calculator Helper ─────────────────────────────
const calculateGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ── Contact Summary Serializer ──────────────────────────
const serializeContactSummary = async (contact: IContact): Promise<DuplicateContactSummary> => {
  const [dealCount, activityCount] = await Promise.all([
    Deal.countDocuments({ contactId: contact._id, isDeleted: false }),
    Activity.countDocuments({ contactId: contact._id }),
  ])

  return {
    id: contact._id.toString(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email || '',
    phone: contact.phone || '',
    address: contact.address,
    city: contact.city,
    state: contact.state,
    zipCode: contact.zipCode,
    tags: contact.tags || [],
    leadSource: contact.leadSource,
    leadScore: contact.leadScore,
    dealCount,
    activityCount,
    createdAt: contact.createdAt.toISOString(),
  }
}

// ── 1. Calculate & Retrieve Data Health Score ───────────
export const getHealthScore = async (
  tenantFilter: Record<string, any>
): Promise<DataHealthScoreResponse> => {
  const filter = { ...tenantFilter, isDeleted: false }
  const contacts = await Contact.find(filter).lean() as unknown as IContact[]
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

  // Deduct penalties
  let duplicatePenalty = Math.min(30, duplicatesCount * 6)
  let emailPenalty = totalContacts > 0 ? Math.min(25, Math.round((invalidEmails / totalContacts) * 40)) : 0
  let phonePenalty = totalContacts > 0 ? Math.min(25, Math.round((unverifiedPhones / totalContacts) * 40)) : 0
  let missingPenalty = totalContacts > 0 ? Math.min(20, Math.round((missingFields / totalContacts) * 30)) : 0

  const overallScore = Math.max(0, Math.min(100, 100 - (duplicatePenalty + emailPenalty + phonePenalty + missingPenalty)))
  const grade = calculateGrade(overallScore)

  // Save/Update snapshot log if brokerageId is present
  if (tenantFilter.brokerageId) {
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

  // Load historical trend (last 7 data points)
  const logs = await DataHealthLog.find({ ...tenantFilter })
    .sort({ scannedAt: -1 })
    .limit(7)
    .lean()

  const trend = logs.reverse().map((l) => ({
    date: new Date(l.scannedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: l.score,
  }))

  // If insufficient trend history, supply fallback trajectory
  if (trend.length === 0) {
    trend.push({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: overallScore,
    })
  }

  return {
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
}

// ── 2. List Pending Duplicate Candidates ────────────────
export const listDuplicateCandidates = async (
  tenantFilter: Record<string, any>
): Promise<DuplicateCandidateDto[]> => {
  const candidates = await DuplicateCandidate.find({
    ...tenantFilter,
    status: 'pending',
  })
    .sort({ matchScore: -1, createdAt: -1 })
    .populate('primaryContactId')
    .populate('secondaryContactId')
    .lean()

  const results: DuplicateCandidateDto[] = []

  for (const item of candidates) {
    const c1 = item.primaryContactId as unknown as IContact
    const c2 = item.secondaryContactId as unknown as IContact

    if (!c1 || !c2 || c1.isDeleted || c2.isDeleted) {
      continue
    }

    const [summary1, summary2] = await Promise.all([
      serializeContactSummary(c1),
      serializeContactSummary(c2),
    ])

    results.push({
      id: item._id.toString(),
      contact1: summary1,
      contact2: summary2,
      matchScore: item.matchScore,
      matchFields: item.matchFields,
      status: item.status,
      createdAt: (item.createdAt as Date).toISOString(),
    })
  }

  return results
}

// ── 3. Scan & Detect Fuzzy Duplicate Candidates ─────────
export const scanDuplicates = async (
  tenantFilter: Record<string, any>
): Promise<ScanResultDto> => {
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false })
    .sort({ createdAt: 1 }) // older contacts first
    .lean() as unknown as IContact[]

  let newDuplicatesFound = 0

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const c1 = contacts[i]
      const c2 = contacts[j]

      const matchFields: string[] = []
      let matchScore = 0

      // 1. Email check
      if (c1.email && c2.email && c1.email.trim().toLowerCase() === c2.email.trim().toLowerCase()) {
        matchFields.push('email')
        matchScore = Math.max(matchScore, 100)
      }

      // 2. Phone check (normalized)
      const phone1 = normalizePhone(c1.phone)
      const phone2 = normalizePhone(c2.phone)
      if (phone1 && phone2 && phone1 === phone2) {
        matchFields.push('phone')
        matchScore = Math.max(matchScore, 95)
      }

      // 3. Full name check via Jaro-Winkler
      const fullName1 = `${c1.firstName} ${c1.lastName}`.trim()
      const fullName2 = `${c2.firstName} ${c2.lastName}`.trim()
      const nameSim = jaroWinklerSimilarity(fullName1, fullName2)

      if (nameSim >= 0.88) {
        matchFields.push('name')
        const calculatedScore = Math.round(nameSim * 100)
        matchScore = Math.max(matchScore, calculatedScore)
      }

      // 4. Address check
      if (c1.address && c2.address) {
        const addrSim = jaroWinklerSimilarity(c1.address, c2.address)
        if (addrSim >= 0.90) {
          matchFields.push('address')
          matchScore = Math.max(matchScore, Math.round(addrSim * 100))
        }
      }

      // If confidence >= 85% and matched at least one key field
      if (matchScore >= 85 && matchFields.length > 0) {
        const brokerageId = c1.brokerageId

        // Check if candidate already exists
        const existing = await DuplicateCandidate.findOne({
          brokerageId,
          $or: [
            { primaryContactId: c1._id, secondaryContactId: c2._id },
            { primaryContactId: c2._id, secondaryContactId: c1._id },
          ],
        })

        if (!existing) {
          await DuplicateCandidate.create({
            brokerageId,
            primaryContactId: c1._id, // older
            secondaryContactId: c2._id, // newer
            matchScore,
            matchFields,
            status: 'pending',
          })
          newDuplicatesFound++
        }
      }
    }
  }

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
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false }).lean() as unknown as IContact[]
  let invalidCount = 0

  for (const c of contacts) {
    if (!c.email || !isValidEmailSyntax(c.email)) {
      invalidCount++
      continue
    }
    const isMxValid = await verifyEmailMx(c.email)
    if (!isMxValid) {
      invalidCount++
    }
  }

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
  const contacts = await Contact.find({ ...tenantFilter, isDeleted: false }).lean() as unknown as IContact[]
  let unverifiedCount = 0

  for (const c of contacts) {
    if (!c.phone || !isValidPhoneFormat(c.phone)) {
      unverifiedCount++
    }
  }

  return {
    scannedCount: contacts.length,
    issuesFound: unverifiedCount,
    message: `Phone number validation complete. ${contacts.length} scanned, ${unverifiedCount} invalid or unformatted phone(s).`,
  }
}

// ── 6. Merge Duplicate Contacts ─────────────────────────
export const mergeContacts = async (
  candidateId: string,
  input: MergeContactInput,
  caller: IUser,
  clientIp: string,
  userAgent: string
): Promise<{ success: boolean; primaryContact: IContact }> => {
  const candidate = await DuplicateCandidate.findById(candidateId)
  if (!candidate) throw new AppError('Duplicate candidate record not found', HTTP_STATUS.NOT_FOUND)

  const primaryContact = await Contact.findById(input.primaryContactId)
  const secondaryContact = await Contact.findById(input.secondaryContactId)

  if (!primaryContact || !secondaryContact) {
    throw new AppError('One or both contacts for merge could not be found', HTTP_STATUS.NOT_FOUND)
  }

  // 1. Combine Tags & Property Interests
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

  // 4. Reassign all Deals from secondary to primary
  const dealsReassigned = await Deal.updateMany(
    { contactId: secondaryContact._id },
    {
      contactId: primaryContact._id,
      contactName: `${primaryContact.firstName} ${primaryContact.lastName}`,
    }
  )

  // 5. Reassign all Activities from secondary to primary
  const activitiesReassigned = await Activity.updateMany(
    { contactId: secondaryContact._id },
    { contactId: primaryContact._id }
  )

  // 6. Soft Delete Secondary Contact
  secondaryContact.isDeleted = true
  await secondaryContact.save()

  // 7. Update Candidate Record
  candidate.status = 'merged'
  candidate.mergedAt = new Date()
  await candidate.save()

  // 8. Log timeline activity on Primary Contact
  await Activity.create({
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
  })

  // 9. Log system audit event
  await logAuditEvent({
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
  const candidate = await DuplicateCandidate.findById(candidateId)
  if (!candidate) throw new AppError('Duplicate candidate not found', HTTP_STATUS.NOT_FOUND)

  candidate.status = 'dismissed'
  candidate.dismissedAt = new Date()
  await candidate.save()

  await logAuditEvent({
    action: 'duplicate_candidate.dismissed',
    userId: caller._id.toString(),
    resource: 'DuplicateCandidate',
    resourceId: candidateId,
    details: { matchScore: candidate.matchScore },
    ipAddress: clientIp,
    userAgent,
  })

  return { success: true }
}
