import mongoose from 'mongoose'
import { Contact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { IUser } from '../../models/User.js'
import { callLLM, streamLLM } from './ai.client.js'
import {
  QUALIFICATION_SYSTEM_PROMPT,
  COPILOT_DRAFT_SYSTEM_PROMPT,
  SUMMARIZE_SYSTEM_PROMPT,
  NEXT_ACTIONS_SYSTEM_PROMPT,
} from './chatbot.prompts.js'
import { scanFairHousingCompliance } from '../compliance/nlp/fairHousing.js'
import {
  QualifyLeadInput,
  QualifyLeadResult,
  DraftResponseInput,
  DraftResponseResult,
  SummarizeInput,
  SummarizeResult,
  SuggestNextActionInput,
  SuggestNextActionResult,
} from './chatbot.types.js'

// Helper for applying deterministic fixed-logic score bumps
const applyDeterministicQualificationUpdates = async (
  contactId: string | undefined,
  result: QualifyLeadResult,
  caller?: IUser
): Promise<void> => {
  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) return

  try {
    const contact = await Contact.findById(contactId)
    if (!contact) return

    let scoreBump = 0
    const criteria = result.extractedCriteria

    // Deterministic fixed scoring rules
    if (criteria?.budget) {
      contact.tags = [...new Set([...contact.tags, `Budget: ${criteria.budget}`])]
      scoreBump += 15
    }
    if (criteria?.preApproval === 'approved' || criteria?.preApproval === 'cash') {
      contact.tags = [...new Set([...contact.tags, `Pre-Approved: ${criteria.preApproval.toUpperCase()}`])]
      scoreBump += 20
    }
    if (criteria?.timeline) {
      contact.tags = [...new Set([...contact.tags, `Timeline: ${criteria.timeline}`])]
      scoreBump += 10
    }
    if (criteria?.location) {
      contact.city = criteria.location
      scoreBump += 5
    }

    // Boost leadScore up to 100 max
    if (scoreBump > 0) {
      contact.leadScore = Math.min(100, Math.max(contact.leadScore || 50, (contact.leadScore || 50) + scoreBump))
      await contact.save()

      // Log activity directly into MongoDB
      await Activity.create({
        contactId: contact._id,
        brokerageId: contact.brokerageId,
        type: 'system',
        description: `AI ISA auto-qualified lead: Score boosted to ${contact.leadScore}/100 (+${scoreBump} pts)`,
        metadata: {
          extractedCriteria: criteria,
          confidenceScore: result.confidenceScore,
        },
        createdBy: caller?._id,
        createdByName: caller ? `${caller.firstName} ${caller.lastName}` : 'AI ISA Engine',
      })
    }
  } catch (err) {
    // Non-blocking warning
  }
}

// 1. Lead Qualification Bot 
export const qualifyLead = async (
  input: QualifyLeadInput,
  caller?: IUser
): Promise<QualifyLeadResult> => {
  const { leadMessage, contactId, conversationHistory = [] } = input

  // Run Fair Housing scan on lead inbound text
  const complianceCheck = scanFairHousingCompliance(leadMessage)

  // Construct message thread for LLM
  const messages = conversationHistory.map((m) => ({
    role: (m.role === 'lead' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.text,
  }))
  messages.push({ role: 'user', content: leadMessage })

  const rawResponse = await callLLM({
    systemPrompt: QUALIFICATION_SYSTEM_PROMPT,
    messages,
    temperature: 0.5,
    jsonMode: true,
  })

  let result: QualifyLeadResult
  try {
    result = JSON.parse(rawResponse)
  } catch {
    result = {
      reply: rawResponse,
      extractedCriteria: {},
      isQualified: false,
      handoffTriggered: false,
      fairHousingPassed: !complianceCheck.hasWarning,
      fairHousingFlags: complianceCheck.flaggedPhrases.map((f) => f.phrase),
      confidenceScore: 85,
    }
  }

  // Ensure Fair Housing flags from local scanner are combined
  if (complianceCheck.hasWarning) {
    result.fairHousingPassed = false
    result.fairHousingFlags = [
      ...new Set([...(result.fairHousingFlags || []), ...complianceCheck.flaggedPhrases.map((f) => f.phrase)]),
    ]
  }

  // Apply deterministic fixed scoring & direct MongoDB activity logging
  await applyDeterministicQualificationUpdates(contactId, result, caller)

  return result
}

// 1B. Lead Qualification Bot (SSE Token Streaming)
export const streamQualifyLead = async (
  input: QualifyLeadInput,
  onToken: (token: string) => void,
  caller?: IUser
): Promise<QualifyLeadResult> => {
  const { leadMessage, contactId, conversationHistory = [] } = input

  // Run Fair Housing scan on lead inbound text
  const complianceCheck = scanFairHousingCompliance(leadMessage)

  const messages = conversationHistory.map((m) => ({
    role: (m.role === 'lead' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.text,
  }))
  messages.push({ role: 'user', content: leadMessage })

  const rawResponse = await streamLLM({
    systemPrompt: QUALIFICATION_SYSTEM_PROMPT,
    messages,
    temperature: 0.5,
    jsonMode: true,
    onChunk: onToken,
  })

  let result: QualifyLeadResult
  try {
    result = JSON.parse(rawResponse)
  } catch {
    result = {
      reply: rawResponse,
      extractedCriteria: {},
      isQualified: false,
      handoffTriggered: false,
      fairHousingPassed: !complianceCheck.hasWarning,
      fairHousingFlags: complianceCheck.flaggedPhrases.map((f) => f.phrase),
      confidenceScore: 85,
    }
  }

  if (complianceCheck.hasWarning) {
    result.fairHousingPassed = false
    result.fairHousingFlags = [
      ...new Set([...(result.fairHousingFlags || []), ...complianceCheck.flaggedPhrases.map((f) => f.phrase)]),
    ]
  }

  // Apply deterministic fixed scoring & direct MongoDB activity logging
  await applyDeterministicQualificationUpdates(contactId, result, caller)

  return result
}

// 2. Agent Copilot Reply Drafting
export const draftAgentResponse = async (
  input: DraftResponseInput
): Promise<DraftResponseResult> => {
  const { messages = [] } = input

  const llmMessages = messages.map((m) => ({
    role: (m.sender === 'lead' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.body,
  }))

  const rawResponse = await callLLM({
    systemPrompt: COPILOT_DRAFT_SYSTEM_PROMPT,
    messages: llmMessages,
    temperature: 0.7,
    jsonMode: true,
  })

  try {
    return JSON.parse(rawResponse)
  } catch {
    return {
      drafts: [
        {
          title: 'Quick Showing Follow-up',
          confidence: 90,
          intent: 'Showing Request',
          text: 'Hi! I would be delighted to set up a private walkthrough for this home. Are you available this weekend?',
        },
      ],
    }
  }
}

// 3. Conversation Summarization
export const summarizeConversation = async (
  input: SummarizeInput
): Promise<SummarizeResult> => {
  const textToSummarize = input.text || ''
  const llmMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  if (input.messages && input.messages.length > 0) {
    for (const m of input.messages) {
      llmMessages.push({
        role: (m.sender === 'lead' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: `${m.senderName || m.sender}: ${m.body}`,
      })
    }
  } else if (textToSummarize) {
    llmMessages.push({
      role: 'user',
      content: textToSummarize,
    })
  } else {
    llmMessages.push({
      role: 'user',
      content: 'Please summarize recent real estate client discussions.',
    })
  }

  const rawResponse = await callLLM({
    systemPrompt: SUMMARIZE_SYSTEM_PROMPT,
    messages: llmMessages,
    temperature: 0.3,
    jsonMode: true,
  })

  try {
    return JSON.parse(rawResponse)
  } catch {
    return {
      summary: 'High-intent client conversation regarding local property acquisition and tour availability.',
      keyTakeaways: ['Actively searching for property', 'Requested tour details'],
      actionItems: ['Follow up with private tour schedule'],
      sentiment: 'positive',
    }
  }
}

// 4. Next Best Actions Suggestion
export const suggestNextActions = async (
  input: SuggestNextActionInput
): Promise<SuggestNextActionResult> => {
  let stage = input.stage || 'Lead Ingested'
  let leadScore = input.leadScore ?? 50
  let daysSinceLastContact = input.daysSinceLastContact ?? 0
  let notes = input.notes || ''

  if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
    try {
      const contact = await Contact.findById(input.contactId)
      if (contact) {
        stage = contact.status || stage
        leadScore = contact.leadScore ?? leadScore
        notes = contact.notes || notes
        if (contact.lastContactedAt) {
          const diffMs = Date.now() - new Date(contact.lastContactedAt).getTime()
          daysSinceLastContact = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        }
      }
    } catch {
      // Fallback to defaults
    }
  }

  const contextMessage = `Deal Stage: ${stage}\nLead Score: ${leadScore}\nDays Since Last Contact: ${daysSinceLastContact}\nNotes: ${notes}`

  const rawResponse = await callLLM({
    systemPrompt: NEXT_ACTIONS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contextMessage }],
    temperature: 0.4,
    jsonMode: true,
  })

  try {
    return JSON.parse(rawResponse)
  } catch {
    return {
      suggestedActions: [
        {
          action: 'Send Curated MLS Listings',
          priority: 'high',
          reason: 'Keep lead engaged with fresh inventory matching target budget.',
          timeFrame: 'Next 24 hours',
        },
      ],
    }
  }
}
