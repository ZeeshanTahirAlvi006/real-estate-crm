import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/topbar/TopBar'
import { HelpGuideFloatingButton } from '@/components/help/HelpGuideFloatingButton'
import { FeatureMaintenanceOverlay } from '@/components/shared/FeatureMaintenanceOverlay'
import { useAppSelector } from '@/store/hooks'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const user = useAppSelector((state) => state.auth.user)

  // Redirect leads directly to client portal
  if (user?.role === 'lead') {
    return <Navigate to="/portal" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all duration-300',
          sidebarCollapsed ? 'ml-17' : 'ml-65'
        )}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
          <FeatureMaintenanceOverlay />
        </main>
      </div>

      {/* Context-Aware Floating Help & Feature Guide */}
      <HelpGuideFloatingButton />
    </div>
  )
}
