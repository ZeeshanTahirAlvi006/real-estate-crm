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
import { useParallax } from '@/hooks/useParallax'

export function SettingsPage() {
  const user = useAppSelector((state) => state.auth.user)
  const headerOffset = useParallax(0.2)
  const bgOffset = useParallax(0.1)

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
    <div 
      className="space-y-6 pb-12 relative overflow-hidden min-h-screen"
    >
      <div 
        className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] transition-transform duration-75"
        style={{ transform: `translateY(${bgOffset}px)` }}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 relative z-10">
        {/* Unified Responsive Navigation: identical sliding pill for mobile & tablet (< lg), horizontal track on desktop (lg+) */}
        <ResponsivePageNav
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          sticky
        />

        {/* Page Title & Concise Subtitle (2-3 words naming) */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 w-full max-w-none px-3 sm:px-6 lg:px-8 transition-transform duration-75"
          style={{ transform: `translateY(${headerOffset}px)` }}
        >
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-[#273338] dark:text-white drop-shadow-sm">
              System Settings
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5 font-medium">
              {isClient ? 'Account and preferences' : 'Platform governance and team settings'}
            </p>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="w-full max-w-none px-3 sm:px-6 lg:px-8">
          <TabsContent value="profile" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <ProfileTab />
          </TabsContent>

          {canManageTeam && (
            <TabsContent value="team" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <TeamManagementTab />
            </TabsContent>
          )}

          {canManageTeam && (
            <TabsContent value="whatsapp" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <WhatsAppIntegrationSettings />
            </TabsContent>
          )}

          {(isSuperAdmin || isBrokerageOwner) && (
            <TabsContent value="audit" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <AuditLogsTab />
            </TabsContent>
          )}

          {!isClient && (
            <TabsContent value="compliance" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <ComplianceTab />
            </TabsContent>
          )}

          {!isClient && (
            <TabsContent value="playbook" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <ObjectionPlaybookTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="feature-flags" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <FeatureFlagsTab />
            </TabsContent>
          )}

          {isSuperAdmin && (
            <TabsContent value="brokerages" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <BrokeragesTab />
            </TabsContent>
          )}

          <TabsContent value="security" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
            <SecurityTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
