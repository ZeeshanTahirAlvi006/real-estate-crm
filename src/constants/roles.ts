import { UserRole } from '@/types/auth'

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.BROKERAGE_OWNER]: 'Brokerage Owner',
  [UserRole.TEAM_LEAD]: 'Team Lead',
  [UserRole.AGENT]: 'Agent',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-red-500/15 text-red-400 border-red-500/30',
  [UserRole.BROKERAGE_OWNER]: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  [UserRole.TEAM_LEAD]: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  [UserRole.AGENT]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

/**
 * Permissions map: which features each role can access.
 * true = full access, false = no access
 */
export const ROLE_PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  [UserRole.SUPER_ADMIN]: {
    viewDashboard: true,
    manageContacts: true,
    managePipeline: true,
    manageLeadIngestion: true,
    manageSmartLists: true,
    viewDataHealth: true,
    triggerDataActions: true,
    manageTeam: true,
    manageIntegrations: true,
    manageSettings: true,
    viewAllDeals: true,
    exportData: true,
  },
  [UserRole.BROKERAGE_OWNER]: {
    viewDashboard: true,
    manageContacts: true,
    managePipeline: true,
    manageLeadIngestion: true,
    manageSmartLists: true,
    viewDataHealth: true,
    triggerDataActions: true,
    manageTeam: true,
    manageIntegrations: true,
    manageSettings: true,
    viewAllDeals: true,
    exportData: true,
  },
  [UserRole.TEAM_LEAD]: {
    viewDashboard: true,
    manageContacts: true,
    managePipeline: true,
    manageLeadIngestion: true,
    manageSmartLists: true,
    viewDataHealth: true,
    triggerDataActions: false,
    manageTeam: true,
    manageIntegrations: false,
    manageSettings: true,
    viewAllDeals: true,
    exportData: true,
  },
  [UserRole.AGENT]: {
    viewDashboard: true,
    manageContacts: true,
    managePipeline: true,
    manageLeadIngestion: false,
    manageSmartLists: true,
    viewDataHealth: true,
    triggerDataActions: false,
    manageTeam: false,
    manageIntegrations: false,
    manageSettings: true,
    viewAllDeals: false,
    exportData: false,
  },
}
