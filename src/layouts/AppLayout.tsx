import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/topbar/TopBar'
import { TabletTopNav } from '@/components/navigation/TabletTopNav'
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav'
import { HelpGuideFloatingButton } from '@/components/help/HelpGuideFloatingButton'
import { FeatureMaintenanceOverlay } from '@/components/shared/FeatureMaintenanceOverlay'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarDrawerOpen = useAppSelector((state) => state.ui.sidebarDrawerOpen)
  const user = useAppSelector((state) => state.auth.user)

  // Redirect leads directly to client portal
  if (user?.role === 'lead') {
    return <Navigate to="/portal" replace />
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F5F7F4] dark:bg-[#1E282D] transition-colors duration-200">
      {/* Desktop / Large Screen Drawer Navigation */}
      <Sidebar />

      {/* Main Workspace Canvas */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden w-full transition-all duration-300',
          sidebarDrawerOpen && 'lg:blur-[2px]'
        )}
      >
        {/* Top Header */}
        <TopBar />

        {/* Tablet Navigation Bar (Visible only on md, hidden on sm & lg) */}
        <TabletTopNav />

        {/* Scrollable Main Viewport with mobile bottom navigation offset */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6 relative w-full max-w-full">
          <Outlet />
          <FeatureMaintenanceOverlay />
        </main>
      </div>

      {/* Mobile Bottom Navigation (Visible only on mobile < md) */}
      <MobileBottomNav />

      {/* Context-Aware Floating Help & Feature Guide */}
      <HelpGuideFloatingButton />
    </div>
  )
}
