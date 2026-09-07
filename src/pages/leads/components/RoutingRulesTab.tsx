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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { RoutingRuleModal } from './RoutingRuleModal'
import type { RoutingRule, RoutingRuleType } from '@/types'

const TYPE_CONFIG: Record<
  RoutingRuleType,
  { label: string; icon: string }
> = {
  round_robin: {
    label: 'Round Robin',
    icon: 'alt_route',
  },
  weighted: {
    label: 'Weighted Quota',
    icon: 'scale',
  },
  zip_code: {
    label: 'ZIP Territory',
    icon: 'location_on',
  },
  time_of_day: {
    label: 'Time Shift',
    icon: 'schedule',
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
      toast.success(`${rule.name} is now ${!rule.isActive ? 'active' : 'paused'}`)
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
      toast.success('Priority updated')
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#202B2F] p-4 rounded-xl border border-[#D8E2D6] dark:border-[#618764]/60">
        <div>
          <h3 className="font-bold text-sm text-[#273338] dark:text-white">
            Priority Pipeline
          </h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] mt-0.5">
            Leads evaluate top-down. First matching rule assigns agent.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingRule(null)
            setIsModalOpen(true)
          }}
          size="sm"
          className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-3.5 gap-1.5 rounded-lg shrink-0 border border-[#9CB080] shadow-xs cursor-pointer"
        >
          <MaterialIcon name="add" size={16} />
          <span>Add Rule</span>
        </Button>
      </div>

      {/* Rules Stack List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl bg-[#EDF2EB] dark:bg-[#202B2F]" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-[#D8E2D6] dark:border-[#618764]/60 bg-white/50 dark:bg-[#202B2F]/40">
          <div className="w-12 h-12 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center mx-auto mb-3 border border-[#D8E2D6] dark:border-[#618764]/50">
            <MaterialIcon name="alt_route" size={24} />
          </div>
          <h3 className="font-bold text-sm text-[#273338] dark:text-white">No Rules Configured</h3>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6] max-w-sm mx-auto mt-1 mb-4">
            Create routing rules to automatically distribute incoming leads to your agents.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingRule(null)
              setIsModalOpen(true)
            }}
            className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 rounded-lg"
          >
            Create First Rule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, idx) => {
            const config = TYPE_CONFIG[rule.type] || TYPE_CONFIG.round_robin

            return (
              <Card
                key={rule.id}
                className={`overflow-hidden transition-all duration-200 border rounded-xl shadow-xs hover:shadow-md ${
                  !rule.isActive
                    ? 'opacity-70 bg-[#EDF2EB]/40 dark:bg-[#202B2F]/40 border-[#D8E2D6] dark:border-[#618764]/40'
                    : 'bg-white dark:bg-[#254238] border-[#D8E2D6] dark:border-[#618764]'
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
                          className="text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 p-0.5 cursor-pointer"
                          title="Move Priority Up"
                        >
                          <MaterialIcon name="keyboard_arrow_up" size={18} />
                        </button>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#9CB080] text-[#273338] font-bold text-xs shadow-xs">
                          #{rule.priority}
                        </div>
                        <button
                          disabled={idx === rules.length - 1}
                          onClick={() => handleMovePriority(rule, 'down')}
                          className="text-[#75887E] dark:text-[#A0B2A6] hover:text-[#273338] dark:hover:text-white disabled:opacity-20 p-0.5 cursor-pointer"
                          title="Move Priority Down"
                        >
                          <MaterialIcon name="keyboard_arrow_down" size={18} />
                        </button>
                      </div>

                      {/* Rule Identity */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[#273338] dark:text-white">{rule.name}</h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1 bg-[#EDF2EB] dark:bg-[#202B2F] text-[#2B5748] dark:text-[#9CB080] border-[#D8E2D6] dark:border-[#618764]/50"
                          >
                            <MaterialIcon name={config.icon} size={13} />
                            <span>{config.label}</span>
                          </Badge>
                          {rule.isActive && (
                            <span className="flex items-center gap-1 text-[11px] text-[#2B5748] dark:text-[#9CB080] font-semibold">
                              <MaterialIcon name="check_circle" size={13} />
                              <span>Active</span>
                            </span>
                          )}
                        </div>

                        {/* Model-specific detail summary */}
                        <div className="text-xs text-[#75887E] dark:text-[#A0B2A6] pt-0.5">
                          {rule.type === 'round_robin' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Rotation Pool:</span>
                              {(rule.assignedAgentIds || []).map((id) => (
                                <Badge
                                  key={id}
                                  variant="secondary"
                                  className="text-[10px] font-medium py-0 px-1.5 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764]/40"
                                >
                                  {getAgentName(id)}
                                </Badge>
                              ))}
                              {rule.lastAssignedIndex !== undefined && rule.lastAssignedIndex >= 0 && (
                                <span className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-mono font-semibold ml-1">
                                  (Pointer: {rule.lastAssignedIndex + 1}/{(rule.assignedAgentIds || []).length})
                                </span>
                              )}
                            </div>
                          )}

                          {rule.type === 'weighted' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Quotas:</span>
                              {(rule.agentWeights || []).map((w) => (
                                <Badge
                                  key={w.agentId}
                                  variant="secondary"
                                  className="text-[10px] font-medium py-0 px-1.5 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764]/40"
                                >
                                  {getAgentName(w.agentId)} ({w.percentage}%)
                                </Badge>
                              ))}
                            </div>
                          )}

                          {rule.type === 'zip_code' && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>Territories:</span>
                              {(rule.zipCodeMappings || []).map((m, mIdx) => (
                                <Badge
                                  key={mIdx}
                                  variant="secondary"
                                  className="text-[10px] font-medium py-0 px-1.5 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764]/40"
                                >
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
                                <Badge
                                  key={sIdx}
                                  variant="secondary"
                                  className="text-[10px] font-medium py-0 px-1.5 bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#273338] dark:text-white border-[#D8E2D6] dark:border-[#618764]/40"
                                >
                                  {getAgentName(s.agentId)} ({s.timezone.split('/')[1] || s.timezone})
                                </Badge>
                              ))}
                              <span className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-semibold ml-1">
                                • {rule.escalationTimeoutSeconds || 60}s Escalation
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <div className="flex items-center gap-1.5 mr-2">
                        <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6] font-medium">
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggle(rule)}
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#75887E] dark:text-[#A0B2A6] hover:bg-[#EDF2EB] dark:hover:bg-[#202B2F] hover:text-[#273338] dark:hover:text-white">
                          <MaterialIcon name="more_vert" size={18} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingRule(rule)
                              setIsModalOpen(true)
                            }}
                            className="gap-2 cursor-pointer"
                          >
                            <MaterialIcon name="edit" size={14} />
                            <span>Edit Rule</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(rule)}
                            className="gap-2 text-red-600 dark:text-red-400 cursor-pointer"
                          >
                            <MaterialIcon name="delete" size={14} />
                            <span>Delete Rule</span>
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

export default RoutingRulesTab
