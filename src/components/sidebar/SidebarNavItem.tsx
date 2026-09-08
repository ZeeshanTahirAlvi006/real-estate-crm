import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface SidebarNavItemProps {
  to: string
  icon: React.ReactNode | string
  label: string
  collapsed?: boolean
  badge?: string
  badgeVariant?: 'live' | 'upcoming' | 'maintenance'
  onClick?: () => void
}

export function SidebarNavItem({
  to,
  icon,
  label,
  collapsed = false,
  badge,
  badgeVariant = 'upcoming',
  onClick,
}: SidebarNavItemProps) {
  const location = useLocation()

  const isCurrentActive = (navActive: boolean) => {
    if (to.includes('?')) {
      const currentFull = `${location.pathname}${location.search}`
      if (currentFull === to) return true
      if (location.pathname === '/inbox' && !location.search && to === '/inbox?channel=all') {
        return true
      }
      return false
    }
    return navActive
  }

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return <MaterialIcon name={icon} size={20} />
    }
    return icon
  }

  const linkContent = (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => {
        const active = isCurrentActive(isActive)
        return cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group',
          active
            ? 'bg-[#9CB080]/15 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/40'
            : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white',
          collapsed && 'justify-center px-2'
        )
      }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{renderIcon()}</span>
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="truncate">{label}</span>
          {badge && badge.toLowerCase() !== 'live' && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] px-1.5 py-0 h-4 uppercase font-mono font-medium ml-1.5',
                badgeVariant === 'maintenance'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-[#EDF2EB] dark:bg-[#202B2F] text-[#4A5D54] dark:text-[#A0B2A6] border-[#D8E2D6] dark:border-[#618764]'
              )}
            >
              {badge}
            </Badge>
          )}
        </div>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="flex items-center gap-1.5">
          <span>{label}</span>
          {badge && badge.toLowerCase() !== 'live' && (
            <span className="text-[10px] text-muted-foreground">({badge})</span>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

