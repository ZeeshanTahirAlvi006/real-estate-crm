import { ObjectionCategory } from '../../../models/ObjectionPlaybook.js'

export { ObjectionCategory }

export type RebuttalAngleType = 'analytical' | 'empathetic' | 'urgency'

export interface ObjectionClassification {
  category: ObjectionCategory
  confidence: number // 0.0 to 1.0
  detectedPhrases: string[]
  rationale: string
  label: string
}

export interface RebuttalAngleDetail {
  angle: RebuttalAngleType
  title: string
  script: string
  rationale: string
  keyTalkingPoints: string[]
  followUpPrompt?: string
}

export interface MultiAngleRebuttals {
  analytical: RebuttalAngleDetail
  empathetic: RebuttalAngleDetail
  urgency: RebuttalAngleDetail
}

export interface GenerateRebuttalRequest {
  messageText: string
  category?: ObjectionCategory
  leadContext?: {
    name?: string
    propertyType?: string
    budget?: number
    timeframe?: string
    isBuyer?: boolean
    isSeller?: boolean
    city?: string
  }
  tone?: 'professional' | 'consultative' | 'direct' | 'empathetic'
}

export interface GenerateRebuttalResponse {
  category: ObjectionCategory
  categoryLabel: string
  confidence: number
  detectedPhrases: string[]
  rebuttals: MultiAngleRebuttals
  fairHousingPassed: boolean
  isFromCustomPlaybook: boolean
}

export interface PlaybookItemDto {
  id: string
  brokerageId?: string
  category: ObjectionCategory
  categoryLabel: string
  title: string
  triggerKeywords: string[]
  angles: {
    analytical: {
      script: string
      metricsUsed?: string[]
    }
    empathetic: {
      script: string
      followUpQuestion?: string
    }
    urgency: {
      script: string
      marketContext?: string
    }
  }
  isCustom: boolean
  createdAt: string
}
