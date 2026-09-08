import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { ROLE_PERMISSIONS } from '@/constants/roles'
import { UserRole } from '@/types/auth'
import { MobileTabletNavPill, type NavTabItem } from '@/components/navigation/ResponsivePageNav'

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
  { to: '/inbox', label: 'Inbox', icon: 'chat', permission: 'viewInbox' },
  { to: '/smart-lists', label: 'Smart Lists', icon: 'filter_list', permission: 'manageSmartLists' },
  { to: '/lead-ingestion', label: 'Ingestion', icon: 'sensors', permission: 'manageLeadIngestion' },
  { to: '/data-health', label: 'Data Health', icon: 'verified_user', permission: 'viewDataHealth' },
  { to: '/ai-isa', label: 'AI ISA', icon: 'smart_toy', permission: 'managePipeline' },
  { to: '/settings', label: 'Settings', icon: 'settings', permission: 'manageSettings' },
]

export function TabletTopNav() {
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()
  const navigate = useNavigate()

  const rolePermissions = user?.role ? ROLE_PERMISSIONS[user.role] : undefined
  const filteredItems = navItems.filter((item) => {
    if (!rolePermissions || !item.permission) return true
    return rolePermissions[item.permission] !== false
  })

  const isLead = user?.role === UserRole.LEAD
  const displayItems = isLead
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { to: '/inbox', label: 'Advisor Chat', icon: 'chat' },
        { to: '/settings', label: 'Settings', icon: 'settings' },
      ]
    : filteredItems

  const tabs: NavTabItem[] = displayItems.map((item) => ({
    id: item.to,
    label: item.label,
    icon: item.icon,
  }))

  const activeTab =
    displayItems.find((item) =>
      item.to === '/dashboard'
        ? location.pathname === '/' || location.pathname === '/dashboard'
        : location.pathname.startsWith(item.to)
    )?.to || (tabs[0]?.id ?? '/dashboard')

  return (
    <nav
      aria-label="Tablet navigation"
      className="hidden md:flex lg:hidden sticky top-16 z-20 w-full bg-[#F5F7F4]/95 dark:bg-[#1E282D]/95 backdrop-blur-md border-b border-[#D8E2D6] dark:border-[#618764]/40 shadow-xs px-3 sm:px-4 py-2"
    >
      <MobileTabletNavPill
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(to) => navigate(to)}
        variant="sage"
      />
    </nav>
  )
}
