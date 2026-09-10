import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  SunIcon,
  MoonIcon,
  ArrowRightStartOnRectangleIcon,
  SparklesIcon,
  Cog6ToothIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { useLogoutMutation } from '@/store/api/authApi'
import { baseApi } from '@/store/api/baseApi'
import { ROLE_LABELS, ROLE_COLORS } from '@/constants/roles'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function PortalLayout() {
  const { resolvedTheme, setTheme } = useTheme()
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [logoutMutation] = useLogoutMutation()

  const toggleTheme = (e: React.MouseEvent) => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark', e)
  }

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap()
    } catch {
      // Clean up client state regardless of server status
    }
    dispatch(logout())
    dispatch(baseApi.util.resetApiState())
    navigate('/login', { replace: true })
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'CL'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Client Portal Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground tracking-tight">
                  {user?.brokerageName || 'PropPulse OS'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Client Portal
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Real Estate Client Experience
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden sm:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/80 text-xs">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <HomeIcon className="w-3.5 h-3.5" />
              <span>My Journey</span>
            </NavLink>
            <NavLink
              to="/portal/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all',
                  isActive
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Cog6ToothIcon className="w-3.5 h-3.5" />
              <span>Settings</span>
            </NavLink>
          </nav>
        </div>

        {/* User profile and Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/portal/settings')}
            className={cn(
              'h-9 w-9 text-muted-foreground hover:text-foreground sm:hidden',
              location.pathname === '/portal/settings' && 'text-primary bg-primary/10'
            )}
            title="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Toggle Theme"
          >
            {resolvedTheme === 'dark' ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>

          {user && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-border">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {user.firstName} {user.lastName}
                </p>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${ROLE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* Portal Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 px-6 text-center text-xs text-muted-foreground">
        <p>
          Protected by {user?.brokerageName || 'PropPulse OS'} Client Security. Need help? Contact your assigned real estate advisor.
        </p>
      </footer>
    </div>
  )
}
