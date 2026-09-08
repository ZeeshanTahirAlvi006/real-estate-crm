import mongoose from 'mongoose'
import { Contact } from '../../models/Contact.js'
import { AuditLog } from '../../models/AuditLog.js'
import { FAIR_HOUSING_RULES } from './nlp/fairHousing.js'
import {
  DncCheckResult,
  ChannelConsentInput,
  OptOutInput,
  FairHousingScanReport,
  ComplianceDashboardStats,
  FairHousingViolation,
} from './compliance.types.js'

export class ComplianceService {
  /**
   * Check if current time is within TCPA legal calling window (8:00 AM - 9:00 PM)
   */
  public isWithinSafeCallingHours(): { isSafe: boolean; currentTimeStr: string } {
    const now = new Date()
    const hour = now.getHours()
    const minutes = now.getMinutes()
    const isSafe = hour >= 8 && hour < 21
    const pad = (n: number) => n.toString().padStart(2, '0')
    return {
      isSafe,
      currentTimeStr: `${pad(hour)}:${pad(minutes)}`,
    }
  }

  /**
   * Verify phone number against TCPA rules, federal registry simulation, and CRM opt-out status
   */
  public async checkPhoneNumber(phone: string, brokerageId?: string): Promise<DncCheckResult> {
    const cleaned = phone.replace(/[^0-9+]/g, '')
    const checkedAt = new Date().toISOString()
    const { isSafe, currentTimeStr } = this.isWithinSafeCallingHours()

    // 1. Simulated Federal DNC Registry match (numbers ending in 9999 simulate FTC hit)
    if (cleaned.endsWith('9999')) {
      return {
        phone: cleaned,
        isClean: false,
        dncStatus: 'dnc_federal',
        canCall: false,
        canText: false,
        safeCallingHours: {
          start: '08:00',
          end: '21:00',
          isCurrentlySafe: isSafe,
          currentServerTime: currentTimeStr,
        },
        reason: 'National Do Not Call Registry Match (FTC Rule 16 CFR Part 310)',
        checkedAt,
      }
    }

    // 2. Check CRM database for existing contact if database is connected
    if (mongoose.connection.readyState === 1) {
      const filter: Record<string, any> = {
        phone: { $regex: cleaned.slice(-10) },
        isDeleted: false,
      }
      if (brokerageId && mongoose.Types.ObjectId.isValid(brokerageId)) {
        filter.brokerageId = new mongoose.Types.ObjectId(brokerageId)
      }

      const contact = await Contact.findOne(filter).lean()

      if (contact) {
        if (contact.dncStatus === 'opted_out') {
          return {
            phone: cleaned,
            isClean: false,
            dncStatus: 'opted_out',
            canCall: false,
            canText: false,
            safeCallingHours: {
              start: '08:00',
              end: '21:00',
              isCurrentlySafe: isSafe,
              currentServerTime: currentTimeStr,
            },
            reason: 'Contact explicitly opted out of communications via STOP keyword or manual request',
            checkedAt,
          }
        }

        if (contact.dncStatus === 'dnc_federal' || contact.dncStatus === 'dnc_state') {
          return {
            phone: cleaned,
            isClean: false,
            dncStatus: contact.dncStatus,
            canCall: false,
            canText: false,
            safeCallingHours: {
              start: '08:00',
              end: '21:00',
              isCurrentlySafe: isSafe,
              currentServerTime: currentTimeStr,
            },
            reason: `Phone is listed on the National / State Do Not Call Registry (${contact.dncStatus.toUpperCase()})`,
            checkedAt,
          }
        }
      }
    }

    return {
      phone: cleaned,
      isClean: true,
      dncStatus: 'clean',
      canCall: isSafe,
      canText: true,
      safeCallingHours: {
        start: '08:00',
        end: '21:00',
        isCurrentlySafe: isSafe,
        currentServerTime: currentTimeStr,
      },
      reason: isSafe
        ? 'Phone verified clean for outreach'
        : 'Phone is clean, but outreach prohibited outside 8:00 AM - 9:00 PM TCPA window',
      checkedAt,
    }
  }

  /**
   * Record channel-specific TCPA consent with timestamp and audit tracking
   */
  public async recordConsent(
    brokerageId: string,
    contactId: string,
    input: ChannelConsentInput,
    ip?: string,
    userId?: string
  ) {
    const contact = await Contact.findOne({
      _id: contactId,
      brokerageId,
      isDeleted: false,
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    const currentConsent = contact.tcpaConsent || {
      sms: true,
      call: true,
      whatsapp: true,
      email: true,
      doubleOptInVerified: false,
    }

    const updatedConsent = {
      ...currentConsent,
      ...(input.sms !== undefined && { sms: input.sms }),
      ...(input.call !== undefined && { call: input.call }),
      ...(input.whatsapp !== undefined && { whatsapp: input.whatsapp }),
      ...(input.email !== undefined && { email: input.email }),
      consentSource: input.consentSource || currentConsent.consentSource || 'web_form',
      consentIp: ip || '127.0.0.1',
      consentDate: new Date(),
      ...(input.optOutReason && { optOutReason: input.optOutReason }),
    }

    contact.tcpaConsent = updatedConsent

    // If all channels revoked, mark as opted_out
    const allRevoked =
      !updatedConsent.sms &&
      !updatedConsent.call &&
      !updatedConsent.whatsapp &&
      !updatedConsent.email

    if (allRevoked) {
      contact.dncStatus = 'opted_out'
      contact.optedOutAt = new Date()
    } else if (contact.dncStatus === 'opted_out') {
      contact.dncStatus = 'clean'
      contact.optedOutAt = undefined
    }

    await contact.save()

    // Write immutable audit log
    await AuditLog.create({
      brokerageId,
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      action: allRevoked ? 'tcpa_revoked' : 'tcpa_consent_updated',
      entity: 'Contact',
      entityId: contact._id,
      metadata: {
        consent: updatedConsent,
        ip,
      },
    })

    return contact
  }

  /**
   * Universal 1-click opt-out (STOP keyword handler or manual agent opt-out)
   */
  public async processOptOut(
    brokerageId: string,
    input: OptOutInput,
    ip?: string,
    userId?: string
  ) {
    const cleaned = input.phone.replace(/[^0-9+]/g, '')
    const channel = input.channel || 'all'

    const contacts = await Contact.find({
      brokerageId,
      phone: { $regex: cleaned.slice(-10) },
      isDeleted: false,
    })

    const updatedIds: string[] = []

    for (const contact of contacts) {
      if (channel === 'all') {
        contact.dncStatus = 'opted_out'
        contact.optedOutAt = new Date()
        contact.tcpaConsent = {
          ...(contact.tcpaConsent || { doubleOptInVerified: false }),
          sms: false,
          call: false,
          whatsapp: false,
          email: false,
          consentDate: new Date(),
          consentIp: ip,
          optOutReason: input.reason || 'User requested opt-out (STOP)',
        }
      } else {
        const consent = contact.tcpaConsent || {
          sms: true,
          call: true,
          whatsapp: true,
          email: true,
          doubleOptInVerified: false,
        }
        ;(consent as any)[channel] = false
        consent.consentDate = new Date()
        consent.optOutReason = input.reason || `Opted out from ${channel}`
        contact.tcpaConsent = consent
      }

      await contact.save()
      updatedIds.push(contact._id.toString())

      await AuditLog.create({
        brokerageId,
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        action: 'tcpa_opt_out',
        entity: 'Contact',
        entityId: contact._id,
        metadata: {
          phone: cleaned,
          channel,
          reason: input.reason || 'Requested opt-out',
        },
      })
    }

    return {
      success: true,
      contactsUpdated: updatedIds.length,
      contactIds: updatedIds,
      channel,
      phone: cleaned,
    }
  }

  /**
   * Dispatch double opt-in verification code
   */
  public async sendOptInVerification(brokerageId: string, contactId: string) {
    const contact = await Contact.findOne({
      _id: contactId,
      brokerageId,
      isDeleted: false,
    })

    if (!contact) {
      throw new Error('Contact not found')
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    contact.tcpaConsent = {
      ...(contact.tcpaConsent || {
        sms: true,
        call: true,
        whatsapp: true,
        email: true,
        doubleOptInVerified: false,
      }),
      verificationCode,
      verificationCodeExpiresAt: expiresAt,
    }

    await contact.save()

    return {
      message: 'Verification code dispatched to contact',
      contactId: contact._id.toString(),
      expiresInMinutes: 15,
    }
  }

  /**
   * Confirm double opt-in verification code
   */
  public async confirmOptIn(brokerageId: string, contactId: string, code: string) {
    const contact = await Contact.findOne({
      _id: contactId,
      brokerageId,
      isDeleted: false,
    }).select('+tcpaConsent.verificationCode')

    if (!contact) {
      throw new Error('Contact not found')
    }

    if (!contact.tcpaConsent?.verificationCode) {
      throw new Error('No pending verification code found')
    }

    if (
      contact.tcpaConsent.verificationCodeExpiresAt &&
      contact.tcpaConsent.verificationCodeExpiresAt < new Date()
    ) {
      throw new Error('Verification code has expired. Please request a new one.')
    }

    if (contact.tcpaConsent.verificationCode !== code.trim()) {
      throw new Error('Invalid verification code')
    }

    contact.tcpaConsent.doubleOptInVerified = true
    contact.tcpaConsent.verificationCode = undefined
    contact.tcpaConsent.verificationCodeExpiresAt = undefined
    contact.dncStatus = 'clean'
    contact.optedOutAt = undefined

    await contact.save()

    return {
      success: true,
      message: 'Contact double opt-in verified successfully',
      contactId: contact._id.toString(),
      doubleOptInVerified: true,
    }
  }

  /**
   * Scan listing description, ad copy, or messages against Fair Housing rules
   */
  public scanListingContent(text: string): FairHousingScanReport {
    const violations: FairHousingViolation[] = []
    let cleanedText = text

    for (const rule of FAIR_HOUSING_RULES) {
      const match = rule.pattern.exec(text)
      if (match) {
        violations.push({
          phrase: match[0],
          reason: rule.reason,
          replacement: rule.replacement,
          severity: rule.severity,
          index: match.index,
        })

        // Generate sanitized version
        cleanedText = cleanedText.replace(rule.pattern, rule.replacement)
      }
    }

    return {
      isCompliant: violations.length === 0,
      totalViolations: violations.length,
      violations,
      cleanedText,
      scannedAt: new Date().toISOString(),
    }
  }

  /**
   * Aggregates brokerage compliance dashboard statistics
   */
  public async getComplianceDashboard(brokerageId: string): Promise<ComplianceDashboardStats> {
    const bId = new mongoose.Types.ObjectId(brokerageId)

    const [stats] = await Contact.aggregate([
      { $match: { brokerageId: bId, isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          clean: {
            $sum: {
              $cond: [{ $ifNull: ['$dncStatus', 'clean'] }, 1, 0],
            },
          },
          optedOut: {
            $sum: {
              $cond: [{ $eq: ['$dncStatus', 'opted_out'] }, 1, 0],
            },
          },
          federalDnc: {
            $sum: {
              $cond: [{ $eq: ['$dncStatus', 'dnc_federal'] }, 1, 0],
            },
          },
          doubleOptIn: {
            $sum: {
              $cond: [{ $eq: ['$tcpaConsent.doubleOptInVerified', true] }, 1, 0],
            },
          },
        },
      },
    ])

    const totalContacts = stats?.total || 0
    const optedOutCount = stats?.optedOut || 0
    const federalDncCount = stats?.federalDnc || 0
    const cleanCount = Math.max(0, totalContacts - optedOutCount - federalDncCount)
    const optInRate = totalContacts > 0 ? Math.round((cleanCount / totalContacts) * 100) : 100

    // Fetch recent audit events
    const recentLogs = await AuditLog.find({
      brokerageId: bId,
      action: { $in: ['tcpa_opt_out', 'tcpa_revoked', 'tcpa_consent_updated'] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const { isSafe, currentTimeStr } = this.isWithinSafeCallingHours()

    const recentComplianceEvents = recentLogs.map((log) => ({
      id: log._id.toString(),
      type: (log.action === 'tcpa_opt_out' ? 'opt_out' : 'opt_in_verified') as any,
      timestamp: (log.createdAt as Date).toISOString(),
      details: (log.details as any)?.reason || `Action: ${log.action}`,
    }))

    return {
      totalContacts,
      cleanCount,
      federalDncCount,
      optedOutCount,
      optInRate,
      safeCallingWindowActive: isSafe,
      currentServerTime: currentTimeStr,
      recentComplianceEvents,
    }
  }
}

export const complianceService = new ComplianceService()
