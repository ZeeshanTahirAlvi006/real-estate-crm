import mongoose from 'mongoose'
import {
  ObjectionCategory,
  ObjectionClassification,
  GenerateRebuttalRequest,
  GenerateRebuttalResponse,
  PlaybookItemDto,
  MultiAngleRebuttals,
} from './objection.types.js'
import {
  OBJECTION_CATEGORY_LABELS,
  OBJECTION_KEYWORDS,
  CURATED_PLAYBOOKS,
  SYSTEM_OBJECTION_PROMPT,
} from './objection.prompts.js'
import { ObjectionPlaybook } from '../../../models/ObjectionPlaybook.js'
import { callLLM } from '../ai.client.js'
import { complianceService } from '../../compliance/compliance.service.js'
import { logger } from '../../../utils/logger.js'
import { BoundedLruCache } from '../../../utils/lruCache.js'

// ── Timer Utility for CMD Benchmarking ──────────────────────
const startTimer = (fnName: string) => {
  const t0 = process.hrtime.bigint()
  return () => {
    const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
    setImmediate(() => {
      console.log(`[ObjectionService Timer] ${fnName} completed in ${deltaMs.toFixed(3)}ms`)
    })
    return deltaMs
  }
}

// Bounded L1 Cache for Playbooks
export const playbookL1Cache = new BoundedLruCache<PlaybookItemDto[]>(200, 120)
export const customPlaybookL1Cache = new BoundedLruCache<any>(200, 120)

export class ObjectionService {
  /**
   * Fast heuristic and NLP classifier for real estate objections
   */
  public classifyObjection(text: string): ObjectionClassification {
    const stopTimer = startTimer('classifyObjection')
    const lower = text.toLowerCase()
    const matchScores: Record<ObjectionCategory, { score: number; matches: string[] }> = {
      interest_rates: { score: 0, matches: [] },
      market_crash: { score: 0, matches: [] },
      commission_fees: { score: 0, matches: [] },
      lowball_offers: { score: 0, matches: [] },
      timing_delay: { score: 0, matches: [] },
      other: { score: 0, matches: [] },
    }

    // Heuristic regex keyword scanning
    for (const [cat, keywords] of Object.entries(OBJECTION_KEYWORDS) as [ObjectionCategory, string[]][]) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          matchScores[cat].score += kw.length > 5 ? 2 : 1
          matchScores[cat].matches.push(kw)
        }
      }
    }

    // Identify highest scoring category
    let topCategory: ObjectionCategory = 'other'
    let maxScore = 0

    for (const [cat, data] of Object.entries(matchScores) as [ObjectionCategory, { score: number; matches: string[] }][]) {
      if (data.score > maxScore) {
        maxScore = data.score
        topCategory = cat
      }
    }

    const confidence = maxScore === 0 ? 0.35 : Math.min(0.55 + maxScore * 0.12, 0.98)
    const detectedPhrases = matchScores[topCategory].matches

    stopTimer()
    return {
      category: topCategory,
      label: OBJECTION_CATEGORY_LABELS[topCategory],
      confidence: Math.round(confidence * 100) / 100,
      detectedPhrases,
      rationale:
        maxScore > 0
          ? `Detected keywords matching ${OBJECTION_CATEGORY_LABELS[topCategory]} pattern.`
          : 'General client hesitation requiring consultative clarification.',
    }
  }

  /**
   * Generates multi-angle (analytical, empathetic, urgency) rebuttals
   */
  public async generateRebuttals(
    req: GenerateRebuttalRequest,
    brokerageId?: string
  ): Promise<GenerateRebuttalResponse> {
    const stopTimer = startTimer('generateRebuttals')
    try {
      // 1. Determine category if not explicitly specified
      const classification = req.category
        ? {
            category: req.category,
            label: OBJECTION_CATEGORY_LABELS[req.category],
            confidence: 0.95,
            detectedPhrases: [],
            rationale: 'Category explicitly specified by user.',
          }
        : this.classifyObjection(req.messageText)

      const category = classification.category

      // 2. Check for brokerage custom playbook override in DB (cached in L1)
      let customPlaybook = null
      const cacheKey = `custom:${brokerageId}:${category}`
      if (brokerageId) {
        customPlaybook = customPlaybookL1Cache.get(cacheKey)
      }

      if (!customPlaybook && brokerageId && mongoose.Types.ObjectId.isValid(brokerageId) && mongoose.connection.readyState === 1) {
        customPlaybook = await ObjectionPlaybook.findOne({
          brokerageId: new mongoose.Types.ObjectId(brokerageId),
          category,
          isDeleted: false,
        }).select('title angles category').lean()

        if (customPlaybook) {
          customPlaybookL1Cache.set(cacheKey, customPlaybook)
        }
      }

      // 3. If brokerage custom playbook exists, construct from custom playbook
      if (customPlaybook) {
        const rebuttals: MultiAngleRebuttals = {
          analytical: {
            angle: 'analytical',
            title: customPlaybook.title || 'Custom Analytical Approach',
            script: customPlaybook.angles.analytical.script,
            rationale: 'Brokerage custom analytical playbook',
            keyTalkingPoints: customPlaybook.angles.analytical.metricsUsed || ['Company proprietary methodology'],
          },
          empathetic: {
            angle: 'empathetic',
            title: customPlaybook.title || 'Custom Empathetic Approach',
            script: customPlaybook.angles.empathetic.script,
            rationale: 'Brokerage custom relationship-first playbook',
            keyTalkingPoints: ['Company consultative standard'],
            followUpPrompt: customPlaybook.angles.empathetic.followUpQuestion,
          },
          urgency: {
            angle: 'urgency',
            title: customPlaybook.title || 'Custom Urgency Approach',
            script: customPlaybook.angles.urgency.script,
            rationale: 'Brokerage custom opportunity playbook',
            keyTalkingPoints: ['Company local market leverage'],
          },
        }

        stopTimer()
        return {
          category,
          categoryLabel: OBJECTION_CATEGORY_LABELS[category],
          confidence: classification.confidence,
          detectedPhrases: classification.detectedPhrases,
          rebuttals,
          fairHousingPassed: true,
          isFromCustomPlaybook: true,
        }
      }

      // 4. Try AI Dynamic Rebuttal Generation via callLLM
      let aiRebuttals: MultiAngleRebuttals | null = null
      try {
        const userPrompt = `
Generate real estate agent rebuttals for this client objection:
"${req.messageText}"

Detected Category: ${category}
${req.leadContext ? `Lead Context: ${JSON.stringify(req.leadContext)}` : ''}
${req.tone ? `Preferred Tone: ${req.tone}` : ''}
        `

        const rawResponse = await callLLM({
          systemPrompt: SYSTEM_OBJECTION_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.6,
          maxTokens: 1000,
          jsonMode: true,
        })

        if (rawResponse) {
          const parsed = JSON.parse(rawResponse)
          if (parsed.rebuttals?.analytical && parsed.rebuttals?.empathetic && parsed.rebuttals?.urgency) {
            aiRebuttals = parsed.rebuttals
          }
        }
      } catch (err: any) {
        logger.info(`[ObjectionService] AI fallback triggered for category: ${category}`)
      }

      // 5. Fallback to curated battle-tested playbooks if AI unavailable or invalid
      const defaultPlaybook = CURATED_PLAYBOOKS[category] || CURATED_PLAYBOOKS.other
      const finalRebuttals: MultiAngleRebuttals = aiRebuttals || defaultPlaybook.angles

      // 6. Mandatory Fair Housing Compliance Scan on all 3 generated angles
      let fairHousingPassed = true
      for (const key of ['analytical', 'empathetic', 'urgency'] as const) {
        const angleObj = finalRebuttals[key]
        if (angleObj && angleObj.script) {
          const scan = complianceService.scanListingContent(angleObj.script)
          if (!scan.isCompliant) {
            fairHousingPassed = false
            // Auto-sanitize violations with statutory compliant substitutions
            angleObj.script = scan.cleanedText
          }
        }
      }

      stopTimer()
      return {
        category,
        categoryLabel: OBJECTION_CATEGORY_LABELS[category],
        confidence: classification.confidence,
        detectedPhrases: classification.detectedPhrases,
        rebuttals: finalRebuttals,
        fairHousingPassed,
        isFromCustomPlaybook: false,
      }
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * Retrieve curated playbooks merged with brokerage custom scripts
   */
  public async getPlaybooks(brokerageId?: string, category?: ObjectionCategory): Promise<PlaybookItemDto[]> {
    const stopTimer = startTimer('getPlaybooks')
    try {
      const cacheKey = `playbooks:${brokerageId || 'global'}:${category || 'all'}`
      const cached = playbookL1Cache.get(cacheKey)
      if (cached) {
        stopTimer()
        return cached
      }

      const items: PlaybookItemDto[] = []

      // 1. Fetch custom playbooks for brokerage
      if (brokerageId && mongoose.Types.ObjectId.isValid(brokerageId) && mongoose.connection.readyState === 1) {
        const query: any = {
          brokerageId: new mongoose.Types.ObjectId(brokerageId),
          isDeleted: false,
        }
        if (category) query.category = category

        const customList = await ObjectionPlaybook.find(query)
          .select('_id brokerageId category title triggerKeywords angles isCustom createdAt')
          .sort({ updatedAt: -1 })
          .lean()

        for (const doc of customList) {
          items.push({
            id: doc._id.toString(),
            brokerageId: doc.brokerageId?.toString(),
            category: doc.category,
            categoryLabel: OBJECTION_CATEGORY_LABELS[doc.category],
            title: doc.title,
            triggerKeywords: doc.triggerKeywords || [],
            angles: {
              analytical: {
                script: doc.angles.analytical.script,
                metricsUsed: doc.angles.analytical.metricsUsed,
              },
              empathetic: {
                script: doc.angles.empathetic.script,
                followUpQuestion: doc.angles.empathetic.followUpQuestion,
              },
              urgency: {
                script: doc.angles.urgency.script,
                marketContext: doc.angles.urgency.marketContext,
              },
            },
            isCustom: true,
            createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
          })
        }
      }

      // 2. Add default curated playbooks if no custom override for that category
      for (const [cat, data] of Object.entries(CURATED_PLAYBOOKS) as [ObjectionCategory, any][]) {
        if (category && cat !== category) continue
        const alreadyHasCustom = items.some((i) => i.category === cat && i.isCustom)
        if (!alreadyHasCustom) {
          items.push({
            id: `default-${cat}`,
            category: cat,
            categoryLabel: OBJECTION_CATEGORY_LABELS[cat],
            title: data.title,
            triggerKeywords: data.triggerKeywords || [],
            angles: {
              analytical: {
                script: data.angles.analytical.script,
                metricsUsed: data.angles.analytical.keyTalkingPoints,
              },
              empathetic: {
                script: data.angles.empathetic.script,
                followUpQuestion: data.angles.empathetic.followUpPrompt,
              },
              urgency: {
                script: data.angles.urgency.script,
                marketContext: data.angles.urgency.rationale,
              },
            },
            isCustom: false,
            createdAt: new Date().toISOString(),
          })
        }
      }

      playbookL1Cache.set(cacheKey, items)
      stopTimer()
      return items
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * Save or update a brokerage custom playbook script
   */
  public async savePlaybook(brokerageId: string, data: any, userId?: string): Promise<PlaybookItemDto> {
    const stopTimer = startTimer('savePlaybook')
    try {
      const filter = {
        brokerageId: new mongoose.Types.ObjectId(brokerageId),
        category: data.category,
        isDeleted: false,
      }

      const update = {
        title: data.title,
        triggerKeywords: data.triggerKeywords || [],
        angles: data.angles,
        isCustom: true,
        createdBy: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null,
      }

      const saved = await ObjectionPlaybook.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean()

      playbookL1Cache.clear()
      customPlaybookL1Cache.delete(`custom:${brokerageId}:${data.category}`)

      stopTimer()
      return {
        id: saved._id.toString(),
        brokerageId: saved.brokerageId?.toString(),
        category: saved.category,
        categoryLabel: OBJECTION_CATEGORY_LABELS[saved.category],
        title: saved.title,
        triggerKeywords: saved.triggerKeywords,
        angles: saved.angles,
        isCustom: true,
        createdAt: saved.createdAt.toISOString(),
      }
    } catch (error) {
      stopTimer()
      throw error
    }
  }

  /**
   * Delete a custom playbook script
   */
  public async deletePlaybook(brokerageId: string, id: string): Promise<boolean> {
    const stopTimer = startTimer('deletePlaybook')
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        stopTimer()
        return false
      }

      const result = await ObjectionPlaybook.updateOne(
        {
          _id: new mongoose.Types.ObjectId(id),
          brokerageId: new mongoose.Types.ObjectId(brokerageId),
        },
        { isDeleted: true }
      )

      playbookL1Cache.clear()
      customPlaybookL1Cache.clear()

      stopTimer()
      return result.modifiedCount > 0
    } catch (error) {
      stopTimer()
      throw error
    }
  }
}

export const objectionService = new ObjectionService()
