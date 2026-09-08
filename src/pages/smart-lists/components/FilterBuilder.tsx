import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
            {i > 0 && (
              <span className="text-xs font-bold uppercase text-[#75887E] dark:text-[#A0B2A6] w-12 text-center">
                AND
              </span>
            )}
            {i === 0 && (
              <span className="text-xs font-bold uppercase text-[#75887E] dark:text-[#A0B2A6] w-12 text-center">
                WHERE
              </span>
            )}

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
              <SelectTrigger className="w-36 h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator */}
            <Select
              value={f.operator}
              onValueChange={v => {
                if (v) updateFilter(f.id, { operator: v as FilterOperator })
              }}
            >
              <SelectTrigger className="w-36 h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableOps.map(op => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value */}
            <Input
              className="w-40 h-9 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
              placeholder="Value"
              value={String(f.value || '')}
              onChange={e => updateFilter(f.id, { value: e.target.value })}
            />

            {/* Remove */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-[#75887E] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
              onClick={() => removeFilter(f.id)}
              disabled={filters.length <= 1}
            >
              <MaterialIcon name="delete" size={16} />
            </Button>
          </div>
        )
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={addFilter}
        className="mt-2 text-xs h-8 border-[#D8E2D6] dark:border-[#618764]/40 text-[#273338] dark:text-white cursor-pointer"
      >
        <MaterialIcon name="add" size={15} className="mr-1 text-[#2B5748] dark:text-[#9CB080]" />
        Add Condition
      </Button>
    </div>
  )
}
