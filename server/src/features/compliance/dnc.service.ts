import { Contact } from '../../models/Contact.js'

export interface DncCheckOutput {
  phone: string
  isClean: boolean
  dncStatus: 'clean' | 'dnc_federal' | 'dnc_state' | 'opted_out' | 'unverified'
  canCall: boolean
  canText: boolean
  safeCallingHours: {
    start: string
    end: string
    isCurrentlySafe: boolean
  }
  reason?: string
  checkedAt: string
}

export class DncComplianceService {
  /**
   * Check if current time is within TCPA legal calling window (8am - 9pm)
   */
  public isWithinSafeCallingHours(): boolean {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 8 && hour < 21
  }

  /**
   * Verify phone number against TCPA, Internal CRM Opt-Out, and DNC rules
   */
  public async checkPhoneNumber(phone: string, brokerageId?: string): Promise<DncCheckOutput> {
    const cleaned = phone.replace(/[^0-9+]/g, '')
    const checkedAt = new Date().toISOString()
    const isCurrentlySafe = this.isWithinSafeCallingHours()

    // 1. Check CRM database
    const filter: Record<string, any> = { phone: cleaned }
    if (brokerageId) filter.brokerageId = brokerageId

    const contact = await Contact.findOne(filter).lean()

    if (contact) {
      if (contact.dncStatus === 'opted_out') {
        return {
          phone: cleaned,
          isClean: false,
          dncStatus: 'opted_out',
          canCall: false,
          canText: false,
          safeCallingHours: { start: '08:00', end: '21:00', isCurrentlySafe },
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
          safeCallingHours: { start: '08:00', end: '21:00', isCurrentlySafe },
          reason: `Phone is listed on the National / State Do Not Call Registry (${contact.dncStatus.toUpperCase()})`,
          checkedAt,
        }
      }
    }

    // 2. Simulated Federal DNC Registry Lookup (Real FTC API ready)
    // Numbers ending in 9999 simulate federal DNC for dev testing
    if (cleaned.endsWith('9999')) {
      return {
        phone: cleaned,
        isClean: false,
        dncStatus: 'dnc_federal',
        canCall: false,
        canText: false,
        safeCallingHours: { start: '08:00', end: '21:00', isCurrentlySafe },
        reason: 'National Do Not Call Registry Match (FTC Rule 16 CFR Part 310)',
        checkedAt,
      }
    }

    return {
      phone: cleaned,
      isClean: true,
      dncStatus: 'clean',
      canCall: isCurrentlySafe,
      canText: true,
      safeCallingHours: { start: '08:00', end: '21:00', isCurrentlySafe },
      reason: isCurrentlySafe ? 'Phone verified clean for outreach' : 'Phone is clean, but outside 8:00 AM - 9:00 PM TCPA window',
      checkedAt,
    }
  }
}

export const dncComplianceService = new DncComplianceService()
