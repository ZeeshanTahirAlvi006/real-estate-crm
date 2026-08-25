import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SavedSmartList } from '@/types'

const SAVED_PRESETS: SavedSmartList[] = [
  {
    id: 'list-1',
    name: '🔥 Hot Leads (Score > 70)',
    contactCount: 14,
    updatedAt: '2026-08-21',
    filters: [{ id: '1', field: 'leadScore', operator: 'greater_than', value: '70' }],
  },
  {
    id: 'list-2',
    name: '🔵 Zillow Inbound',
    contactCount: 18,
    updatedAt: '2026-08-20',
    filters: [{ id: '2', field: 'leadSource', operator: 'equals', value: 'Zillow' }],
  },
  {
    id: 'list-3',
    name: '🏙️ Austin Metro Area',
    contactCount: 9,
    updatedAt: '2026-08-19',
    filters: [{ id: '3', field: 'city', operator: 'contains', value: 'Austin' }],
  },
  {
    id: 'list-4',
    name: '⚡ High Intent Meta Ads',
    contactCount: 12,
    updatedAt: '2026-08-18',
    filters: [
      { id: '4a', field: 'leadSource', operator: 'equals', value: 'Meta Ads' },
      { id: '4b', field: 'leadScore', operator: 'greater_than', value: '50' },
    ],
  },
]

interface SavedListSidebarProps {
  selectedId: string | null
  onSelect: (list: SavedSmartList) => void
}

export function SavedListSidebar({ selectedId, onSelect }: SavedListSidebarProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Saved Presets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 p-2">
        {SAVED_PRESETS.map(preset => {
          const isSelected = selectedId === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50 text-muted-foreground'
              )}
            >
              <span className="truncate">{preset.name}</span>
              <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                {preset.contactCount}
              </Badge>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
