export interface PaginationParams {
  page?: number
  limit?: number
  defaultLimit?: number
  maxLimit?: number
}

export interface PaginationResult {
  page: number
  limit: number
  skip: number
  totalPages: (total: number) => number
}

// Calculate pagination offset and limit boundaries
export const getPagination = (params: PaginationParams): PaginationResult => {
  const defaultLimit = params.defaultLimit || 25
  const maxLimit = params.maxLimit || 100

  const page = Math.max(1, Number(params.page) || 1)
  const rawLimit = Number(params.limit) || defaultLimit
  const limit = Math.min(Math.max(1, rawLimit), maxLimit)
  const skip = (page - 1) * limit

  return {
    page,
    limit,
    skip,
    totalPages: (total: number) => Math.ceil(total / (limit || 1)),
  }
}
