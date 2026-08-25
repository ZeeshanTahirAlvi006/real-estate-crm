import xss from 'xss'

// Escape special characters for safe regular expression matching
export const escapeRegExp = (text: string): string => {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Clean and sanitize string against XSS injection
export const cleanXss = (input: string): string => {
  return xss(input.trim())
}

// Deep sanitize object values by trimming strings and scrubbing script tags
export const deepSanitize = <T>(obj: T): T => {
  if (typeof obj === 'string') {
    return cleanXss(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepSanitize(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      // Strip keys starting with $ to block Mongo operators
      if (!key.startsWith('$')) {
        sanitizedObj[key] = deepSanitize(value)
      }
    }
    return sanitizedObj as T
  }
  return obj
}
