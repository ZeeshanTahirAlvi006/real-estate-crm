import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SmartListFilter, FilterOperator } from '@/types'

interface FilterBuilderProps {
  filters: SmartListFilter[]
  onChange: (filters: SmartListFilter[]) => void
}

const FIELD_OPTIONS = [
  { value: 'leadScore', label: 'Lead Score' },
  { value: 'leadSource', label: 'Lead Source' },
  { value: 'status', label: 'Status' },
  { value: 'city', label: 'City' },
]

const OPERATOR_OPTIONS: Record<string, { value: FilterOperator; label: string }[]> = {
  leadScore: [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
  ],
  leadSource: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
  ],
  status: [
    { value: 'equals', label: 'Is' },
  ],
  city: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
  ],
}

export function FilterBuilder({ filters, onChange }: FilterBuilderProps) {
  const addFilter = () => {
    const newFilter: SmartListFilter = {
      id: `f-${Date.now()}`,
      field: 'leadScore',
      operator: 'greater_than',
      value: '50',
    }
    onChange([...filters, newFilter])
  }

  const removeFilter = (id: string) => {
    onChange(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, updates: Partial<SmartListFilter>) => {
    onChange(filters.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  return (
    <div className="space-y-3">
      {filters.map((f, i) => {
        const availableOps = OPERATOR_OPTIONS[f.field] || OPERATOR_OPTIONS.leadScore

        return (
          <div key={f.id} className="flex flex-wrap items-center gap-2">
            {i > 0 && <span className="text-xs font-semibold uppercase text-muted-foreground w-10 text-center">AND</span>}
            {i === 0 && <span className="text-xs font-semibold uppercase text-muted-foreground w-10 text-center">WHERE</span>}

            {/* Field */}
            <Select
              value={f.field}
              onValueChange={v => {
                if (v) {
                  updateFilter(f.id, {
                    field: v,
                    operator: OPERATOR_OPTIONS[v]?.[0]?.value || 'equals',
                    value: '',
                  })
                }
              }}
            >
              <SelectTrigger className="w-35 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Operator */}
            <Select
              value={f.operator}
              onValueChange={v => {
                if (v) updateFilter(f.id, { operator: v as FilterOperator })
              }}
            >
              <SelectTrigger className="w-35 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableOps.map(op => <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Value */}
            <Input
              className="w-40 h-9"
              placeholder="Value"
              value={String(f.value || '')}
              onChange={e => updateFilter(f.id, { value: e.target.value })}
            />

            {/* Remove */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => removeFilter(f.id)}
              disabled={filters.length <= 1}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <Button variant="outline" size="sm" onClick={addFilter} className="mt-2">
        <PlusIcon className="mr-1 h-3.5 w-3.5" /> Add Condition
      </Button>
    </div>
  )
}
