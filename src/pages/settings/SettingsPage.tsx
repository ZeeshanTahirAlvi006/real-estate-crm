import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProfileTab } from './components/ProfileTab'
import { TeamManagementTab } from './components/TeamManagementTab'
import { AuditLogsTab } from './components/AuditLogsTab'
import { FeatureFlagsTab } from './components/FeatureFlagsTab'
import { BrokeragesTab } from './components/BrokeragesTab'
import { SecurityTab } from './components/SecurityTab'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'

export function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user)

  const isClient = user?.role === UserRole.LEAD
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN
  const isBrokerageOwner = user?.role === UserRole.BROKERAGE_OWNER

  const canManageTeam = (isSuperAdmin || isBrokerageOwner) && !isClient

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={isClient ? 'Account & Preferences' : 'Settings & Platform Governance'}
        description={
          isClient
            ? 'Manage your personal profile, contact information, and security credentials'
            : 'Manage your profile, team seats, multi-tenant brokerages, feature kill-switches, and security audit trails'
        }
      />
      <Tabs defaultValue="profile">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/60 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="rounded-xl text-xs font-semibold">
            {isClient ? 'My Profile' : 'Profile'}
          </TabsTrigger>

          {!isClient && canManageTeam && (
            <TabsTrigger value="team" className="rounded-xl text-xs font-semibold">
              Team Management
            </TabsTrigger>
          )}

          {!isClient && (isSuperAdmin || isBrokerageOwner) && (
            <TabsTrigger value="audit" className="rounded-xl text-xs font-semibold">
              Security & Audit Logs
            </TabsTrigger>
          )}

          {!isClient && isSuperAdmin && (
            <TabsTrigger value="feature-flags" className="rounded-xl text-xs font-semibold">
              Feature Kill-Switches
            </TabsTrigger>
          )}

          {!isClient && isSuperAdmin && (
            <TabsTrigger value="brokerages" className="rounded-xl text-xs font-semibold">
              Tenant Brokerages
            </TabsTrigger>
          )}

          <TabsTrigger value="security" className="rounded-xl text-xs font-semibold">
            Change Password
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

        {(isSuperAdmin || isBrokerageOwner) && (
          <TabsContent value="audit" className="mt-4">
            <AuditLogsTab />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="feature-flags" className="mt-4">
            <FeatureFlagsTab />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="brokerages" className="mt-4">
            <BrokeragesTab />
          </TabsContent>
        )}

        <TabsContent value="security" className="mt-4">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
