import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProfileTab } from './components/ProfileTab'
import { TeamManagementTab } from './components/TeamManagementTab'
import { IntegrationsTab } from './components/IntegrationsTab'
import { NotificationsTab } from './components/NotificationsTab'
import { SecurityTab } from './components/SecurityTab'
import { GlobalMarketTab } from './components/GlobalMarketTab'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'

export function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user)
  const canManageTeam =
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.BROKERAGE_OWNER ||
    user?.role === UserRole.TEAM_LEAD

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Settings & Global Configuration"
        description="Manage user profiles, team members, MLS/Non-MLS standards, and security controls"
      />
      <Tabs defaultValue="profile">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/60 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="rounded-xl text-xs font-semibold">
            Profile
          </TabsTrigger>
          {canManageTeam && (
            <TabsTrigger value="team" className="rounded-xl text-xs font-semibold">
              Team Management
            </TabsTrigger>
          )}
          <TabsTrigger value="global" className="rounded-xl text-xs font-semibold">
            Global & Regional Market
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-xl text-xs font-semibold">
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl text-xs font-semibold">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold">
            Security & Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab />
        </TabsContent>
        {canManageTeam && (
          <TabsContent value="team" className="mt-4">
            <TeamManagementTab />
          </TabsContent>
        )}
        <TabsContent value="global" className="mt-4">
          <GlobalMarketTab />
        </TabsContent>
        <TabsContent value="integrations" className="mt-4">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
