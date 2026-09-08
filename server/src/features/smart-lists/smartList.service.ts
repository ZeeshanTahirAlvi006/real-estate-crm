import { FilterQuery } from 'mongoose'
import { SmartList, ISmartList } from '../../models/SmartList.js'
import { Contact, IContact } from '../../models/Contact.js'
import { SmartListFilterDto, CreateSmartListDto, UpdateSmartListDto } from './smartList.types.js'
import { AppError } from '../../middleware/errorHandler.js'

export const buildMongoQueryFromFilters = (
  tenantFilter: Record<string, any>,
  filters: SmartListFilterDto[]
): FilterQuery<IContact> => {
  const query: FilterQuery<IContact> = { ...tenantFilter, isDeleted: false }

  if (!filters || filters.length === 0) {
    return query
  }

  const andConditions: any[] = []

  filters.forEach((filter) => {
    // Only support top-level Contact fields for now
    const field = filter.field
    let condition: any = {}

    switch (filter.operator) {
      case 'equals':
        condition[field] = { $eq: filter.value }
        break
      case 'not_equals':
        condition[field] = { $ne: filter.value }
        break
      case 'contains':
        // Escape regex special characters
        const safeValue = String(filter.value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        condition[field] = { $regex: safeValue, $options: 'i' }
        break
      case 'greater_than':
        condition[field] = { $gt: Number(filter.value) }
        break
      case 'less_than':
        condition[field] = { $lt: Number(filter.value) }
        break
      case 'between':
        if (Array.isArray(filter.value) && filter.value.length === 2) {
          condition[field] = { $gte: Number(filter.value[0]), $lte: Number(filter.value[1]) }
        }
        break
      case 'in':
        if (Array.isArray(filter.value)) {
          condition[field] = { $in: filter.value }
        } else if (typeof filter.value === 'string') {
          condition[field] = { $in: filter.value.split(',').map(v => v.trim()) }
        }
        break
      case 'is_empty':
        condition[field] = { $in: [null, '', []] } // Handle missing or empty strings/arrays
        break
      case 'is_not_empty':
        condition[field] = { $nin: [null, '', []] }
        break
    }

    if (Object.keys(condition).length > 0) {
      andConditions.push(condition)
    }
  })

  if (andConditions.length > 0) {
    query.$and = andConditions
  }

  return query
}

export const getSmartLists = async (brokerageId: string, userId: string): Promise<ISmartList[]> => {
  // Can return lists created by the user or all in brokerage if public, but for now user-specific or brokerage-specific
  return SmartList.find({ brokerageId, createdBy: userId }).sort({ name: 1 })
}

export const createSmartList = async (
  brokerageId: string,
  userId: string,
  data: CreateSmartListDto
): Promise<ISmartList> => {
  const smartList = new SmartList({
    name: data.name,
    filters: data.filters,
    brokerageId,
    createdBy: userId,
  })
  return smartList.save()
}

export const updateSmartList = async (
  id: string,
  brokerageId: string,
  userId: string,
  data: UpdateSmartListDto
): Promise<ISmartList> => {
  const smartList = await SmartList.findOne({ _id: id, brokerageId, createdBy: userId })
  if (!smartList) {
    throw new AppError('Smart list not found or unauthorized')
  }

  if (data.name !== undefined) smartList.name = data.name
  if (data.filters !== undefined) smartList.filters = data.filters as any

  return smartList.save()
}

export const deleteSmartList = async (
  id: string,
  brokerageId: string,
  userId: string
): Promise<void> => {
  const result = await SmartList.deleteOne({ _id: id, brokerageId, createdBy: userId })
  if (result.deletedCount === 0) {
    throw new AppError('Smart list not found or unauthorized')
  }
}

export const previewSmartList = async (
  tenantFilter: Record<string, any>,
  filters: SmartListFilterDto[],
  page: number = 1,
  limit: number = 50
) => {
  const query = buildMongoQueryFromFilters(tenantFilter, filters)
  const skip = (page - 1) * limit

  const [contacts, total] = await Promise.all([
    Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Contact.countDocuments(query),
  ])

  return { contacts, total, page, limit }
}
