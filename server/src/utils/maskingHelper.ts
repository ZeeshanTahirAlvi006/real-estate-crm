import mongoose from 'mongoose'
import { IUser } from '../models/User.js'
import { USER_ROLES } from './constants.js'

/**
 * Masks a phone number preserving the first 3 characters (e.g. "+92 3" or "+1 ")
 * and last 2 digits, replacing middle characters with asterisks (minimum 4 asterisks).
 */
export const maskPhone = (phone?: string): string => {
  if (!phone || typeof phone !== 'string') return ''
  const trimmed = phone.trim()
  if (!trimmed) return ''

  if (trimmed.length <= 5) {
    if (trimmed.length <= 2) return '*'.repeat(trimmed.length)
    return `${trimmed[0]}****${trimmed.slice(-1)}`
  }

  let prefixLen = 3
  if (trimmed.startsWith('+')) {
    const spaceIdx = trimmed.indexOf(' ')
    prefixLen = spaceIdx > 0 && spaceIdx <= 4 ? spaceIdx + 2 : 4
  }
  prefixLen = Math.min(prefixLen, Math.max(1, trimmed.length - 2))
  const prefix = trimmed.slice(0, prefixLen)
  const suffix = trimmed.slice(-2)
  const maskLen = Math.max(trimmed.length - prefixLen - 2, 4)
  return `${prefix}${'*'.repeat(maskLen)}${suffix}`
}

/**
 * Masks an email preserving the first character of the local part,
 * masking the rest of the local part with asterisks (minimum 3),
 * and preserving the entire domain part (e.g. "j***@domain.com").
 */
export const maskEmail = (email?: string): string => {
  if (!email || typeof email !== 'string') return ''
  const trimmed = email.trim()
  if (!trimmed) return ''

  const atIdx = trimmed.indexOf('@')
  if (atIdx <= 0) return '***@***.***'

  const localPart = trimmed.slice(0, atIdx)
  const domainPart = trimmed.slice(atIdx)
  const firstChar = localPart[0]
  const maskLen = Math.max(localPart.length - 1, 3)
  return `${firstChar}${'*'.repeat(maskLen)}${domainPart}`
}

/**
 * Determines whether a given resource belongs to a different brokerage relative to the caller.
 * - Non-Super Admins are scoped to their own brokerage (returns false).
 * - Unassigned Super Admins (no brokerageId) treat all resources as cross-brokerage (returns true).
 * - Unassigned resources (no resourceBrokerageId) are treated as cross-brokerage for Super Admins (returns true).
 * - Super Admins with an assigned brokerage compare IDs strictly.
 */
export const isCrossBrokerage = (
  resourceBrokerageId: mongoose.Types.ObjectId | string | undefined | null,
  caller: IUser
): boolean => {
  if (caller.role !== USER_ROLES.SUPER_ADMIN) return false
  if (!caller.brokerageId) return true
  if (!resourceBrokerageId) return true

  const resIdStr = (resourceBrokerageId as any)?._id
    ? (resourceBrokerageId as any)._id.toString()
    : resourceBrokerageId.toString()
  const callerIdStr = (caller.brokerageId as any)?._id
    ? (caller.brokerageId as any)._id.toString()
    : caller.brokerageId.toString()

  return resIdStr !== callerIdStr
}

/**
 * Regex-replaces emails and phone numbers in arbitrary strings with masked versions.
 */
export const redactSensitiveText = (text: string): string => {
  if (!text || typeof text !== 'string') return text

  // 1. Redact email addresses
  let redacted = text.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    (match) => maskEmail(match)
  )

  // 2. Redact phone numbers (e.g. +92 301 9876543, +923019876543, +1 555 876 5432, 03001234567)
  redacted = redacted.replace(
    /(?:\+\d{1,4}[-.\s]*)?(?:\(?\d{2,4}\)?[-.\s]*)?\d{3,4}[-.\s]*\d{3,4}(?:[-.\s]*\d{1,4})?/g,
    (match) => {
      // Prevent matching ISO/standard dates like 2026-09-17
      if (/^\d{4}-\d{2}-\d{2}/.test(match)) {
        return match
      }
      const digits = match.replace(/\D/g, '')
      if (digits.length >= 7) {
        return maskPhone(match)
      }
      return match
    }
  )

  return redacted
}

/**
 * Recursively masks sensitive keys (phone, mobile, email, secondaryPhone)
 * and redacts strings in arbitrary objects/arrays while preserving operational context.
 */
export const redactDeep = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') return redactSensitiveText(obj)
    return obj
  }
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) {
    return obj.map(redactDeep)
  }

  const plainObj = typeof obj.toObject === 'function' ? obj.toObject() : obj
  const out: Record<string, any> = {}

  for (const [k, v] of Object.entries(plainObj)) {
    if (/phone|mobile/i.test(k) && typeof v === 'string') {
      out[k] = maskPhone(v)
    } else if (/email/i.test(k) && typeof v === 'string') {
      out[k] = maskEmail(v)
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redactDeep(v)
    } else if (typeof v === 'string') {
      out[k] = redactSensitiveText(v)
    } else {
      out[k] = v
    }
  }
  return out
}
