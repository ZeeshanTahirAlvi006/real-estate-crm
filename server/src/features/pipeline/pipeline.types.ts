import type { IPipeline, IPipelineStage } from '../../models/Pipeline.js'

//  Request DTOs 

export interface CreatePipelineInput {
  name: string
  stages?: CreateStageInput[]
}

export interface UpdatePipelineInput {
  name?: string
}

export interface CreateStageInput {
  name: string
  color: string
  probability: number
}

export interface UpdateStageInput {
  name?: string
  color?: string
  probability?: number
}

export interface ReorderStagesInput {
  orderings: { stageId: string; order: number }[]
}

//  Response DTOs 

export interface StageWithStats {
  id: string
  name: string
  color: string
  order: number
  probability: number
  dealCount: number
  totalValue: number
  weightedValue: number // totalValue * probability / 100
}

export interface PipelineResponse {
  id: string
  name: string
  brokerageId: string
  isDefault: boolean
  stages: StageWithStats[]
  createdAt: string
  updatedAt: string
}

export interface PipelineListResponse {
  pipelines: PipelineResponse[]
}

// Helper to serialize a pipeline doc into response shape (without deal stats)
export const serializePipeline = (
  doc: IPipeline,
  stageStats?: Map<string, { dealCount: number; totalValue: number }>
): PipelineResponse => ({
  id: doc._id.toString(),
  name: doc.name,
  brokerageId: doc.brokerageId.toString(),
  isDefault: doc.isDefault,
  stages: doc.stages
    .sort((a, b) => a.order - b.order)
    .map((s: IPipelineStage) => {
      const stats = stageStats?.get(s._id.toString()) || { dealCount: 0, totalValue: 0 }
      return {
        id: s._id.toString(),
        name: s.name,
        color: s.color,
        order: s.order,
        probability: s.probability,
        dealCount: stats.dealCount,
        totalValue: stats.totalValue,
        weightedValue: Math.round((stats.totalValue * s.probability) / 100),
      }
    }),
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
})
