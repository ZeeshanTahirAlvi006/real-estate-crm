import { FilterOperator } from '../../models/SmartList.js'

export interface SmartListFilterDto {
  id: string
  field: string
  operator: FilterOperator
  value?: any
}

export interface CreateSmartListDto {
  name: string
  filters: SmartListFilterDto[]
}

export interface UpdateSmartListDto {
  name?: string
  filters?: SmartListFilterDto[]
}

export interface SmartListPreviewQueryDto {
  filters: SmartListFilterDto[]
  page?: number
  limit?: number
}
