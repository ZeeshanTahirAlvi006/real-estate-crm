import { UserRole } from '../../utils/constants.js'
import { UserResponseDto } from '../auth/auth.types.js'

export interface InviteUserInput {
  firstName: string
  lastName: string
  email: string
  role: UserRole
  phone?: string
  brokerageId?: string
}

export interface InviteUserResponseDto {
  user: UserResponseDto
  temporaryPassword: string
}

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  phone?: string
  timezone?: string
  avatarUrl?: string
}

export interface ChangeUserRoleInput {
  role: UserRole
}

export interface ListUsersQuery {
  search?: string
  role?: UserRole
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
