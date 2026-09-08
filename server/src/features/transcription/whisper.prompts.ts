import { ExtractedVoiceEntities } from './whisper.types.js'

export const buildVoiceExtractionSystemPrompt = (): string => {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })

  return `You are an expert Real Estate CRM Intelligence Agent for PropPulse OS.
Today is ${dayOfWeek}, ${todayStr} (Current ISO Time: ${now.toISOString()}).

Your mission is to analyze agent field voice memos and accurately extract structured CRM data.
Analyze the voice transcription and extract key entities, discussion points, scheduled follow-ups, and action tasks.

Return STRICT JSON ONLY with NO surrounding commentary or markdown codeblocks:
{
  "contactName": "string or null if not identified",
  "contactEmail": "string or null if mentioned",
  "contactPhone": "string or null if mentioned",
  "summary": "Concise 1-2 sentence executive summary of the conversation or field visit",
  "discussionPoints": [
    "Key discussion point or observation 1",
    "Key discussion point or observation 2"
  ],
  "nextFollowUpDate": "ISO-8601 date string or null if no follow-up was mentioned (calculate relative dates based on today's date ${todayStr})",
  "tasks": [
    {
      "title": "Clear actionable task description",
      "dueDate": "ISO-8601 date string or null",
      "priority": "low | medium | high"
    }
  ],
  "dealStage": "string or null if a pipeline stage progression was mentioned (e.g., Showing, Offer Submitted, Under Contract, Closing)",
  "dealNotes": "string or null if specific deal terms, price, or contingencies were discussed",
  "sentiment": "positive | neutral | negative | urgent",
  "propertyAddress": "string or null if a property address was mentioned",
  "tags": ["relevant", "crm", "tags", "e.g.", "buyer", "motivated", "showing_done"]
}`
}

export const buildVoiceExtractionUserPrompt = (transcript: string, contactContext?: string): string => {
  return `Agent Voice Recording Transcript:
"""
${transcript}
"""

${contactContext ? `Existing Contact Context:\n${contactContext}\n` : ''}

Extract all structured CRM entities and action items. Ensure relative dates like "tomorrow", "this Friday", "next Tuesday at 10 AM", or "in 3 days" are converted into exact ISO-8601 strings.`
}

/**
 * High-speed local NLP fallback parser when external LLMs are unavailable
 */
export const runLocalVoiceNlpParser = (
  transcript: string,
  contactContext?: { firstName?: string; lastName?: string }
): ExtractedVoiceEntities => {
  const text = transcript.trim()
  const lower = text.toLowerCase()

  // 1. Extract Contact Name
  let contactName: string | undefined = contactContext
    ? `${contactContext.firstName || ''} ${contactContext.lastName || ''}`.trim()
    : undefined

  if (!contactName) {
    const nameMatch = text.match(/(?:with|spoke to|met with|called|talked to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
    if (nameMatch && nameMatch[1]) {
      contactName = nameMatch[1].trim()
    }
  }

  // 2. Extract Property Address
  let propertyAddress: string | null = null
  const addressMatch = text.match(/\b\d+\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Terrace|Ter))\b/i)
  if (addressMatch) {
    propertyAddress = addressMatch[0].trim()
  }

  // 3. Extract Next Follow-Up Date
  let nextFollowUpDate: string | null = null
  const now = new Date()

  if (lower.includes('tomorrow')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 1)
    d.setHours(10, 0, 0, 0)
    nextFollowUpDate = d.toISOString()
  } else if (lower.includes('in 2 days') || lower.includes('in two days')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 2)
    d.setHours(10, 0, 0, 0)
    nextFollowUpDate = d.toISOString()
  } else if (lower.includes('in 3 days') || lower.includes('in three days')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 3)
    d.setHours(10, 0, 0, 0)
    nextFollowUpDate = d.toISOString()
  } else if (lower.includes('next week') || lower.includes('in a week')) {
    const d = new Date(now)
    d.setDate(d.getDate() + 7)
    d.setHours(10, 0, 0, 0)
    nextFollowUpDate = d.toISOString()
  } else {
    // Days of the week check (e.g. "next monday", "on friday")
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const targetDay = i
        const currentDay = now.getDay()
        let dayDiff = targetDay - currentDay
        if (dayDiff <= 0) dayDiff += 7
        const d = new Date(now)
        d.setDate(d.getDate() + dayDiff)
        d.setHours(10, 0, 0, 0)
        nextFollowUpDate = d.toISOString()
        break
      }
    }
  }

  // 4. Extract Discussion Points
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  const discussionPoints: string[] = sentences.length > 0 ? sentences.slice(0, 4) : [text]

  // 5. Extract Tasks
  const tasks: Array<{ title: string; dueDate?: string; priority?: 'low' | 'medium' | 'high' }> = []
  for (const s of sentences) {
    const sLower = s.toLowerCase()
    if (
      sLower.includes('need to') ||
      sLower.includes('follow up') ||
      sLower.includes('send') ||
      sLower.includes('schedule') ||
      sLower.includes('prepare') ||
      sLower.includes('call back') ||
      sLower.includes('will email')
    ) {
      tasks.push({
        title: s.replace(/^(I|We)\s+(need to|will|have to)\s+/i, '').trim(),
        dueDate: nextFollowUpDate || undefined,
        priority: sLower.includes('urgent') || sLower.includes('asap') ? 'high' : 'medium',
      })
    }
  }

  if (tasks.length === 0 && nextFollowUpDate) {
    tasks.push({
      title: `Follow up with ${contactName || 'client'}`,
      dueDate: nextFollowUpDate,
      priority: 'medium',
    })
  }

  // 6. Sentiment Detection
  let sentiment: 'positive' | 'neutral' | 'negative' | 'urgent' = 'neutral'
  if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately')) {
    sentiment = 'urgent'
  } else if (lower.includes('love') || lower.includes('great') || lower.includes('excited') || lower.includes('ready to buy')) {
    sentiment = 'positive'
  } else if (lower.includes('unhappy') || lower.includes('concerned') || lower.includes('hesitant') || lower.includes('backed out')) {
    sentiment = 'negative'
  }

  // 7. Deal Stage Progression
  let dealStage: string | null = null
  if (lower.includes('offer submitted') || lower.includes('submitting an offer') || lower.includes('put in an offer')) {
    dealStage = 'Offer Submitted'
  } else if (lower.includes('under contract') || lower.includes('escrow')) {
    dealStage = 'Under Contract'
  } else if (lower.includes('showing') || lower.includes('showed the house') || lower.includes('toured')) {
    dealStage = 'Showing'
  } else if (lower.includes('closing') || lower.includes('closed')) {
    dealStage = 'Closed'
  }

  // 8. Tags
  const tags: string[] = ['voice_note']
  if (lower.includes('buyer') || lower.includes('looking to buy')) tags.push('buyer')
  if (lower.includes('seller') || lower.includes('listing')) tags.push('seller')
  if (lower.includes('showing') || lower.includes('tour')) tags.push('showing_completed')
  if (sentiment === 'positive') tags.push('motivated')

  return {
    contactName: contactName || undefined,
    summary: sentences[0] || text.slice(0, 150),
    discussionPoints,
    nextFollowUpDate,
    tasks,
    dealStage,
    dealNotes: propertyAddress ? `Discussed property at ${propertyAddress}` : null,
    sentiment,
    propertyAddress,
    tags,
  }
}
