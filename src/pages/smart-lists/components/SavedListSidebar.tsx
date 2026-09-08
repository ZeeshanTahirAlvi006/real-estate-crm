import { TrashIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SavedSmartList } from '@/types'

interface SavedListSidebarProps {
  lists: SavedSmartList[]
  selectedId: string | null
  onSelect: (list: SavedSmartList) => void
  onDelete: (id: string) => void
  onOpenSaveModal: () => void
}

export function SavedListSidebar({
  lists,
  selectedId,
  onSelect,
  onDelete,
  onOpenSaveModal,
}: SavedListSidebarProps) {
  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-primary" />
          Smart List Presets
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenSaveModal}
          className="h-7 text-xs px-2 gap-1"
          title="Save current filters as a new preset"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Save
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5 p-2 pt-0">
        {lists.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No presets saved yet.
          </div>
        ) : (
          lists.map((preset) => {
            const isSelected = selectedId === preset.id
            return (
              <div
                key={preset.id}
                className={cn(
                  'group flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
                onClick={() => onSelect(preset)}
              >
                <span className="truncate flex-1">{preset.name}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                    {preset.contactCount}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(preset.id)
                    }}
                    title="Delete preset"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
