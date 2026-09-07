import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from '@/components/ui/button'
import { useGetNotificationsQuery } from '@/store/api/settingsApi'
import { NotificationDropdown } from './NotificationDropdown'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { toggleSidebarDrawer } from '@/store/slices/uiSlice'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import { cn } from '@/lib/utils'

interface NavTab {
  to: string
  label: string
  icon: string
  permission?: string
}

const navTabs: NavTab[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', permission: 'viewDashboard' },
  { to: '/contacts', label: 'Contacts', icon: 'contacts', permission: 'manageContacts' },
  { to: '/pipeline', label: 'Pipeline', icon: 'view_kanban', permission: 'managePipeline' },
  { to: '/transactions', label: 'Transactions', icon: 'receipt_long', permission: 'managePipeline' },
  { to: '/commissions', label: 'Commissions', icon: 'payments', permission: 'managePipeline' },
  { to: '/inbox/?channel=all', label: 'Inbox', icon: 'chat', permission: 'manageContacts' },
  { to: '/smart-lists', label: 'Smart Lists', icon: 'filter_list', permission: 'manageSmartLists' },
  { to: '/ai-isa', label: 'AI ISA', icon: 'smart_toy', permission: 'managePipeline' },
]

export function TopBar() {
  const { resolvedTheme, setTheme } = useTheme()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const sidebarDrawerOpen = useAppSelector((state) => state.ui.sidebarDrawerOpen)
  const { data: notifications } = useGetNotificationsQuery()
  const [showNotifications, setShowNotifications] = useState(false)

  const notifList = Array.isArray(notifications) ? notifications : []
  const unreadCount = notifList.filter((n) => !n.isRead).length

  const toggleTheme = (e: React.MouseEvent) => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark', e)
  }

  const rolePermissions = user?.role ? ROLE_PERMISSIONS[user.role] : undefined
  const filteredTabs = navTabs.filter((tab) => {
    if (!rolePermissions || !tab.permission) return true
    return rolePermissions[tab.permission] !== false
  })

  const isTabActive = (to: string) => {
    if (to === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(to)
  }

  const userInitials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'PP'

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#273338] px-3 sm:px-5 transition-colors duration-200">
      {/* Left: Brand name (pure typography, no logo mark) & Workspace */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Drawer Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch(toggleSidebarDrawer())}
          className={cn(
            'h-9 w-9 rounded-lg transition-colors cursor-pointer',
            sidebarDrawerOpen
              ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080]'
              : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F]'
          )}
          title={sidebarDrawerOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
        >
          <MaterialIcon name="menu" size={20} />
          <span className="sr-only">Toggle Navigation</span>
        </Button>

        {/* Typographic Brand Name */}
        <NavLink to="/dashboard" className="flex items-baseline gap-1 group cursor-pointer">
          <span className="text-xl font-extrabold tracking-tight text-[#273338] dark:text-white group-hover:text-[#2B5748] dark:group-hover:text-[#9CB080] transition-colors">
            PropPulse OS
          </span>

        </NavLink>

        {/* Workspace Pill */}
        {user?.brokerageName && (
          <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#202B2F] text-[#273338] dark:text-white text-xs font-semibold">
            <MaterialIcon name="business" size={15} className="text-[#618764] dark:text-[#9CB080] shrink-0" />
            <span className="truncate max-w-37.5">{user.brokerageName}</span>
          </div>
        )}
      </div>

      {/* Center: ReHorizontal Navigation Bar (Desktop) */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto no-scrollbar mx-2">
        {filteredTabs.map((tab) => {
          const active = isTabActive(tab.to)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer',
                active
                  ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/50'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white border border-transparent'
              )}
            >
              <MaterialIcon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Right: Actions, Theme Toggle, Notifications & Profile Capsule */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] rounded-lg transition-transform active:scale-95 cursor-pointer"
          title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <MaterialIcon
            name={resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            size={18}
            className={resolvedTheme === 'dark' ? 'text-amber-400' : 'text-[#4A5D54]'}
          />
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="h-9 w-9 text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] rounded-lg relative cursor-pointer"
            title="Notifications"
          >
            <MaterialIcon name="notifications" size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </Button>
          {showNotifications && (
            <NotificationDropdown
              notifications={notifList}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        {/* User Profile Capsule  */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-[#D8E2D6] dark:border-[#618764]/40 ml-1">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB] dark:bg-[#202B2F]">
              <div className="h-6 w-6 rounded-full text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center text-[11px] font-bold">
                {userInitials}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-[#273338] dark:text-white truncate max-w-25">
                {user.firstName}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}


