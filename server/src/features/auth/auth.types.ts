import { UserRole } from '../../utils/constants.js'

export interface UserResponseDto {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  brokerageId: string
  brokerageName?: string
  phone?: string
  avatarUrl?: string
  timezone?: string
  isActive: boolean
  mustChangePassword: boolean
  createdAt: string
  lastActiveAt?: string
}

export interface RegisterInput {
  firstName: string
  lastName: string
  email: string
  password: string
  brokerageName: string
  phone?: string
  role?: UserRole
}

export interface LoginInput {
  email: string
  password: string
  rememberMe?: boolean
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface AuthResultDto {
  user: UserResponseDto
  accessToken: string
  refreshToken: string
}
