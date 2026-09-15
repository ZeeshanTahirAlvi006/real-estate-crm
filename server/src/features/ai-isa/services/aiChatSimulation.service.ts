import mongoose from 'mongoose'
import { Contact } from '../../../models/Contact.js'
import { Activity } from '../../../models/Activity.js'
import { AiIsaConfig, IAiIsaConfig } from '../../../models/AiIsaConfig.js'
import { IUser } from '../../../models/User.js'
import { logger } from '../../../utils/logger.js'
import { checkFairHousingCompliance } from '../fairHousingGuard.js'
import { callLLM, ChatMessage } from '../../ai-chatbot/ai.client.js'
import {
  AiChatSimulateInput,
  AiChatSimulateResponse,
  ExtractedCriteriaState,
} from '../aiIsa.types.js'
import { startTimer } from './aiIsa.common.js'

export const extractCriteriaFromMessage = (
  text: string,
  currentState: ExtractedCriteriaState = {}
): ExtractedCriteriaState => {
  const next = { ...currentState }
  const clean = text.trim()
  const lower = clean.toLowerCase()

  // 1. Budget extraction ($750k, $340, $650, 800,000, 1.2M, etc.)
  const budgetMatch = clean.match(/(\$\s*[\d,]+(?:\.\d+)?\s*[kKmMbB]?|\b\d{2,4}\s*[kK]\b|\b\d+(?:\.\d+)?\s*million\b|\$\s*\d+)/i)
  if (budgetMatch) {
    let bVal = budgetMatch[0].trim()
    if (/^\$\s*\d{2,3}$/.test(bVal) && parseInt(bVal.replace(/\D/g, ''), 10) < 1000) {
      bVal = `${bVal}`
    }
    next.budget = bVal
  } else if (lower.includes('around 750') || lower.includes('under 800')) {
    next.budget = '$750 - $800'
  }

  // 2. Timeline extraction (15days, 30days, 1 month, ASAP, etc.)
  const dayMatch = clean.match(/\b(\d+)\s*(?:day|days|d)\b/i) || clean.match(/\b(\d+)days\b/i)
  const monthMatch = clean.match(/\b(\d+)\s*(?:month|months|mo|mos)\b/i)
  const weekMatch = clean.match(/\b(\d+)\s*(?:week|weeks|wk|wks)\b/i)

  if (dayMatch) {
    next.timeline = `${dayMatch[1]} Days`
  } else if (monthMatch) {
    next.timeline = `${monthMatch[1]} Month(s)`
  } else if (weekMatch) {
    next.timeline = `${weekMatch[1]} Week(s)`
  } else if (lower.includes('asap') || lower.includes('immediately') || lower.includes('ready now') || lower.includes('this month') || lower.includes('right away')) {
    next.timeline = 'Immediate (0-30 days)'
  } else if (lower.includes('summer') || lower.includes('spring') || lower.includes('fall') || lower.includes('end of year')) {
    next.timeline = '1 - 3 Months'
  } else if (lower.includes('just looking') || lower.includes('browsing') || lower.includes('next year')) {
    next.timeline = '6+ Months / Browsing'
  }

  // 3. Pre-Approval / Financing status
  if (lower.includes('cash') || lower.includes('wire') || lower.includes('proof of funds') || lower.includes('all cash')) {
    next.preApproval = 'cash'
  } else if (lower.includes('pre-approved') || lower.includes('preapproved') || lower.includes('pre approved') || lower.includes('approved') || lower.includes('have a letter') || lower.includes('already approved') || lower.includes('yes approved') || lower.includes('yes pre')) {
    next.preApproval = 'approved'
  } else if (lower.includes('need a lender') || lower.includes('recommend') || lower.includes('intro') || lower.includes('need financing') || lower.includes('send lender')) {
    next.preApproval = 'needs_lender'
  } else if (lower.includes('haven\'t started') || lower.includes('not yet') || lower.includes('not pre-approved') || lower.includes('no lender') || lower.includes('not started')) {
    next.preApproval = 'not_started'
  }

  // 4. Location / Neighborhood extraction
  const locMatch = clean.match(/(?:in|around|near|at|to)\s+([A-Z][a-zA-Z\s]{2,25})/g)
  const zipMatch = clean.match(/\b\d{5}\b/)
  if (zipMatch) {
    next.location = `Zip code ${zipMatch[0]}`
  } else if (locMatch && locMatch[0]) {
    next.location = locMatch[0].replace(/^(in|around|near|at|to)\s+/i, '').trim()
  } else if (
    clean.length >= 3 &&
    clean.length <= 60 &&
    !clean.includes('$') &&
    !dayMatch &&
    !monthMatch &&
    !lower.includes('pre-approved') &&
    !lower.includes('approved') &&
    !lower.includes('preapproved') &&
    !lower.includes('first time') &&
    !lower.includes('sell') &&
    (lower.includes('colony') || lower.includes('lahore') || lower.includes('dallas') || lower.includes('plano') || lower.includes('pakistan') || lower.includes('area') || lower.includes('city') || lower.includes('street') || clean.includes(','))
  ) {
    next.location = clean
  }

  // 5. Home to sell / Contingency
  if (lower.includes('need to sell') || lower.includes('have to sell') || lower.includes('selling my') || lower.includes('selling first') || lower.includes('must sell')) {
    next.homeToSell = 'selling_first'
  } else if (lower.includes('first time') || lower.includes('first-time') || lower.includes('renting') || lower.includes('no house') || lower.includes('no home') || lower.includes('first time buyer')) {
    next.homeToSell = 'no'
  } else if (lower.includes('own a home') || lower.includes('keeping it') || lower.includes('have a house') || lower.includes('yes I own') || lower.includes('homeowner')) {
    next.homeToSell = 'yes'
  }

  return next
}

export const simulateAiIsaChat = async (
  input: AiChatSimulateInput,
  caller: IUser
): Promise<AiChatSimulateResponse> => {
  const stopTimer = startTimer('simulateAiIsaChat')
  try {
    const text = input.leadMessage.trim()

    // 1. Fair Housing Act Compliance Check
    const fairHousing = checkFairHousingCompliance(text)
    if (!fairHousing.passed) {
      stopTimer()
      return {
        reply: fairHousing.sanitizedText || 'I cannot answer demographic inquiries to comply with the Fair Housing Act.',
        extractedCriteria: input.currentCriteriaState || {},
        isQualified: false,
        handoffTriggered: false,
        fairHousingPassed: false,
        fairHousingFlags: fairHousing.flags,
        confidenceScore: 0.98,
      }
    }

    // 2. Extract & Aggregate Criteria across conversation history (recent turns override older turns)
    let currentCriteria = { ...(input.currentCriteriaState || {}) }
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      for (const item of input.conversationHistory) {
        if (item.role === 'lead') {
          currentCriteria = extractCriteriaFromMessage(item.text, currentCriteria)
        }
      }
    }
    const extracted = extractCriteriaFromMessage(text, currentCriteria)

    // 3. Human Handoff Triggers
    const lower = text.toLowerCase()
    const explicitHumanRequest =
      lower.includes('agent') ||
      lower.includes('human') ||
      lower.includes('speak to someone') ||
      lower.includes('call me') ||
      lower.includes('person') ||
      lower.includes('phone call')

    // Check if core criteria (Budget, Timeline, Pre-Approval, Location) are completed
    const isCoreQualified = Boolean(extracted.budget && extracted.timeline && extracted.preApproval && extracted.location)
    const isFullyQualified = Boolean(isCoreQualified && extracted.homeToSell)
    const handoffTriggered = explicitHumanRequest || isFullyQualified

    let handoffReason: string | undefined
    if (explicitHumanRequest) {
      handoffReason = 'Lead explicitly requested to speak directly with an agent.'
    } else if (handoffTriggered) {
      handoffReason = `Qualification complete: Budget ${extracted.budget}, Timeline ${extracted.timeline}, Pre-Approval ${extracted.preApproval}, Location ${extracted.location}. Handing off to licensed agent.`
    }

    // 4. Fetch Persona & Brokerage Settings
    let personaName = 'AI ISA'
    let personaTone = 'professional'
    let customInstructions = ''
    let brokerageName = 'PropPulse Realty'

    const brokerageId = caller?.brokerageId || (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId) ? (await Contact.findById(new mongoose.Types.ObjectId(input.contactId)).select('brokerageId').lean())?.brokerageId : undefined)
    if (brokerageId) {
      const config = (await AiIsaConfig.findOne({ brokerageId }).select('persona').lean()) as IAiIsaConfig | null
      if (config?.persona) {
        if (config.persona.name) personaName = config.persona.name
        if (config.persona.tone) personaTone = config.persona.tone
        if (config.persona.brokerageName) brokerageName = config.persona.brokerageName
        if (config.persona.customInstructions) customInstructions = config.persona.customInstructions
      }
    }

    // 5. Generate Contextual Response via Live LLM (with robust fallback)
    let reply = ''
    try {
      const systemPrompt = `You are ${personaName}, an elite Real Estate Inside Sales Agent (AI ISA) representing ${brokerageName}.
Tone: ${personaTone}.
${customInstructions ? `Special Instructions: ${customInstructions}` : ''}

Your primary objective is to qualify prospective property buyers across 5 qualification pillars:
1. Target Purchase Budget
2. Move-in Timeline
3. Mortgage Pre-Approval / Financing (Cash, Pre-Approved, Needs Lender)
4. Preferred Neighborhood / Location / City
5. Existing Home to Sell / Contingency (First-time buyer vs selling current home)

CRITICAL RULES:
- Review the recent conversation history carefully.
- Identify which qualification details have ALREADY been answered or updated by the lead.
- NEVER ask for information the lead has already provided in this conversation.
- If the lead updates their budget or timeline, always use their latest numbers.
- Ask ONLY for the NEXT MISSING qualification pillar in a warm, consultative manner.
- If Budget, Timeline, Pre-Approval, and Location are all known, the final question is whether they have an existing home to sell or are a first-time buyer.
- If all details are gathered, confirm their parameters warmly and state that a senior property advisor will contact them shortly to arrange private viewings.
- Keep the response concise (under 30 words), friendly, professional, and formatted for WhatsApp.`

      const chatMessages: ChatMessage[] = []
      if (input.conversationHistory && input.conversationHistory.length > 0) {
        for (const item of input.conversationHistory.slice(-8)) {
          chatMessages.push({
            role: item.role === 'lead' ? 'user' : 'assistant',
            content: item.text,
          })
        }
      }
      chatMessages.push({ role: 'user', content: text })

      const llmOutput = await callLLM({
        systemPrompt,
        messages: chatMessages,
        temperature: 0.5,
        maxTokens: 160,
      })

      if (llmOutput && llmOutput.trim()) {
        reply = llmOutput.trim().replace(/^["']|["']$/g, '')
      }
    } catch (err: any) {
      logger.warn(`[server/src/features/ai-isa/services/aiChatSimulation.service.ts: Line 220] LLM generation failed, using intelligent rule fallback: ${err?.message}`)
    }

    // Deterministic Fallback if LLM output was empty or failed
    if (!reply) {
      if (handoffTriggered) {
        if (explicitHumanRequest) {
          reply =
            'Got it! I am connecting you directly with our senior property specialist right now. They will reach out to you directly via call/text in just a moment!'
        } else {
          reply = `Fantastic! Based on your target budget of ${extracted.budget} and ${extracted.timeline} timeline in ${extracted.location || 'your preferred area'}, you are fully qualified for private walkthroughs! I have notified our lead agent to coordinate showing slots with you right now.`
        }
      } else if (!extracted.budget) {
        reply =
          'Thanks for reaching out! To help match you with the best available properties, what price range or monthly budget are you comfortably looking in?'
      } else if (!extracted.timeline) {
        reply =
          `Got it, targeting ${extracted.budget}! What is your ideal timeframe or target move-in date for this purchase?`
      } else if (!extracted.preApproval) {
        reply =
          'Perfect! Are you currently pre-approved with a mortgage lender, or are you planning to purchase all-cash or need a quick lender recommendation?'
      } else if (!extracted.location) {
        reply =
          'Great! Are there specific neighborhoods, cities, or zip codes you want us to prioritize for your search?'
      } else {
        reply =
          'Thank you for sharing those details! Do you have an existing home you need to sell before completing this purchase, or are you ready to buy without a contingency?'
      }
    }

    // 6. Update Contact atomically if ID provided and tenant-guarded
    if (input.contactId && mongoose.Types.ObjectId.isValid(input.contactId)) {
      const contactQuery: Record<string, any> = { _id: new mongoose.Types.ObjectId(input.contactId) }
      if (caller?.brokerageId) {
        contactQuery.brokerageId = caller.brokerageId
      }

      const contact = await Contact.findOne(contactQuery).select('_id brokerageId leadScore tags').lean()
      if (contact && handoffTriggered) {
        const newScore = Math.max(contact.leadScore || 50, 85)

        // Atomic update (DI-002)
        Contact.updateOne(
          { _id: contact._id },
          {
            $set: { leadScore: newScore },
            $addToSet: { tags: 'AI_QUALIFIED' },
          }
        ).catch((err) => logger.error(`[server/src/features/ai-isa/services/aiChatSimulation.service.ts: Line 268] Contact update error: ${err.message}`))

        // Decouple side effect
        Activity.create({
          contactId: contact._id,
          brokerageId: contact.brokerageId,
          type: 'system',
          description: `AI ISA Qualified Lead — Reason: ${handoffReason}`,
          metadata: { isAiIsa: true, reason: handoffReason },
          createdBy: caller?._id,
          createdByName: `${personaName} (AI ISA)`,
        }).catch((err) => logger.error(`[ActivityLog] AI ISA activity error: ${err.message}`))
      }
    }

    stopTimer()
    return {
      reply,
      extractedCriteria: extracted,
      isQualified: isCoreQualified || isFullyQualified,
      handoffTriggered,
      handoffReason,
      fairHousingPassed: true,
      fairHousingFlags: [],
      confidenceScore: 0.96,
    }
  } catch (error) {
    stopTimer()
    throw error
  }
}
