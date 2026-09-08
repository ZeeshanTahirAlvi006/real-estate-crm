export interface FeatureFlagResponseDto {
  id: string
  key: string
  name: string
  isEnabled: boolean
  description?: string
  disabledReason?: string
  updatedAt: string
}

export interface ToggleFeatureFlagInput {
  isEnabled: boolean
  disabledReason?: string
}
