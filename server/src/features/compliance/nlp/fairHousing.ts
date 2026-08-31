import { FairHousingCheckResult } from '../../ai-chatbot/chatbot.types.js'

export interface ProhibitedTermRule {
  phrase: string
  pattern: RegExp
  reason: string
  replacement: string
  severity: 'high' | 'medium' | 'low'
}

export const FAIR_HOUSING_RULES: ProhibitedTermRule[] = [
  // Familial Status Violations
  {
    phrase: 'no kids',
    pattern: /\b(no\s*kids|no\s*children|adults\s*only|not\s*suitable\s*for\s*children)\b/i,
    reason: 'Violates Fair Housing Act protection against Familial Status discrimination (Title VIII).',
    replacement: 'all households welcome',
    severity: 'high',
  },
  {
    phrase: 'empty nesters only',
    pattern: /\b(empty\s*nesters\s*(only|preferred)|mature\s*(adults|singles|couples)\s*only)\b/i,
    reason: 'Discriminates based on familial status and age.',
    replacement: 'peaceful, spacious residential layout',
    severity: 'high',
  },
  {
    phrase: 'perfect for singles',
    pattern: /\b(perfect\s*for\s*singles|single\s*professionals\s*only)\b/i,
    reason: 'Potential familial status and marital preference bias.',
    replacement: 'versatile open-concept floor plan',
    severity: 'medium',
  },

  // Religion Violations
  {
    phrase: 'near church',
    pattern: /\b(near\s*(the\s*)?(church|synagogue|mosque|temple|cathedral)|walking\s*distance\s*to\s*(church|synagogue|mosque))\b/i,
    reason: 'Religious preference or demographic steering prohibited under Fair Housing laws.',
    replacement: 'near local community landmarks and transit',
    severity: 'high',
  },
  {
    phrase: 'christian neighborhood',
    pattern: /\b(christian|jewish|muslim|catholic|hindu)\s*(community|neighborhood|area)\b/i,
    reason: 'Explicit religious demographic steering.',
    replacement: 'welcoming residential neighborhood',
    severity: 'high',
  },

  // Race / National Origin Violations
  {
    phrase: 'hispanic area',
    pattern: /\b(hispanic|asian|black|white|caucasian|latino)\s*(neighborhood|community|area|district)\b/i,
    reason: 'Prohibited racial or ethnic steering under federal Fair Housing Act.',
    replacement: 'vibrant, convenient neighborhood',
    severity: 'high',
  },
  {
    phrase: 'safe for expats',
    pattern: /\b(foreigners|locals|expats|immigrants)\s*(only|area|friendly)\b/i,
    reason: 'National origin discrimination restriction.',
    replacement: 'centrally located community',
    severity: 'medium',
  },

  // Gender / Sex Violations
  {
    phrase: 'bachelor pad',
    pattern: /\b(bachelor\s*pad|gentlemen\'?s?\s*retreat|bachelorette\s*pad)\b/i,
    reason: 'Gender-based advertising stereotyping.',
    replacement: 'modern, low-maintenance urban home',
    severity: 'low',
  },
  {
    phrase: 'female only',
    pattern: /\b(female\s*only|male\s*only|women\s*only|men\s*only)\b/i,
    reason: 'Gender preference in general housing sales/leasing is prohibited.',
    replacement: 'private individual room / suite',
    severity: 'high',
  },

  // Disability Violations
  {
    phrase: 'able-bodied only',
    pattern: /\b(able[\s-]bodied\s*only|no\s*wheelchairs|must\s*walk\s*stairs)\b/i,
    reason: 'Disability discrimination violation.',
    replacement: 'multi-level home with staircase access',
    severity: 'high',
  },
  {
    phrase: 'no service animals',
    pattern: /\b(no\s*service\s*animals|no\s*assistance\s*animals|no\s*emotional\s*support)\b/i,
    reason: 'Assistance and service animals must be accommodated under ADA & FHA guidelines.',
    replacement: 'pets subject to standard HOA policy (service animals welcome)',
    severity: 'high',
  },
]

export const scanFairHousingCompliance = (text: string): FairHousingCheckResult => {
  const flags: Array<{
    phrase: string
    reason: string
    replacement: string
    severity: 'high' | 'medium' | 'low'
  }> = []

  let recommendedText = text

  for (const rule of FAIR_HOUSING_RULES) {
    if (rule.pattern.test(text)) {
      flags.push({
        phrase: rule.phrase,
        reason: rule.reason,
        replacement: rule.replacement,
        severity: rule.severity,
      })
      recommendedText = recommendedText.replace(rule.pattern, rule.replacement)
    }
  }

  const hasWarning = flags.length > 0

  return {
    hasWarning,
    flaggedPhrases: flags,
    recommendedText: hasWarning ? recommendedText : undefined,
    explanation: hasWarning
      ? `Identified ${flags.length} term(s) with potential Fair Housing compliance concerns. We recommend updating with compliant phrasing.`
      : 'Message is compliant with Fair Housing Act guidelines.',
  }
}
