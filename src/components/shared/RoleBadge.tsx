import { Badge } from '@/components/ui/badge'
import { UserRole } from '@/types/auth'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge variant="outline" className={ROLE_COLORS[role]}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}
