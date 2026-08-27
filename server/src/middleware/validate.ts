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
        // Single schema defaults to validating req.body
        req.body = await schemas.parseAsync(req.body)
      } else {
        if (schemas.body) {
          req.body = await schemas.body.parseAsync(req.body)
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
