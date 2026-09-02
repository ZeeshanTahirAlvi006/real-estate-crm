import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError, ZodEffects } from 'zod'

type AnyZodSchema = AnyZodObject | ZodEffects<AnyZodObject, any, any>

interface ValidationTarget {
  body?: AnyZodSchema
  query?: AnyZodSchema
  params?: AnyZodSchema
}

// Higher-order validation middleware for Zod schemas
export const validate = (schemas: ValidationTarget | AnyZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ('parseAsync' in schemas) {
        const shape = (schemas as any).shape || (schemas as any)._def?.schema?.shape
        if (shape && (shape.body || shape.params || shape.query)) {
          const result = (await schemas.parseAsync({
            body: req.body || {},
            query: req.query || {},
            params: req.params || {},
          })) as any

          if (result.body !== undefined) req.body = result.body
          if (result.query !== undefined) req.query = result.query
          if (result.params !== undefined) req.params = result.params
        } else {
          // Single schema defaults to validating req.body
          req.body = await schemas.parseAsync(req.body || {})
        }
      } else {
        if (schemas.body) {
          req.body = await schemas.body.parseAsync(req.body || {})
        }
        if (schemas.query) {
          req.query = (await schemas.query.parseAsync(req.query)) as any
        }
        if (schemas.params) {
          req.params = (await schemas.params.parseAsync(req.params)) as any
        }
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        next(error)
      } else {
        next(error)
      }
    }
  }
}
