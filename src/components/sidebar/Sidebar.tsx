import {
  HomeIcon,
  UserGroupIcon,
  RectangleStackIcon,
  FunnelIcon,
  SignalIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,

  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { toggleSidebar } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'
import { useGetFeatureFlagsQuery } from '@/store/api/featureFlagsApi'
import { useNavigate } from 'react-router-dom'
import { SidebarNavItem } from './SidebarNavItem'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_LABELS } from '@/constants/roles'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItemDef {
  to: string
  icon: React.ReactNode
  label: string
  badge?: string
  badgeVariant?: 'live' | 'upcoming' | 'maintenance'
  featureKey?: string
}

const mainNavItems: NavItemDef[] = [
  { to: '/dashboard', icon: <HomeIcon className="h-5 w-5" />, label: 'Dashboard', badge: 'Live', badgeVariant: 'live' },
  { to: '/contacts', icon: <UserGroupIcon className="h-5 w-5" />, label: 'Contacts', badge: 'Live', badgeVariant: 'live' },
  { to: '/pipeline', icon: <RectangleStackIcon className="h-5 w-5" />, label: 'Pipeline', badge: 'Live', badgeVariant: 'live', featureKey: 'deals_pipeline' },
  { to: '/dialer', icon: <PhoneIcon className="h-5 w-5" />, label: 'Parallel Dialer', badge: 'Live', badgeVariant: 'live', featureKey: 'dialer' },
  { to: '/inbox', icon: <ChatBubbleLeftRightIcon className="h-5 w-5" />, label: 'Inbox', badge: 'Sprint 12', featureKey: 'ai_chatbot' },
  { to: '/smart-lists', icon: <FunnelIcon className="h-5 w-5" />, label: 'Smart Lists', badge: 'Sprint 10' },
]

const aiNavItems: NavItemDef[] = [
  { to: '/lead-ingestion', icon: <SignalIcon className="h-5 w-5" />, label: 'Lead Ingestion', badge: 'Live', badgeVariant: 'live', featureKey: 'lead_ingestion' },
  { to: '/data-health', icon: <ShieldCheckIcon className="h-5 w-5" />, label: 'Data Health', badge: 'Live', badgeVariant: 'live', featureKey: 'data_health' },
  { to: '/ai-isa', icon: <SparklesIcon className="h-5 w-5" />, label: 'AI ISA Engine', badge: 'Live', badgeVariant: 'live', featureKey: 'ai_isa' },
]

const configNavItems: NavItemDef[] = [
  { to: '/settings', icon: <Cog6ToothIcon className="h-5 w-5" />, label: 'Settings', badge: 'Live', badgeVariant: 'live' },
]

export function Sidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const user = useAppSelector((state) => state.auth.user)

  // Real-time feature flags status for dynamic maintenance badges
  const { data: flags } = useGetFeatureFlagsQuery(undefined, {
    pollingInterval: 8000,
  })

  const resolveNavItem = (item: NavItemDef) => {
    if (item.featureKey && flags) {
      const flag = flags.find((f) => f.key === item.featureKey)
      if (flag && !flag.isEnabled) {
        return {
          ...item,
          badge: 'Maint',
          badgeVariant: 'maintenance' as const,
        }
      }
    }
    return item
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'PP'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-17' : 'w-65'
      )}
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <span className="text-xl font-bold bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">P</span>
        ) : (
          <h1 className="text-lg font-bold tracking-tight">
            <span className="bg-linear-to-r from-primary via-chart-3 to-chart-2 bg-clip-text text-transparent">
              PropPulse
            </span>
            <span className="ml-1 text-muted-foreground font-light text-sm">OS</span>
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Main
          </p>
        )}
        {mainNavItems.map((item) => (
          <SidebarNavItem key={item.to} {...resolveNavItem(item)} collapsed={collapsed} />
        ))}

        <Separator className="my-4" />

        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Intelligence & Data
          </p>
        )}
        {aiNavItems.map((item) => (
          <SidebarNavItem key={item.to} {...resolveNavItem(item)} collapsed={collapsed} />
        ))}

        <Separator className="my-4" />

        {!collapsed && (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Configuration
          </p>
        )}
        {configNavItems.map((item) => (
          <SidebarNavItem key={item.to} {...resolveNavItem(item)} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom section: user + collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        {/* User info */}
        <div className={cn('mb-3 flex items-center gap-3 rounded-lg px-2 py-2', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && user && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>Logout</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
            <span>Logout</span>
          </button>
        )}

        <Separator className="my-3" />

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={cn(
            'flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            !collapsed && 'justify-end pr-3'
          )}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
