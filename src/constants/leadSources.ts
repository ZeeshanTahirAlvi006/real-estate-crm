export interface LeadSourceDef {
  id: string
  name: string
  type: string
  icon: string
  color: string
}

export const LEAD_SOURCE_DEFINITIONS: LeadSourceDef[] = [
  { id: 'zameen', name: 'Zameen.com', type: 'portal', icon: 'ZM', color: '#27ae60' },
  { id: 'graana', name: 'Graana.com', type: 'portal', icon: 'GR', color: '#e74c3c' },
  { id: 'olx', name: 'OLX Pakistan', type: 'portal', icon: 'OLX', color: '#002f34' },
  { id: 'google_ads', name: 'Google Ads', type: 'advertising', icon: 'G', color: '#4285f4' },
  { id: 'meta_ads', name: 'Meta Ads', type: 'advertising', icon: 'M', color: '#1877f2' },
  { id: 'whatsapp', name: 'WhatsApp', type: 'messaging', icon: 'WA', color: '#25d366' },
  { id: 'website', name: 'Website', type: 'organic', icon: 'W', color: '#8b5cf6' },
  { id: 'referral', name: 'Referral', type: 'organic', icon: 'Rf', color: '#f59e0b' },
  { id: 'site_visit', name: 'Site Visit / Walk-in', type: 'event', icon: 'SV', color: '#10b981' },
  { id: 'manual', name: 'Manual Entry', type: 'manual', icon: 'ME', color: '#6b7280' },
]
