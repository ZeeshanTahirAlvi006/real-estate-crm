import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { useLogoutMutation } from '@/store/api/authApi'
import { baseApi } from '@/store/api/baseApi'
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/constants/roles'
import { UserRole } from '@/types/auth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logoutMutation] = useLogoutMutation()

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap()
    } catch {
      // client logout fallback
    }
    dispatch(logout())
    dispatch(baseApi.util.resetApiState())
    setMoreOpen(false)
    navigate('/login', { replace: true })
  }

  const rolePermissions = user?.role ? ROLE_PERMISSIONS[user.role] : undefined

  const secondaryNavItems = [
    { to: '/transactions', label: 'Transactions', icon: 'receipt_long', permission: 'managePipeline' },
    { to: '/commissions', label: 'Commissions', icon: 'payments', permission: 'managePipeline' },
    { to: '/smart-lists', label: 'Smart Lists', icon: 'filter_list', permission: 'manageSmartLists' },
    { to: '/lead-ingestion', label: 'Lead Ingestion', icon: 'sensors', permission: 'manageLeadIngestion' },
    { to: '/data-health', label: 'Data Health', icon: 'verified_user', permission: 'viewDataHealth' },
    { to: '/ai-isa', label: 'AI ISA Engine', icon: 'smart_toy', permission: 'managePipeline' },
    { to: '/settings', label: 'Settings', icon: 'settings', permission: 'manageSettings' },
  ].filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'PP'

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#273338] border-t border-[#D8E2D6] dark:border-[#618764]/40 h-16 px-3 flex items-center justify-around shadow-lg">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all',
              isActive
                ? 'text-[#2B5748] dark:text-[#9CB080] font-bold'
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn('p-1 rounded-full mb-0.5 transition-colors', isActive && 'bg-[#9CB080]/20')}>
                <MaterialIcon name="dashboard" size={20} />
              </div>
              <span>Dashboard</span>
            </>
          )}
        </NavLink>

        {user?.role !== UserRole.LEAD && (
          <NavLink
            to="/contacts"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all',
                isActive
                  ? 'text-[#2B5748] dark:text-[#9CB080] font-bold'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1 rounded-full mb-0.5 transition-colors', isActive && 'bg-[#9CB080]/20')}>
                  <MaterialIcon name="contacts" size={20} />
                </div>
                <span>Contacts</span>
              </>
            )}
          </NavLink>
        )}

        {user?.role !== UserRole.LEAD && (
          <NavLink
            to="/pipeline"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all',
                isActive
                  ? 'text-[#2B5748] dark:text-[#9CB080] font-bold'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1 rounded-full mb-0.5 transition-colors', isActive && 'bg-[#9CB080]/20')}>
                  <MaterialIcon name="view_kanban" size={20} />
                </div>
                <span>Pipeline</span>
              </>
            )}
          </NavLink>
        )}

        {rolePermissions?.viewInbox !== false && (
          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all',
                isActive
                  ? 'text-[#2B5748] dark:text-[#9CB080] font-bold'
                  : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn('p-1 rounded-full mb-0.5 transition-colors', isActive && 'bg-[#9CB080]/20')}>
                  <MaterialIcon name="chat" size={20} />
                </div>
                <span>Inbox</span>
              </>
            )}
          </NavLink>
        )}

        {/* More Drawer Trigger */}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer',
            moreOpen ? 'text-[#2B5748] dark:text-[#9CB080] font-bold' : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white'
          )}
        >
          <div className={cn('p-1 rounded-full mb-0.5 transition-colors', moreOpen && 'bg-[#9CB080]/20')}>
            <MaterialIcon name={moreOpen ? 'close' : 'menu'} size={20} />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "More" Slide-up Sheet Overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-[#273338]/60 backdrop-blur-sm transition-opacity"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="fixed bottom-16 left-0 right-0 max-h-[75vh] overflow-y-auto bg-white dark:bg-[#273338] rounded-t-3xl border-t border-[#D8E2D6] dark:border-[#618764]/40 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Profile Header in More sheet */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-[#273338] dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                    {user?.role ? ROLE_LABELS[user.role] : 'Agent'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] text-[#4A5D54] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white cursor-pointer"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>

            {/* Workspace info */}
            {user?.brokerageName && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764]/40 text-xs text-[#273338] dark:text-white font-medium">
                <MaterialIcon name="business" size={16} className="text-[#618764] dark:text-[#9CB080] shrink-0" />
                <span className="truncate">{user.brokerageName}</span>
              </div>
            )}

            {/* Secondary Links Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium transition-colors border',
                      isActive
                        ? 'bg-[#9CB080]/15 border-[#9CB080]/40 text-[#2B5748] dark:text-[#9CB080] font-bold'
                        : 'bg-[#EDF2EB] dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]/30 text-[#273338] dark:text-white hover:bg-[#D8E2D6]/40 dark:hover:bg-[#2B5748]'
                    )
                  }
                >
                  <MaterialIcon name={item.icon} size={18} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>

            <Separator className="my-2 bg-[#D8E2D6] dark:bg-[#618764]/40" />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 p-3 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors cursor-pointer"
            >
              <MaterialIcon name="logout" size={16} />
              <span>Log out of {user?.firstName}</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

