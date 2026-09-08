import { useState, useMemo } from 'react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ResponsivePageNav, type NavTabItem } from '@/components/navigation/ResponsivePageNav'
import { ProfileTab } from './components/ProfileTab'
import { TeamManagementTab } from './components/TeamManagementTab'
import { AuditLogsTab } from './components/AuditLogsTab'
import { FeatureFlagsTab } from './components/FeatureFlagsTab'
import { BrokeragesTab } from './components/BrokeragesTab'
import { SecurityTab } from './components/SecurityTab'
import { ComplianceTab } from './components/ComplianceTab'
import { ObjectionPlaybookTab } from './components/ObjectionPlaybookTab'
import { WhatsAppIntegrationSettings } from '../ai-isa/components/WhatsAppIntegrationSettings'
import { useAppSelector } from '@/store/hooks'
import { UserRole } from '@/types/auth'

export function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user)

  const isClient = user?.role === UserRole.LEAD
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN
  const isBrokerageOwner = user?.role === UserRole.BROKERAGE_OWNER

  const canManageTeam = (isSuperAdmin || isBrokerageOwner) && !isClient

  const tabs: NavTabItem[] = useMemo(() => {
    const list: NavTabItem[] = [
      { id: 'profile', label: isClient ? 'My Profile' : 'Profile', icon: 'person' },
    ]

    if (!isClient && canManageTeam) {
      list.push({ id: 'team', label: 'Team Management', icon: 'groups' })
      list.push({ id: 'whatsapp', label: 'WhatsApp API', icon: 'chat' })
    }

    if (!isClient && (isSuperAdmin || isBrokerageOwner)) {
      list.push({ id: 'audit', label: 'Audit Logs', icon: 'history' })
    }

    if (!isClient && isSuperAdmin) {
      list.push({ id: 'feature-flags', label: 'Feature Flags', icon: 'toggle_on' })
      list.push({ id: 'brokerages', label: 'Tenant Brokerages', icon: 'domain' })
    }

    if (!isClient) {
      list.push({ id: 'compliance', label: 'TCPA Compliance', icon: 'verified_user' })
      list.push({ id: 'playbook', label: 'Objection Playbook', icon: 'menu_book' })
    }

    list.push({ id: 'security', label: 'Password Security', icon: 'lock' })

    return list
  }, [isClient, canManageTeam, isSuperAdmin, isBrokerageOwner])

  const [activeTab, setActiveTab] = useState<string>('profile')

  return (
    <div className="space-y-6 pb-12">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Unified Responsive Navigation: identical sliding pill for mobile & tablet (< lg), horizontal track on desktop (lg+) */}
        <ResponsivePageNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sticky
        />

        {/* Page Title & Concise Subtitle (2-3 words naming) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#273338] dark:text-white">
              System Settings
            </h1>
            <p className="text-xs sm:text-sm text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
              {isClient ? 'Account and preferences' : 'Platform governance and team settings'}
            </p>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="max-w-7xl mx-auto">
          <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
            <ProfileTab />
          </TabsContent>

          {canManageTeam && (
            <TabsContent value="team" className="mt-0 focus-visible:outline-none">
              <TeamManagementTab />
            </TabsContent>
          )}

          {canManageTeam && (
            <TabsContent value="whatsapp" className="mt-0 focus-visible:outline-none">
              <WhatsAppIntegrationSettings />
            </TabsContent>
          )}

          {(isSuperAdmin || isBrokerageOwner) && (
            <TabsContent value="audit" className="mt-0 focus-visible:outline-none">
              <AuditLogsTab />
            </TabsContent>
          )}

          {!isClient && (
            <TabsContent value="compliance" className="mt-0 focus-visible:outline-none">
              <ComplianceTab />
            </TabsContent>
          )}

          {!isClient && (
            <TabsContent value="playbook" className="mt-0 focus-visible:outline-none">
              <ObjectionPlaybookTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="feature-flags" className="mt-0 focus-visible:outline-none">
              <FeatureFlagsTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="brokerages" className="mt-0 focus-visible:outline-none">
              <BrokeragesTab />
            </TabsContent>
          )}

          <TabsContent value="security" className="mt-0 focus-visible:outline-none">
            <SecurityTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
