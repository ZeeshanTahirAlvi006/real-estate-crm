export interface FairHousingCheckResult {
  passed: boolean
  flags: string[]
  remediationAdvice?: string
  sanitizedText?: string
}

// Fair Housing Act Protected Classes & Prohibited Inquiries
const PROHIBITED_PATTERNS: Array<{ regex: RegExp; flag: string; advice: string }> = [
  {
    regex: /\b(race|racial|caucasian|african american|black neighborhood|white neighborhood|asian community|hispanic area)\b/i,
    flag: 'Racial Steering / Protected Class (Race/Color)',
    advice: 'Inquiries regarding racial composition or steering are strictly prohibited under the Fair Housing Act.',
  },
  {
    regex: /\b(church|synagogue|mosque|jewish neighborhood|muslim area|christian community|religious makeup)\b/i,
    flag: 'Religious Demographics / Steering',
    advice: 'Real estate professionals and AI agents cannot describe neighborhoods by religious makeup.',
  },
  {
    regex: /\b(no children|no kids|adults only|family friendly neighborhood|good place for kids|without kids)\b/i,
    flag: 'Familial Status Steering',
    advice: 'Inquiries discriminating on or describing familial status (presence of children) violate Fair Housing laws.',
  },
  {
    regex: /\b(handicap|disabled people|mental illness|wheelchair accessible community only)\b/i,
    flag: 'Disability / Handicap Discrimination',
    advice: 'Questions about disability status or steering based on perceived physical/mental limitations are prohibited.',
  },
  {
    regex: /\b(bad neighborhood|crime rate by demographic|ghetto|safe white area)\b/i,
    flag: 'Neighborhood Steering / Crime Stereotyping',
    advice: 'AI ISA must direct clients to independent public municipal resources for school and crime data rather than generalizing neighborhoods.',
  },
]

/**
 * Validates text against the Fair Housing Act standard compliance rules
 */
export const checkFairHousingCompliance = (text: string): FairHousingCheckResult => {
  if (!text) return { passed: true, flags: [] }

  const flags: string[] = []
  const advices: string[] = []

  for (const item of PROHIBITED_PATTERNS) {
    if (item.regex.test(text)) {
      flags.push(item.flag)
      advices.push(item.advice)
    }
  }

  if (flags.length > 0) {
    return {
      passed: false,
      flags,
      remediationAdvice: advices.join(' '),
      sanitizedText:
        'To ensure full compliance with the Federal Fair Housing Act, I cannot provide demographic, religious, or neighborhood composition details. However, I can gladly share official public property records, school district directory links, and recent comparable sales in this area!',
    }
  }

  return {
    passed: true,
    flags: [],
  }
}
