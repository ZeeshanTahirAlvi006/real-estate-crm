export interface DashboardKpisDto {
  totalContacts: number
  newLeadsThisWeek: number
  activeDeals: number
  pipelineValue: number
  dataHealthScore: number
  dataHealthGrade: string
  activeUsers?: number
  highPriorityLeads?: number
  avgSpeedSeconds?: number
}

export interface LeadSourceStatDto {
  _id: string
  count: number
}

export interface LeadsOverTimeStatDto {
  _id: string // Date string (YYYY-MM-DD)
  count: number
}

export interface PipelineSummaryDto {
  _id: string // Stage ID
  count: number
  value: number
}

export interface ActivityFeedItemDto {
  id: string
  type: string
  description: string
  createdAt: string
  createdBy?: string
}

export interface LeadPortalDto {
  contactId: string
  assignedAgent?: {
    name: string
    email: string
    phone?: string
  }
  deals: Array<{
    id: string
    title: string
    value: number
    stage: string
  }>
}
