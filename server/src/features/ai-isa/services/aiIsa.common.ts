import { IQualificationCriteria } from '../../../models/QualificationCriteria.js'
import { IReactivationCampaign } from '../../../models/ReactivationCampaign.js'
import { IAiIsaConfig } from '../../../models/AiIsaConfig.js'
import { BoundedLruCache } from '../../../utils/lruCache.js'
import { invalidateTenantFeatureCache } from '../../../utils/cacheHelper.js'
import {
  AiIsaConfigDto,
  QualificationCriteriaDto,
  ReactivationCampaignDto,
  CampaignMetricsDto,
  SpeedToLeadMetricDto,
} from '../aiIsa.types.js'

// ── Timer Utility for CMD Benchmarking ──────────────────────
export const startTimer = (fnName: string) => {
  const t0 = process.hrtime.bigint()
  return () => {
    const deltaMs = Number(process.hrtime.bigint() - t0) / 1e6
    setImmediate(() => {
      console.log(`[AI ISA Timer] ${fnName} completed in ${deltaMs.toFixed(3)}ms`)
    })
    return deltaMs
  }
}

// ── Default Criteria Seeds ──────────────────────────────
export const DEFAULT_CRITERIA_SEEDS = [
  {
    category: 'budget' as const,
    label: 'Target Purchase Budget',
    isRequired: true,
    promptDirective: 'Determine their comfortable price ceiling and financing range.',
    options: ['Under PKR 500k', 'PKR 500k - 750k', 'PKR 750k - 1M', 'PKR 1M - 1.5M', 'PKR 1.5M+'],
    order: 0,
  },
  {
    category: 'timeline' as const,
    label: 'Purchase Timeline',
    isRequired: true,
    promptDirective: 'Identify their target move-in or closing date.',
    options: ['Immediate (0-30 days)', '1 - 3 Months', '3 - 6 Months', '6+ Months / Browsing'],
    order: 1,
  },
  {
    category: 'pre_approval' as const,
    label: 'Mortgage Pre-Approval Status',
    isRequired: true,
    promptDirective: 'Verify if they have lender pre-approval or are paying cash.',
    options: ['Pre-Approved', 'Cash Buyer', 'Need Lender Intro', 'Not Started'],
    order: 2,
  },
  {
    category: 'location' as const,
    label: 'Target Neighborhood / Location',
    isRequired: true,
    promptDirective: 'Ascertain preferred cities, zip codes, or school districts.',
    options: ['Downtown / Urban', 'Suburbs', 'School District Focus', 'Flexible'],
    order: 3,
  },
  {
    category: 'home_to_sell' as const,
    label: 'Existing Home Contingency',
    isRequired: false,
    promptDirective: 'Determine if purchase is contingent on selling their existing home.',
    options: ['First-Time Buyer', 'Selling Current Home First', 'Keeping Existing Home', 'Cash / No Contingency'],
    order: 4,
  },
]

// ── Default Campaign Seeds ──────────────────────────────
export const DEFAULT_CAMPAIGN_SEEDS = [
  {
    name: '30-Day Cold Lead Reactivation',
    status: 'active' as const,
    targetSegment: 'Uncontacted Inquiries (30+ Days)',
    channel: 'whatsapp' as const,
    messageTemplate:
      'Hi {{firstName}}, are you still looking for homes in your search area, or have your plans shifted? We just had new off-market listings hit our desk this morning!',
    dormantDaysThreshold: 30,
    totalLeads: 48,
    contactedCount: 48,
    respondedCount: 22,
    engagedCount: 22,
    convertedCount: 7,
    meetingsBookedCount: 4,
  },
  {
    name: 'Price Drop Broadcast',
    status: 'active' as const,
    targetSegment: 'Engaged Price Watchers',
    channel: 'whatsapp' as const,
    messageTemplate:
      'Exciting update {{firstName}}! A 4-bedroom home matching your criteria just had a PKR 25,000 price adjustment. Would you like me to send you the updated walkthrough link?',
    dormantDaysThreshold: 60,
    totalLeads: 36,
    contactedCount: 36,
    respondedCount: 19,
    engagedCount: 19,
    convertedCount: 6,
    meetingsBookedCount: 3,
  },
  {
    name: 'Weekend Open House Push',
    status: 'active' as const,
    targetSegment: 'Active Weekend Buyers',
    channel: 'whatsapp' as const,
    messageTemplate:
      'Hi {{firstName}}, our brokerage is hosting exclusive private preview tours this Saturday from 11 AM - 2 PM. Can I reserve a priority tour slot for you?',
    dormantDaysThreshold: 45,
    totalLeads: 29,
    contactedCount: 29,
    respondedCount: 15,
    engagedCount: 15,
    convertedCount: 5,
    meetingsBookedCount: 5,
  },
  {
    name: 'Past Buyer Equity Check-In',
    status: 'paused' as const,
    targetSegment: 'Past Closed Clients (12+ Months)',
    channel: 'email' as const,
    messageTemplate:
      'Hi {{firstName}}, neighborhood valuations in your subdivision have increased recently. Would you like a complimentary updated Home Equity Assessment Report?',
    dormantDaysThreshold: 365,
    totalLeads: 64,
    contactedCount: 0,
    respondedCount: 0,
    engagedCount: 0,
    convertedCount: 0,
    meetingsBookedCount: 0,
  },
]

// ── Projection Constants for Zero Memory Bloat (PERF-M-002) ──
export const AI_ISA_CONFIG_PROJECTION = '_id brokerageId isEnabled persona officeHoursOnly autoReplyChannels autoPilotEnabled humanHandoffDelaySeconds qualificationThresholdScore'
export const CRITERIA_PROJECTION = '_id brokerageId category label isRequired promptDirective options order'
export const CAMPAIGN_PROJECTION = '_id brokerageId name status targetSegment channel messageTemplate dormantDaysThreshold totalLeads contactedCount respondedCount engagedCount convertedCount meetingsBookedCount lastExecutedAt lastRunAt'

// ── Formatters ──────────────────────────────────────────
export const formatConfigDto = (c: IAiIsaConfig): AiIsaConfigDto => ({
  brokerageId: c.brokerageId.toString(),
  isEnabled: c.isEnabled,
  persona: {
    name: c.persona.name,
    tone: c.persona.tone,
    agentName: c.persona.agentName,
    brokerageName: c.persona.brokerageName,
    customInstructions: c.persona.customInstructions,
  },
  officeHoursOnly: c.officeHoursOnly,
  autoReplyChannels: c.autoReplyChannels,
  autoPilotEnabled: c.autoPilotEnabled,
  humanHandoffDelaySeconds: c.humanHandoffDelaySeconds,
  qualificationThresholdScore: c.qualificationThresholdScore,
})

export const formatCriteriaDto = (c: IQualificationCriteria): QualificationCriteriaDto => ({
  id: c._id.toString(),
  category: c.category,
  label: c.label,
  isRequired: c.isRequired,
  promptDirective: c.promptDirective,
  options: c.options || [],
  order: c.order,
})

export const formatCampaignDto = (c: IReactivationCampaign): ReactivationCampaignDto => ({
  id: c._id.toString(),
  name: c.name,
  status: c.status,
  targetSegment: c.targetSegment,
  channel: c.channel,
  messageTemplate: c.messageTemplate,
  dormantDaysThreshold: c.dormantDaysThreshold,
  totalLeads: c.totalLeads,
  contactedCount: c.contactedCount,
  respondedCount: c.respondedCount,
  engagedCount: c.engagedCount,
  convertedCount: c.convertedCount,
  meetingsBookedCount: c.meetingsBookedCount,
  lastExecutedAt: c.lastExecutedAt?.toISOString(),
  lastRunAt: c.lastRunAt?.toISOString(),
})

// ── 2-Tier Caching Architecture (Bounded L1 + Distributed L2) ──
export const aiIsaConfigL1Cache = new BoundedLruCache<AiIsaConfigDto>(200, 60)
export const criteriaL1Cache = new BoundedLruCache<QualificationCriteriaDto[]>(200, 60)
export const campaignsL1Cache = new BoundedLruCache<ReactivationCampaignDto[]>(200, 60)
export const campaignDetailL1Cache = new BoundedLruCache<ReactivationCampaignDto>(500, 60)
export const campaignMetricsL1Cache = new BoundedLruCache<CampaignMetricsDto>(200, 30)
export const speedMetricsL1Cache = new BoundedLruCache<SpeedToLeadMetricDto>(100, 30)

/**
 * Coordinated Cache Invalidation Helper
 */
export const invalidateAiIsaCaches = async (brokerageId?: string): Promise<void> => {
  if (brokerageId) {
    aiIsaConfigL1Cache.delete(`cfg:${brokerageId}`)
    criteriaL1Cache.delete(`crit:${brokerageId}`)
    campaignsL1Cache.delete(`camps:${brokerageId}`)
    speedMetricsL1Cache.delete(`speed:${brokerageId}`)
    invalidateTenantFeatureCache(brokerageId, 'ai-isa').catch(() => { })
  } else {
    aiIsaConfigL1Cache.clear()
    criteriaL1Cache.clear()
    campaignsL1Cache.clear()
    campaignDetailL1Cache.clear()
    campaignMetricsL1Cache.clear()
    speedMetricsL1Cache.clear()
  }
}
