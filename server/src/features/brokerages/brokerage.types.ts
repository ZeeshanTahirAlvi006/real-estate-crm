export interface BrokerageResponseDto {
  id: string
  name: string
  subdomain?: string
  plan: 'growth' | 'pro' | 'enterprise'
  logoUrl?: string
  timezone: string
  isActive: boolean
  memberCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateBrokerageInput {
  name: string
  subdomain?: string
  plan?: 'growth' | 'pro' | 'enterprise'
  timezone?: string
}

export interface UpdateBrokerageInput {
  name?: string
  subdomain?: string
  plan?: 'growth' | 'pro' | 'enterprise'
  logoUrl?: string
  timezone?: string
}
