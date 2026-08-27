import { useState } from 'react'
import {
  useGetRoutingRulesQuery,
  useUpdateRoutingRuleMutation,
  useDeleteRoutingRuleMutation,
} from '@/store/api/leadsApi'
import { useGetUsersQuery } from '@/store/api/usersApi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowsRightLeftIcon,
  ScaleIcon,
  MapPinIcon,
  ClockIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { RoutingRuleModal } from './RoutingRuleModal'
import type { RoutingRule, RoutingRuleType } from '@/types'

const TYPE_CONFIG: Record<
  RoutingRuleType,
  { label: string; icon: typeof ArrowsRightLeftIcon; color: string; bg: string }
> = {
  round_robin: {
    label: 'Round Robin',
    icon: ArrowsRightLeftIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  weighted: {
    label: 'Weighted Quota',
    icon: ScaleIcon,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
  zip_code: {
    label: 'ZIP Code Territory',
    icon: MapPinIcon,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  time_of_day: {
    label: 'Time-of-Day Shift',
    icon: ClockIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
  },
}

export function RoutingRulesTab() {
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading } = useGetRoutingRulesQuery()
  const { data: usersData } = useGetUsersQuery()
  const users = usersData?.users || []

  const [updateRule] = useUpdateRoutingRuleMutation()
  const [deleteRule] = useDeleteRoutingRuleMutation()

  const rules = [...(data?.routingRules || [])].sort((a, b) => (a.priority || 0) - (b.priority || 0))

  const handleToggle = async (rule: RoutingRule) => {
    try {
      await updateRule({
        id: rule.id,
        data: { isActive: !rule.isActive },
      }).unwrap()
      toast.success(`Rule "${rule.name}" is now ${!rule.isActive ? 'active' : 'paused'}`)
    } catch {
      toast.error('Failed to update rule')
    }
  }

  const handleDelete = async (rule: RoutingRule) => {
    if (confirm(`Are you sure you want to delete routing rule "${rule.name}"?`)) {
      try {
        await deleteRule(rule.id).unwrap()
        toast.success(`Rule "${rule.name}" deleted`)
      } catch {
        toast.error('Failed to delete rule')
      }
    }
  }

  const handleMovePriority = async (rule: RoutingRule, direction: 'up' | 'down') => {
    const currentIdx = rules.findIndex((r) => r.id === rule.id)
    if (currentIdx === -1) return
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1
    if (targetIdx < 0 || targetIdx >= rules.length) return

    const targetRule = rules[targetIdx]
    const tempPriority = rule.priority
    try {
      await Promise.all([
        updateRule({ id: rule.id, data: { priority: targetRule.priority } }).unwrap(),
        updateRule({ id: targetRule.id, data: { priority: tempPriority } }).unwrap(),
      ])
      toast.success('Priority order updated')
    } catch {
      toast.error('Failed to reorder priority')
    }
  }

  const getAgentName = (agentId: string) => {
    const user = users.find((u) => u.id === agentId)
    return user ? `${user.firstName} ${user.lastName}` : agentId.substring(0, 8)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-2xl border border-border/80">
        <div>
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <span>Priority Stacking Pipeline</span>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              Top-Down Evaluation
            </Badge>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Incoming leads are evaluated against rules in order of priority (1 = highest). The first matching rule automatically assigns the agent.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingRule(null)
            setIsModalOpen(true)
          }}
          size="sm"
          className="gap-1.5 font-semibold shrink-0 shadow-xs"
        >
          <PlusIcon className="w-4 h-4" />
          Add Routing Rule
        </Button>
      </div>

      {/* Rules Stack List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm">No Routing Rules Configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Create routing rules to automatically distribute incoming leads to your agents using Round-Robin or Territory models.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingRule(null)
              setIsModalOpen(true)
            }}
          >
            Create First Routing Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => {
            const config = TYPE_CONFIG[rule.type] || TYPE_CONFIG.round_robin
            const Icon = config.icon

            return (
              <Card
                key={rule.id}
                className={`overflow-hidden transition-all duration-200 hover:shadow-md border-border/80 ${
                  !rule.isActive ? 'opacity-65 bg-muted/20' : 'bg-card'
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    {/* Left: Priority & Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Priority Rank & Arrows */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMovePriority(rule, 'up')}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                          title="Move Priority Up"
                        >
                          <ChevronUpIcon className="w-4 h-4" />
                        </button>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-xs">
                          #{rule.priority}
                        </div>
                        <button
                          disabled={idx === rules.length - 1}
                          onClick={() => handleMovePriority(rule, 'down')}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-20 p-0.5"
                          title="Move Priority Down"
                        >
                          <ChevronDownIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Rule Identity */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground">{rule.name}</h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 border ${config.bg} ${config.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          {rule.isActive && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              <CheckCircleIcon className="w-3 h-3" /> Active
                            </span>
                          )}
                        </div>

                        {/* Model-specific detail summary */}
                        <div className="text-xs text-muted-foreground pt-0.5">
                          {rule.type === 'round_robin' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Rotation Pool:</span>
                              {(rule.assignedAgentIds || []).map((id) => (
                                <Badge key={id} variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                  {getAgentName(id)}
                                </Badge>
                              ))}
                              {rule.lastAssignedIndex !== undefined && rule.lastAssignedIndex >= 0 && (
                                <span className="text-[10px] text-primary font-mono ml-1">
                                  (Pointer: {rule.lastAssignedIndex + 1}/{(rule.assignedAgentIds || []).length})
                                </span>
                              )}
                            </div>
                          )}

                          {rule.type === 'weighted' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Quotas:</span>
                              {(rule.agentWeights || []).map((w) => (
                                <Badge key={w.agentId} variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                  {getAgentName(w.agentId)} ({w.percentage}%)
                                </Badge>
                              ))}
                            </div>
                          )}

                          {rule.type === 'zip_code' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Territories:</span>
                              {(rule.zipCodeMappings || []).map((m, mIdx) => (
                                <Badge key={mIdx} variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                  {getAgentName(m.agentId)}: {m.zipCodes.slice(0, 3).join(', ')}
                                  {m.zipCodes.length > 3 ? ` +${m.zipCodes.length - 3}` : ''}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {rule.type === 'time_of_day' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Shifts:</span>
                              {(rule.schedules || []).map((s, sIdx) => (
                                <Badge key={sIdx} variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                  {getAgentName(s.agentId)} ({s.timezone.split('/')[1] || s.timezone})
                                </Badge>
                              ))}
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                • {rule.escalationTimeoutSeconds || 60}s Timeout Escalation
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="flex items-center gap-1.5 mr-2">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggle(rule)}
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingRule(rule)
                              setIsModalOpen(true)
                            }}
                            className="gap-2"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                            Edit Rule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule)}
                            className="gap-2 text-destructive"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            Delete Rule
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <RoutingRuleModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        rule={editingRule}
      />
    </div>
  )
}
