import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

interface SidebarNavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  collapsed: boolean
  badge?: string
  badgeVariant?: 'live' | 'upcoming' | 'maintenance'
}

export function SidebarNavItem({ to, icon, label, collapsed, badge, badgeVariant = 'upcoming' }: SidebarNavItemProps) {
  const linkContent = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary shadow-sm font-semibold'
            : 'text-sidebar-foreground/70',
          collapsed && 'justify-center px-2'
        )
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
      {!collapsed && (
        <div className="flex items-center justify-between flex-1 min-w-0">
          <span className="truncate">{label}</span>
          {badge && (
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] px-1.5 py-0 h-4 uppercase font-mono font-normal ml-1.5',
                badgeVariant === 'live'
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  : badgeVariant === 'maintenance'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold animate-pulse'
                    : 'bg-muted/60 text-muted-foreground/80 border-border/40'
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
          {badge && <span className="text-[10px] text-muted-foreground">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
