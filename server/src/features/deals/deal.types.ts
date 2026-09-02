import type { IDeal, DealPriority } from '../../models/Deal.js'

// Request DTOs 

export interface CreateDealInput {
  pipelineId: string
  stageId: string
  contactId: string
  propertyAddress: string
  dealValue: number
  assignedAgentId: string
  priority?: DealPriority
  notes?: string
}

export interface UpdateDealInput {
  propertyAddress?: string
  dealValue?: number
  assignedAgentId?: string
  priority?: DealPriority
  notes?: string
}

export interface MoveDealStageInput {
  newStageId: string
}

export interface ListDealsQuery {
  pipelineId?: string
  stageId?: string
  assignedAgentId?: string
  priority?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Response DTOs 

export interface DealResponseDto {
  id: string
  pipelineId: string
  stageId: string
  stageName?: string
  contactId: string
  contactName: string
  propertyAddress: string
  dealValue: number
  assignedAgentId: string
  assignedAgentName: string
  priority: DealPriority
  daysInStage: number
  stageEnteredAt: string
  isConvertedToEscrow?: boolean
  transactionId?: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface KanbanStageData {
  id: string
  name: string
  color: string
  order: number
  probability: number
  dealCount: number
  totalValue: number
  weightedValue: number
  deals: DealResponseDto[]
}

export interface KanbanResponse {
  pipelineId: string
  pipelineName: string
  stages: KanbanStageData[]
  summary: {
    totalDeals: number
    totalValue: number
    weightedForecast: number
  }
}

// Helper to format a deal document into response DTO
export const formatDealDto = (deal: IDeal, stageName?: string): DealResponseDto => ({
  id: deal._id.toString(),
  pipelineId: deal.pipelineId.toString(),
  stageId: deal.stageId.toString(),
  stageName,
  contactId: deal.contactId.toString(),
  contactName: deal.contactName,
  propertyAddress: deal.propertyAddress,
  dealValue: deal.dealValue,
  assignedAgentId: deal.assignedAgentId.toString(),
  assignedAgentName: deal.assignedAgentName,
  priority: deal.priority,
  daysInStage: Math.floor((Date.now() - (deal.stageEnteredAt?.getTime() || Date.now())) / 86400000),
  stageEnteredAt: deal.stageEnteredAt?.toISOString() || new Date().toISOString(),
  isConvertedToEscrow: deal.isConvertedToEscrow || false,
  transactionId: deal.transactionId?.toString(),
  notes: deal.notes || '',
  createdAt: deal.createdAt.toISOString(),
  updatedAt: deal.updatedAt.toISOString(),
})
