import { Response } from 'express'
import { HTTP_STATUS } from './constants.js'

// Standard API Success Response Structure
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  errors?: unknown
  meta?: {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
  }
}

// Send standard successful response
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message: string = 'Operation successful',
  statusCode: number = HTTP_STATUS.OK
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data,
  }
  return res.status(statusCode).json(responsePayload)
}

// Send standard error response
export const sendError = (
  res: Response,
  message: string = 'Internal server error',
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: unknown
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    errors,
  }
  return res.status(statusCode).json(responsePayload)
}

// Send standard paginated response
export const sendPaginated = <T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully'
): Response => {
  const totalPages = Math.ceil(total / (limit || 1))
  const responsePayload: ApiResponse<T[]> = {
    success: true,
    message,
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
  return res.status(HTTP_STATUS.OK).json(responsePayload)
}
