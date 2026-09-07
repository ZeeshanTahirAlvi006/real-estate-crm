import { useEffect } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setSidebarDrawerOpen } from '@/store/slices/uiSlice'
import { logout } from '@/store/slices/authSlice'
import { useLogoutMutation } from '@/store/api/authApi'
import { useGetFeatureFlagsQuery } from '@/store/api/featureFlagsApi'
import { baseApi } from '@/store/api/baseApi'
import { useNavigate } from 'react-router-dom'
import { SidebarNavItem } from './SidebarNavItem'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/constants/roles'
import { UserRole } from '@/types/auth'

interface NavItemDef {
  to: string
  icon: string
  label: string
  badge?: string
  badgeVariant?: 'upcoming' | 'maintenance'
  featureKey?: string
  permission?: string
}

const mainNavItems: NavItemDef[] = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', permission: 'viewDashboard' },
  { to: '/contacts', icon: 'contacts', label: 'Contacts', permission: 'manageContacts' },
  { to: '/pipeline', icon: 'view_kanban', label: 'Pipeline', featureKey: 'deals_pipeline', permission: 'managePipeline' },
  { to: '/transactions', icon: 'receipt_long', label: 'Transactions', permission: 'managePipeline' },
  { to: '/commissions', icon: 'payments', label: 'Commissions', permission: 'managePipeline' },
  { to: '/inbox?channel=all', icon: 'forum', label: 'Unified Inbox', featureKey: 'ai_chatbot', permission: 'manageContacts' },
  { to: '/inbox?channel=whatsapp', icon: 'chat', label: 'WhatsApp Inbox', featureKey: 'ai_chatbot', permission: 'manageContacts' },
  { to: '/inbox?channel=email', icon: 'mail', label: 'Email Inbox', featureKey: 'ai_chatbot', permission: 'manageContacts' },
  { to: '/smart-lists', icon: 'filter_list', label: 'Smart Lists', permission: 'manageSmartLists' },
]

const aiNavItems: NavItemDef[] = [
  { to: '/lead-ingestion', icon: 'sensors', label: 'Lead Ingestion', featureKey: 'lead_ingestion', permission: 'manageLeadIngestion' },
  { to: '/data-health', icon: 'verified_user', label: 'Data Health', featureKey: 'data_health', permission: 'viewDataHealth' },
  { to: '/ai-isa', icon: 'smart_toy', label: 'AI ISA Engine', featureKey: 'ai_isa', permission: 'managePipeline' },
]

const configNavItems: NavItemDef[] = [
  { to: '/settings', icon: 'settings', label: 'Settings', permission: 'manageSettings' },
]

export function Sidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const drawerOpen = useAppSelector((state) => state.ui.sidebarDrawerOpen)
  const user = useAppSelector((state) => state.auth.user)

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) {
        dispatch(setSidebarDrawerOpen(false))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen, dispatch])

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

  const [logoutMutation] = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap()
    } catch {
      // Even if server logout fails, clear client state
    }
    dispatch(logout())
    dispatch(baseApi.util.resetApiState())
    dispatch(setSidebarDrawerOpen(false))
    navigate('/login')
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`
    : 'PP'

  // Filter navigation items by role permissions
  const rolePermissions = user?.role ? ROLE_PERMISSIONS[user.role] : undefined

  const filteredMain = mainNavItems.filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  const filteredAi = aiNavItems.filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  const filteredConfig = configNavItems.filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  const closeDrawer = () => {
    dispatch(setSidebarDrawerOpen(false))
  }

  return (
    <>
      {/* Backdrop blur overlay for content when drawer is open */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[#273338]/60 backdrop-blur-sm transition-all duration-300',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Floating Drawer Sidebar Navigation with Rounded Edges */}
      <aside
        className={cn(
          'fixed left-4 top-4 bottom-4 z-50 flex w-72 flex-col rounded-2xl border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#273338] shadow-2xl transition-all duration-300 ease-in-out',
          drawerOpen
            ? 'translate-x-0 opacity-100'
            : '-translate-x-[calc(100%+24px)] opacity-0 pointer-events-none'
        )}
      >
        {/* Drawer Header with Plain Brand Name (No Logo Icon, No Gradients) */}
        <div className="flex h-16 items-center justify-between border-b border-[#D8E2D6] dark:border-[#618764]/40 px-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-[#273338] dark:text-white">
              PropPulse OS
            </h1>
          </div>

          <button
            type="button"
            onClick={closeDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>

        {/* Workspace banner in drawer */}
        {user?.brokerageName && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-[#EDF2EB] dark:bg-[#2B5748] px-3 py-2 text-xs text-[#273338] dark:text-white border border-[#D8E2D6] dark:border-[#618764]/50 font-medium">
            <MaterialIcon name="business" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0" />
            <span className="truncate">{user.brokerageName}</span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {user?.role === UserRole.LEAD ? (
            <div className="space-y-1">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                Client Portal
              </p>
              <SidebarNavItem
                to="/dashboard"
                icon="dashboard"
                label="Dashboard"
                onClick={closeDrawer}
              />
              <SidebarNavItem
                to="/inbox"
                icon="chat"
                label="Advisor Chat"
                onClick={closeDrawer}
              />

              <Separator className="my-4 bg-[#D8E2D6] dark:bg-[#618764]/40" />
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                Account
              </p>
              <SidebarNavItem
                to="/settings"
                icon="settings"
                label="Settings"
                onClick={closeDrawer}
              />
            </div>
          ) : (
            <>
              {filteredMain.length > 0 && (
                <>
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                    Main Modules
                  </p>
                  {filteredMain.map((item) => (
                    <SidebarNavItem
                      key={item.to}
                      {...resolveNavItem(item)}
                      onClick={closeDrawer}
                    />
                  ))}
                </>
              )}

              {filteredAi.length > 0 && (
                <>
                  <Separator className="my-4 bg-[#D8E2D6] dark:bg-[#618764]/40" />
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                    Intelligence & Data
                  </p>
                  {filteredAi.map((item) => (
                    <SidebarNavItem
                      key={item.to}
                      {...resolveNavItem(item)}
                      onClick={closeDrawer}
                    />
                  ))}
                </>
              )}

              {filteredConfig.length > 0 && (
                <>
                  <Separator className="my-4 bg-[#D8E2D6] dark:bg-[#618764]/40" />
                  <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6]">
                    Configuration
                  </p>
                  {filteredConfig.map((item) => (
                    <SidebarNavItem
                      key={item.to}
                      {...resolveNavItem(item)}
                      onClick={closeDrawer}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        {/* Bottom User Profile & Logout */}
        <div className="border-t border-[#D8E2D6] dark:border-[#618764]/40 p-3 space-y-2">
          <div className="flex items-center gap-3 rounded-xl px-2.5 py-2 bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/30">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {user && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#273338] dark:text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-[#75887E] dark:text-[#A0B2A6]">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <MaterialIcon name="logout" size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}


