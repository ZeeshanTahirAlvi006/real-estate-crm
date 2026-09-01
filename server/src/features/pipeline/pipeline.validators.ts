import { z } from 'zod'

//  Stage schemas 

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

export const createStageSchema = z.object({
  name: z.string().trim().min(1, 'Stage name is required').max(60),
  color: z.string().trim().regex(hexColorRegex, 'Color must be a valid 6-digit hex code'),
  probability: z.number().min(0).max(100).default(0),
})

export const updateStageSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.string().trim().regex(hexColorRegex, 'Color must be a valid 6-digit hex code').optional(),
  probability: z.number().min(0).max(100).optional(),
})

export const reorderStagesSchema = z.object({
  orderings: z
    .array(
      z.object({
        stageId: z.string().min(1, 'Stage ID is required'),
        order: z.number().int().min(0),
      })
    )
    .min(1, 'At least one ordering is required'),
})

//  Pipeline schemas 

export const createPipelineSchema = z.object({
  name: z.string().trim().min(1, 'Pipeline name is required').max(100),
  stages: z.array(createStageSchema).optional(),
})

export const updatePipelineSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
})

//  Query/Param schemas 

export const pipelineIdParamSchema = z.object({
  id: z.string().min(1, 'Pipeline ID is required'),
})

export const stageIdParamSchema = z.object({
  id: z.string().min(1, 'Pipeline ID is required'),
  stageId: z.string().min(1, 'Stage ID is required'),
})
