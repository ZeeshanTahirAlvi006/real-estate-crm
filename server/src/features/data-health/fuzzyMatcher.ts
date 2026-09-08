import dns from 'dns'

// ── In-Memory MX Cache to prevent repeated DNS lookups ──
const mxCache = new Map<string, { isValid: boolean; timestamp: number }>()
const MX_CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours

/**
 * Computes Jaro Similarity between two strings (0.0 to 1.0)
 */
export const jaroSimilarity = (s1: string, s2: string): number => {
  if (s1 === s2) return 1.0
  if (!s1 || !s2) return 0.0

  const a = s1.toLowerCase().trim()
  const b = s2.toLowerCase().trim()

  const len1 = a.length
  const len2 = b.length

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, len2)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || a[i] !== b[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0
  )
}

/**
 * Computes Jaro-Winkler Distance (gives higher weight to common prefix up to 4 chars)
 */
export const jaroWinklerSimilarity = (s1: string, s2: string): number => {
  const jaro = jaroSimilarity(s1, s2)
  if (jaro === 0.0) return 0.0

  const a = s1.toLowerCase().trim()
  const b = s2.toLowerCase().trim()

  // Find common prefix length up to 4
  let prefix = 0
  const maxPrefix = Math.min(4, Math.min(a.length, b.length))
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++
    else break
  }

  const scalingFactor = 0.1
  return jaro + prefix * scalingFactor * (1.0 - jaro)
}

/**
 * Normalizes phone numbers to pure numeric digits
 * Handles +1-555-234-5678, (555) 234-5678, 555.234.5678
 */
export const normalizePhone = (phone?: string): string => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  // If 11 digits starting with 1 (US country code), strip leading 1 for comparison
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1)
  }
  return digits
}

/**
 * Validates phone format (must be 10 digits for standard US/NANP or 7-15 digits international)
 */
export const isValidPhoneFormat = (phone?: string): boolean => {
  if (!phone) return false
  const digits = normalizePhone(phone)
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Validates Email Syntax RFC 5322 standard
 */
export const isValidEmailSyntax = (email?: string): boolean => {
  if (!email) return false
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return regex.test(email.trim().toLowerCase())
}

/**
 * Asynchronously verifies DNS MX records for the email domain
 * Has a 2500ms timeout with fallback to prevent scan stalling
 */
export const verifyEmailMx = async (email?: string): Promise<boolean> => {
  if (!email || !isValidEmailSyntax(email)) return false

  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain) return false

  // Check in-memory cache
  const cached = mxCache.get(domain)
  if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL_MS) {
    return cached.isValid
  }

  try {
    const mxRecords = await Promise.race([
      dns.promises.resolveMx(domain),
      new Promise<dns.MxRecord[]>((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), 2500)
      ),
    ])

    const isValid = Array.isArray(mxRecords) && mxRecords.length > 0
    mxCache.set(domain, { isValid, timestamp: Date.now() })
    return isValid
  } catch {
    // If MX lookup times out or errors, fall back to syntax check
    const fallbackValid = isValidEmailSyntax(email)
    mxCache.set(domain, { isValid: fallbackValid, timestamp: Date.now() })
    return fallbackValid
  }
}
