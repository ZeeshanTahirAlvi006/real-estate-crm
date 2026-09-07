import { NavLink } from 'react-router-dom'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { useAppSelector } from '@/store/hooks'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import { UserRole } from '@/types/auth'
import { cn } from '@/lib/utils'

interface TabNavItem {
  to: string
  label: string
  icon: string
  permission?: string
}

const navItems: TabNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', permission: 'viewDashboard' },
  { to: '/contacts', label: 'Contacts', icon: 'contacts', permission: 'manageContacts' },
  { to: '/pipeline', label: 'Pipeline', icon: 'view_kanban', permission: 'managePipeline' },
  { to: '/transactions', label: 'Transactions', icon: 'receipt_long', permission: 'managePipeline' },
  { to: '/commissions', label: 'Commissions', icon: 'payments', permission: 'managePipeline' },
  { to: '/inbox', label: 'Inbox', icon: 'chat', permission: 'manageContacts' },
  { to: '/smart-lists', label: 'Smart Lists', icon: 'filter_list', permission: 'manageSmartLists' },
  { to: '/lead-ingestion', label: 'Ingestion', icon: 'sensors', permission: 'manageLeadIngestion' },
  { to: '/data-health', label: 'Data Health', icon: 'verified_user', permission: 'viewDataHealth' },
  { to: '/ai-isa', label: 'AI ISA', icon: 'smart_toy', permission: 'managePipeline' },
  { to: '/settings', label: 'Settings', icon: 'settings', permission: 'manageSettings' },
]

export function TabletTopNav() {
  const user = useAppSelector((state) => state.auth.user)

  // If client lead, render simplified lead portal links
  if (user?.role === UserRole.LEAD) {
    return (
      <nav className="hidden md:flex lg:hidden sticky top-16 z-20 w-full bg-white dark:bg-[#273338] border-b border-[#D8E2D6] dark:border-[#618764]/40 px-4 py-2 gap-2 overflow-x-auto no-scrollbar">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/50'
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white border border-transparent'
            )
          }
        >
          <MaterialIcon name="dashboard" size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/50'
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white border border-transparent'
            )
          }
        >
          <MaterialIcon name="chat" size={16} />
          <span>Advisor Chat</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/50'
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white border border-transparent'
            )
          }
        >
          <MaterialIcon name="settings" size={16} />
          <span>Settings</span>
        </NavLink>
      </nav>
    )
  }

  const rolePermissions = user?.role ? ROLE_PERMISSIONS[user.role] : undefined
  const filteredItems = navItems.filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  return (
    <nav className="hidden md:flex lg:hidden sticky top-16 z-20 w-full bg-white dark:bg-[#273338] border-b border-[#D8E2D6] dark:border-[#618764]/40 px-4 py-2 gap-1.5 overflow-x-auto no-scrollbar">
      {filteredItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
              isActive
                ? 'bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] font-bold border border-[#9CB080]/50'
                : 'text-[#4A5D54] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white border border-transparent'
            )
          }
        >
          <MaterialIcon name={item.icon} size={16} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

