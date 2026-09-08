// ── Fair Housing Compliance Dictionary ──────────────────────────────
// Protected phrases that may violate Fair Housing Act demographic steering guidelines.
// Used by the FairHousingWarning component to flag prohibited language before send.

export interface FairHousingPhrase {
  phrase: string
  replacement: string
  reason: string
}

export const fairHousingProhibitedPhrases: FairHousingPhrase[] = [
  { phrase: 'safe neighborhood', replacement: 'low property crime statistics', reason: 'Steering / subjective safety perception' },
  { phrase: 'walking distance to church', replacement: 'central location near places of worship', reason: 'Religious preference bias' },
  { phrase: 'perfect for families', replacement: 'spacious multi-bedroom layout with fenced yard', reason: 'Familial status discrimination' },
  { phrase: 'bachelor pad', replacement: 'modern single-occupancy studio/loft', reason: 'Sex / marital status steering' },
  { phrase: 'mature quiet community', replacement: 'private low-traffic cul-de-sac', reason: 'Age / familial status steering' },
  { phrase: 'exclusive neighborhood', replacement: 'gated community with private access', reason: 'Socio-economic / demographic exclusion' },
]
