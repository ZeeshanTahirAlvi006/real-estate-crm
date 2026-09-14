import mongoose from 'mongoose'

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

export interface CachedPipelineListResult {
  pipelines: PipelineResponse[]
  source: 'l1' | 'l2' | 'db'
}

export interface CachedPipelineDetailResult {
  pipeline: PipelineResponse
  source: 'l1' | 'l2' | 'db'
}

// Helper to serialize a pipeline doc into response shape (without deal stats)
export const serializePipeline = (
  doc: any,
  stageStats?: Map<string, { dealCount: number; totalValue: number }>
): PipelineResponse => {
  const stages = doc.stages ? [...doc.stages] : []
  const docId = (doc._id ? doc._id.toString() : doc.id || '').toString()
  const docBrokerageId = (doc.brokerageId ? doc.brokerageId.toString() : '').toString()

  return {
    id: docId,
    name: doc.name || '',
    brokerageId: docBrokerageId,
    isDefault: Boolean(doc.isDefault),
    stages: stages
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((s: any) => {
        const sId = (s._id || s.id || new mongoose.Types.ObjectId()).toString()
        const stats = stageStats?.get(sId) || { dealCount: 0, totalValue: 0 }
        const prob = typeof s.probability === 'number' ? s.probability : 0
        return {
          id: sId,
          name: s.name || '',
          color: s.color || '#6366f1',
          order: typeof s.order === 'number' ? s.order : 0,
          probability: prob,
          dealCount: stats.dealCount,
          totalValue: stats.totalValue,
          weightedValue: Math.round((stats.totalValue * prob) / 100),
        }
      }),
    createdAt: doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : doc.createdAt
        ? new Date(doc.createdAt).toISOString()
        : new Date().toISOString(),
    updatedAt: doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : new Date().toISOString(),
  }
}
