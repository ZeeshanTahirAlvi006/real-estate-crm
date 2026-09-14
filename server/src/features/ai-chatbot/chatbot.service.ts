import mongoose from 'mongoose'
import { Contact } from '../../models/Contact.js'
import { Activity } from '../../models/Activity.js'
import { IUser } from '../../models/User.js'
import { callLLM, streamLLM } from './ai.client.js'
import { logger } from '../../utils/logger.js'
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

// ── Timer Utility for CMD Benchmarking ──────────────────────
const startTimer = (fnName: string) => {
  const t0 = process.hrtime.bigint()
  return () => {
    const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
    setImmediate(() => {
      console.log(`[AI Chatbot Timer] ${fnName} completed in ${deltaMs.toFixed(3)}ms`)
    })
    return deltaMs
  }
}

// Helper for applying deterministic fixed-logic score bumps with atomic updates & tenant guards
const applyDeterministicQualificationUpdates = async (
  contactId: string | undefined,
  result: QualifyLeadResult,
  caller?: IUser
): Promise<void> => {
  if (!contactId || !mongoose.Types.ObjectId.isValid(contactId)) return

  try {
    const objectId = new mongoose.Types.ObjectId(contactId)
    const query: Record<string, any> = { _id: objectId }
    if (caller?.brokerageId) {
      query.brokerageId = caller.brokerageId
    }

    // Tenant-isolated lean read
    const contact = await Contact.findOne(query).select('_id brokerageId leadScore tags city').lean()
    if (!contact) return

    let scoreBump = 0
    const criteria = result.extractedCriteria
    const newTags: string[] = []
    const setUpdates: Record<string, any> = {}

    // Deterministic fixed scoring rules
    if (criteria?.budget) {
      newTags.push(`Budget: ${criteria.budget}`)
      scoreBump += 15
    }
    if (criteria?.preApproval === 'approved' || criteria?.preApproval === 'cash') {
      newTags.push(`Pre-Approved: ${criteria.preApproval.toUpperCase()}`)
      scoreBump += 20
    }
    if (criteria?.timeline) {
      newTags.push(`Timeline: ${criteria.timeline}`)
      scoreBump += 10
    }
    if (criteria?.location) {
      setUpdates.city = criteria.location
      scoreBump += 5
    }

    // Boost leadScore up to 100 max
    if (scoreBump > 0) {
      const currentScore = contact.leadScore || 50
      const finalScore = Math.min(100, Math.max(currentScore, currentScore + scoreBump))
      setUpdates.leadScore = finalScore

      const updateOp: Record<string, any> = { $set: setUpdates }
      if (newTags.length > 0) {
        updateOp.$addToSet = { tags: { $each: newTags } }
      }

      // Atomic single-roundtrip update (DI-002)
      await Contact.updateOne({ _id: contact._id }, updateOp)

      // Decouple side effect off critical path
      Activity.create({
        contactId: contact._id,
        brokerageId: contact.brokerageId,
        type: 'system',
        description: `AI ISA auto-qualified lead: Score boosted to ${finalScore}/100 (+${scoreBump} pts)`,
        metadata: {
          isAiIsa: true,
          extractedCriteria: criteria,
          confidenceScore: result.confidenceScore,
        },
        createdBy: caller?._id,
        createdByName: caller ? `${caller.firstName} ${caller.lastName}` : 'AI ISA Engine',
      }).catch((err) => logger.error(`[ActivityLog] Qualification activity error: ${err.message}`))
    }
  } catch (err: any) {
    logger.warn(`[AI Chatbot] Failed to apply qualification updates: ${err?.message}`)
  }
}

// 1. Lead Qualification Bot 
export const qualifyLead = async (
  input: QualifyLeadInput,
  caller?: IUser
): Promise<QualifyLeadResult> => {
  const stopTimer = startTimer('qualifyLead')
  try {
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

    stopTimer()
    return result
  } catch (error) {
    stopTimer()
    throw error
  }
}

// 1B. Lead Qualification Bot (SSE Token Streaming)
export const streamQualifyLead = async (
  input: QualifyLeadInput,
  onToken: (token: string) => void,
  caller?: IUser
): Promise<QualifyLeadResult> => {
  const stopTimer = startTimer('streamQualifyLead')
  try {
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

    stopTimer()
    return result
  } catch (error) {
    stopTimer()
    throw error
  }
}

// 2. Agent Copilot Reply Drafting
export const draftAgentResponse = async (
  input: DraftResponseInput
): Promise<DraftResponseResult> => {
  const stopTimer = startTimer('draftAgentResponse')
  try {
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
      const parsed = JSON.parse(rawResponse)
      stopTimer()
      return parsed
    } catch {
      stopTimer()
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
  } catch (error) {
    stopTimer()
    throw error
  }
}

// 3. Conversation Summarization
export const summarizeConversation = async (
  input: SummarizeInput
): Promise<SummarizeResult> => {
  const stopTimer = startTimer('summarizeConversation')
  try {
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
      const parsed = JSON.parse(rawResponse)
      stopTimer()
      return parsed
    } catch {
      stopTimer()
      return {
        summary: 'High-intent client conversation regarding local property acquisition and tour availability.',
        keyTakeaways: ['Actively searching for property', 'Requested tour details'],
        actionItems: ['Follow up with private tour schedule'],
        sentiment: 'positive',
      }
    }
  } catch (error) {
    stopTimer()
    throw error
  }
}

// 4. Next Best Actions Suggestion
export const suggestNextActions = async (
  input: SuggestNextActionInput,
  caller?: IUser
): Promise<SuggestNextActionResult> => {
  const stopTimer = startTimer('suggestNextActions')
  try {
    let stage = input.stage || 'Lead Ingested'
    let leadScore = input.leadScore ?? 50
    let daysSinceLastContact = input.daysSinceLastContact ?? 0
    let notes = input.notes || ''

    if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
      try {
        const query: Record<string, any> = { _id: new mongoose.Types.ObjectId(input.contactId) }
        if (caller?.brokerageId) {
          query.brokerageId = caller.brokerageId
        }

        const contact = await Contact.findOne(query).select('status leadScore notes lastContactedAt').lean()
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
      const parsed = JSON.parse(rawResponse)
      stopTimer()
      return parsed
    } catch {
      stopTimer()
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
  } catch (error) {
    stopTimer()
    throw error
  }
}
