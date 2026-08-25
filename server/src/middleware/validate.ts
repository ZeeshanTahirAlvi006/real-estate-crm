import { Request, Response, NextFunction } from 'express'
import { AnyZodObject, ZodError } from 'zod'

interface ValidationTarget {
  body?: AnyZodObject
  query?: AnyZodObject
  params?: AnyZodObject
}

// Higher-order validation middleware for Zod schemas
export const validate = (schemas: ValidationTarget | AnyZodObject) => {
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
