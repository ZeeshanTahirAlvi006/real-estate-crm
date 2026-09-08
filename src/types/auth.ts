export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  BROKERAGE_OWNER: 'brokerage_owner',
  TEAM_LEAD: 'team_lead',
  AGENT: 'agent',
  LEAD: 'lead',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isInitialized: boolean
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginResponse {
  user: User
  token: string
}

export interface SignupRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  brokerageName?: string
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  role: UserRole
  brokerageId?: string
  brokerageName?: string
  timezone?: string
  isActive: boolean
  mustChangePassword?: boolean
  createdAt: string
  lastActiveAt?: string
}
