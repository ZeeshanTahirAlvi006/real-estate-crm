export interface LeadSourceDef {
  id: string
  name: string
  type: string
  icon: string
  color: string
}

export const LEAD_SOURCE_DEFINITIONS: LeadSourceDef[] = [
  { id: 'zillow', name: 'Zillow', type: 'portal', icon: 'Z', color: '#006aff' },
  { id: 'realtor', name: 'Realtor.com', type: 'portal', icon: 'R', color: '#d92228' },
  { id: 'meta_ads', name: 'Meta Ads', type: 'advertising', icon: 'M', color: '#1877f2' },
  { id: 'google_ads', name: 'Google Ads', type: 'advertising', icon: 'G', color: '#4285f4' },
  { id: 'homes_com', name: 'Homes.com', type: 'portal', icon: 'H', color: '#00a562' },
  { id: 'website', name: 'Website', type: 'organic', icon: 'W', color: '#8b5cf6' },
  { id: 'referral', name: 'Referral', type: 'organic', icon: 'Rf', color: '#f59e0b' },
  { id: 'manual', name: 'Manual Entry', type: 'manual', icon: 'ME', color: '#6b7280' },
  { id: 'open_house', name: 'Open House', type: 'event', icon: 'OH', color: '#10b981' },
  { id: 'direct_mail', name: 'Direct Mail', type: 'marketing', icon: 'DM', color: '#ec4899' },
]
