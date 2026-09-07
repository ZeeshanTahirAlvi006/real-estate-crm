import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetUsersQuery } from '@/store/api/usersApi'
import {
  useCreateRoutingRuleMutation,
  useUpdateRoutingRuleMutation,
} from '@/store/api/leadsApi'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  ClockIcon,
  MapPinIcon,
  ScaleIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import type {
  RoutingRule,
  RoutingRuleType,
  AgentWeight,
  AgentSchedule,
} from '@/types'

interface RoutingRuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: RoutingRule | null
}

const DAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
]

export const RoutingRuleModal: React.FC<RoutingRuleModalProps> = ({
  open,
  onOpenChange,
  rule,
}) => {
  const { data: usersData } = useGetUsersQuery()
  const agents = (usersData?.users || []).filter((u) => u.isActive)

  const [createRule, { isLoading: isCreating }] = useCreateRoutingRuleMutation()
  const [updateRule, { isLoading: isUpdating }] = useUpdateRoutingRuleMutation()

  const [name, setName] = useState('')
  const [type, setType] = useState<RoutingRuleType>('round_robin')
  const [isActive, setIsActive] = useState(true)
  const [priority, setPriority] = useState(10)
  const [escalationTimeoutSeconds, setEscalationTimeoutSeconds] = useState(60)

  // Round Robin State
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  // Weighted State
  const [weights, setWeights] = useState<AgentWeight[]>([])

  // Zip Code State
  const [zipMappings, setZipMappings] = useState<{ agentId: string; zipInput: string; zipCodes: string[] }[]>([])

  // Time of Day State
  const [schedules, setSchedules] = useState<AgentSchedule[]>([])

  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setType(rule.type)
      setIsActive(rule.isActive)
      setPriority(rule.priority || 10)
      setEscalationTimeoutSeconds(rule.escalationTimeoutSeconds || 60)
      setSelectedAgentIds(rule.assignedAgentIds || [])
      setWeights(rule.agentWeights || [])
      setZipMappings(
        (rule.zipCodeMappings || []).map((m) => ({
          agentId: m.agentId,
          zipInput: '',
          zipCodes: m.zipCodes || [],
        }))
      )
      setSchedules(rule.schedules || [])
    } else {
      setName('')
      setType('round_robin')
      setIsActive(true)
      setPriority(10)
      setEscalationTimeoutSeconds(60)
      // Default select all active agents
      const defaultAgentIds = agents.map((a) => a.id)
      setSelectedAgentIds(defaultAgentIds)

      // Default equal weights
      if (defaultAgentIds.length > 0) {
        const equalShare = Math.floor(100 / defaultAgentIds.length)
        const remainder = 100 - equalShare * defaultAgentIds.length
        setWeights(
          defaultAgentIds.map((id, idx) => ({
            agentId: id,
            percentage: idx === 0 ? equalShare + remainder : equalShare,
          }))
        )
      } else {
        setWeights([])
      }
      setZipMappings([])
      setSchedules([])
    }
  }, [rule, open, agents.length])

  // Helpers for Round Robin
  const toggleAgentSelection = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      setSelectedAgentIds(selectedAgentIds.filter((id) => id !== agentId))
    } else {
      setSelectedAgentIds([...selectedAgentIds, agentId])
    }
  }

  // Helpers for Weighted
  const handleWeightChange = (agentId: string, percentage: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.agentId === agentId ? { ...w, percentage } : w))
    )
  }

  const addWeightedAgent = (agentId: string) => {
    if (!weights.some((w) => w.agentId === agentId)) {
      setWeights([...weights, { agentId, percentage: 0 }])
    }
  }

  const removeWeightedAgent = (agentId: string) => {
    setWeights(weights.filter((w) => w.agentId !== agentId))
  }

  const totalPercentage = weights.reduce((sum, w) => sum + (Number(w.percentage) || 0), 0)

  // Helpers for Zip Code
  const addZipMapping = () => {
    if (agents.length > 0) {
      setZipMappings([...zipMappings, { agentId: agents[0].id, zipInput: '', zipCodes: [] }])
    }
  }

  const removeZipMapping = (index: number) => {
    setZipMappings(zipMappings.filter((_, i) => i !== index))
  }

  const addZipCodeToMapping = (index: number) => {
    const item = zipMappings[index]
    const trimmed = item.zipInput.trim()
    if (!trimmed) return
    const zipsToAdd = trimmed.split(/[\s,]+/).filter(Boolean)
    const updated = [...zipMappings]
    updated[index].zipCodes = [...new Set([...updated[index].zipCodes, ...zipsToAdd])]
    updated[index].zipInput = ''
    setZipMappings(updated)
  }

  const removeZipCode = (mappingIndex: number, zipCode: string) => {
    const updated = [...zipMappings]
    updated[mappingIndex].zipCodes = updated[mappingIndex].zipCodes.filter((z) => z !== zipCode)
    setZipMappings(updated)
  }

  // Helpers for Schedule
  const addSchedule = () => {
    if (agents.length > 0) {
      setSchedules([
        ...schedules,
        {
          agentId: agents[0].id,
          timezone: 'America/New_York',
          windows: [{ dayOfWeek: [1, 2, 3, 4, 5], startHour: 9, endHour: 18 }],
        },
      ])
    }
  }

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const toggleScheduleDay = (scheduleIndex: number, windowIndex: number, day: number) => {
    const updated = JSON.parse(JSON.stringify(schedules))
    const currentDays: number[] = updated[scheduleIndex].windows[windowIndex].dayOfWeek
    if (currentDays.includes(day)) {
      if (currentDays.length > 1) {
        updated[scheduleIndex].windows[windowIndex].dayOfWeek = currentDays.filter((d: number) => d !== day)
      }
    } else {
      updated[scheduleIndex].windows[windowIndex].dayOfWeek = [...currentDays, day].sort()
    }
    setSchedules(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a rule name')
      return
    }

    if (type === 'round_robin' && selectedAgentIds.length === 0) {
      toast.error('Please select at least one agent for round-robin rotation')
      return
    }

    if (type === 'weighted') {
      if (weights.length === 0) {
        toast.error('Please add at least one agent to weighted distribution')
        return
      }
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toast.error(`Agent weights must sum to exactly 100% (currently ${totalPercentage}%)`)
        return
      }
    }

    if (type === 'zip_code') {
      if (zipMappings.length === 0) {
        toast.error('Please add at least one zip code territory mapping')
        return
      }
      const missingZip = zipMappings.some((m) => !m.zipCodes || m.zipCodes.length === 0)
      if (missingZip) {
        toast.error('Each territory mapping must have at least one ZIP code added')
        return
      }
    }

    if (type === 'time_of_day' && schedules.length === 0) {
      toast.error('Please configure at least one agent on-call schedule')
      return
    }

    const payload: Partial<RoutingRule> = {
      name: name.trim(),
      type,
      isActive,
      priority: Number(priority) || 10,
      escalationTimeoutSeconds: Number(escalationTimeoutSeconds) || 60,
    }

    if (type === 'round_robin') {
      payload.assignedAgentIds = selectedAgentIds
    } else if (type === 'weighted') {
      payload.agentWeights = weights.map((w) => ({ agentId: w.agentId, percentage: Number(w.percentage) }))
    } else if (type === 'zip_code') {
      payload.zipCodeMappings = zipMappings.map((m) => ({
        agentId: m.agentId,
        zipCodes: m.zipCodes,
      }))
    } else if (type === 'time_of_day') {
      payload.schedules = schedules
    }

    try {
      if (rule) {
        await updateRule({ id: rule.id, data: payload }).unwrap()
        toast.success(`Routing rule "${name}" updated!`)
      } else {
        await createRule(payload).unwrap()
        toast.success(`Routing rule "${name}" created & active!`)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save routing rule')
    }
  }

  const isLoading = isCreating || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {rule ? 'Edit Routing Rule' : 'Create Intelligent Routing Rule'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure automated lead distribution across agents using Round-Robin, Weighted Performance, Territory ZIPs, or Time-of-Day schedules.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2 text-xs">
          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold">Rule Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Austin Metro Round-Robin Primary"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority Order (1 = Highest)</Label>
              <Input
                type="number"
                min={1}
                max={999}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) || 1)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Algorithm Type Tabs */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Distribution Model</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setType('round_robin')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${type === 'round_robin'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                  : 'border-border/70 hover:bg-muted/40'
                  }`}
              >
                <ArrowsRightLeftIcon className="w-5 h-5 text-primary" />
                <span className="font-bold text-xs text-foreground">Round Robin</span>
                <span className="text-[10px] text-muted-foreground">Equal sequential turns</span>
              </button>

              <button
                type="button"
                onClick={() => setType('weighted')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${type === 'weighted'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                  : 'border-border/70 hover:bg-muted/40'
                  }`}
              >
                <ScaleIcon className="w-5 h-5 text-purple-500" />
                <span className="font-bold text-xs text-foreground">Weighted %</span>
                <span className="text-[10px] text-muted-foreground">Performance quotas</span>
              </button>

              <button
                type="button"
                onClick={() => setType('zip_code')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${type === 'zip_code'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                  : 'border-border/70 hover:bg-muted/40'
                  }`}
              >
                <MapPinIcon className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-xs text-foreground">ZIP Territory</span>
                <span className="text-[10px] text-muted-foreground">Geographic zones</span>
              </button>

              <button
                type="button"
                onClick={() => setType('time_of_day')}
                className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1 transition-all ${type === 'time_of_day'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                  : 'border-border/70 hover:bg-muted/40'
                  }`}
              >
                <ClockIcon className="w-5 h-5 text-amber-500" />
                <span className="font-bold text-xs text-foreground">Time of Day</span>
                <span className="text-[10px] text-muted-foreground">On-call & 60s escalation</span>
              </button>
            </div>
          </div>

          {/* Model Specific Configurations */}

          {/* 1. Round Robin */}
          {type === 'round_robin' && (
            <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">Round-Robin Agent Rotation</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Select the active agents that will receive leads in continuous sequential rotation.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {selectedAgentIds.length} Selected
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {agents.map((a) => {
                  const isChecked = selectedAgentIds.includes(a.id)
                  return (
                    <label
                      key={a.id}
                      onClick={() => toggleAgentSelection(a.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${isChecked
                        ? 'border-primary/60 bg-primary/10 text-foreground'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {a.firstName[0]}
                        </div>
                        <span className="font-semibold text-xs text-foreground">{a.firstName} {a.lastName}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => { }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* 2. Weighted */}
          {type === 'weighted' && (
            <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">Weighted Probability Distribution</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Assign percentage quotas to each agent. Sum must equal exactly 100%.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`font-mono text-xs font-bold ${Math.abs(totalPercentage - 100) < 0.01
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-destructive/10 text-destructive border-destructive/30'
                    }`}
                >
                  Total: {totalPercentage}% / 100%
                </Badge>
              </div>

              {/* Add Agent Row */}
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(val) => val && addWeightedAgent(val)}
                  value=""
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="+ Add agent to weighted quota..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents
                      .filter((a) => !weights.some((w) => w.agentId === a.id))
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-xs">
                          {a.firstName} {a.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Weights Table */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {weights.map((w) => {
                  const agent = agents.find((a) => a.id === w.agentId)
                  return (
                    <div
                      key={w.agentId}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 bg-card"
                    >
                      <span className="font-semibold text-xs flex-1 truncate text-foreground">
                        {agent ? `${agent.firstName} ${agent.lastName}` : w.agentId}
                      </span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={w.percentage}
                          onChange={(e) => handleWeightChange(w.agentId, Number(e.target.value) || 0)}
                          className="h-8 w-20 text-xs text-right font-mono font-bold"
                        />
                        <span className="text-xs font-bold text-muted-foreground">%</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWeightedAgent(w.agentId)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 3. ZIP Code Territory */}
          {type === 'zip_code' && (
            <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">ZIP Code Territory Routing</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Match lead location zip codes directly to territory specialists.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addZipMapping}
                  className="h-7 text-xs gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Territory
                </Button>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {zipMappings.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/70 bg-card space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={m.agentId}
                        onValueChange={(val) => {
                          if (val) {
                            const updated = [...zipMappings]
                            updated[idx].agentId = val
                            setZipMappings(updated)
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs max-w-50">
                          <SelectValue placeholder="Select Agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {agents.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.firstName} {a.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeZipMapping(idx)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* ZIP Input & Pills */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Input
                          value={m.zipInput}
                          onChange={(e) => {
                            const updated = [...zipMappings]
                            updated[idx].zipInput = e.target.value
                            setZipMappings(updated)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addZipCodeToMapping(idx)
                            }
                          }}
                          placeholder="Type ZIP(s) separated by commas (e.g. 78701, 78702) & press Enter"
                          className="h-8 text-xs font-mono flex-1"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => addZipCodeToMapping(idx)}
                          className="h-8 text-xs font-semibold px-3"
                        >
                          Add ZIPs
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {m.zipCodes.map((zip) => (
                          <Badge
                            key={zip}
                            variant="secondary"
                            className="text-[10px] font-mono px-2 py-0.5 gap-1 bg-muted/60"
                          >
                            <span>{zip}</span>
                            <button
                              type="button"
                              onClick={() => removeZipCode(idx, zip)}
                              className="text-muted-foreground hover:text-destructive font-bold ml-1"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Time of Day & Escalation */}
          {type === 'time_of_day' && (
            <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border/70">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">Time-of-Day Shift Routing</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Route leads to on-call agents during specific operational hours with automatic 60s timeout re-routing.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSchedule}
                  className="h-7 text-xs gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Agent Shift
                </Button>
              </div>

              {/* Escalation Timeout Slider */}
              <div className="p-3 rounded-lg bg-card border border-border/60 flex items-center justify-between gap-4">
                <div>
                  <Label className="text-xs font-semibold">Re-route Timeout (Escalation Timer)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    If on-call agent doesn't acknowledge lead within this time, re-routes to next available agent.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono">
                  <Input
                    type="number"
                    min={10}
                    max={600}
                    value={escalationTimeoutSeconds}
                    onChange={(e) => setEscalationTimeoutSeconds(Number(e.target.value) || 60)}
                    className="h-8 w-20 text-xs text-right font-bold"
                  />
                  <span className="text-xs text-muted-foreground font-bold">Secs</span>
                </div>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {schedules.map((sch, schIdx) => (
                  <div key={schIdx} className="p-3 rounded-lg border border-border/70 bg-card space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Select
                          value={sch.agentId}
                          onValueChange={(val) => {
                            if (val) {
                              const updated = [...schedules]
                              updated[schIdx].agentId = val
                              setSchedules(updated)
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs max-w-50">
                            <SelectValue placeholder="Agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                {a.firstName} {a.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={sch.timezone}
                          onValueChange={(val) => {
                            if (val) {
                              const updated = [...schedules]
                              updated[schIdx].timezone = val
                              setSchedules(updated)
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs max-w-45">
                            <SelectValue placeholder="Timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York" className="text-xs">Eastern (ET)</SelectItem>
                            <SelectItem value="America/Chicago" className="text-xs">Central (CT)</SelectItem>
                            <SelectItem value="America/Denver" className="text-xs">Mountain (MT)</SelectItem>
                            <SelectItem value="America/Los_Angeles" className="text-xs">Pacific (PT)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(schIdx)}
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Window Day / Hours */}
                    {sch.windows.map((win, winIdx) => (
                      <div key={winIdx} className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          {DAYS.map((d) => {
                            const isSelected = win.dayOfWeek.includes(d.id)
                            return (
                              <button
                                type="button"
                                key={d.id}
                                onClick={() => toggleScheduleDay(schIdx, winIdx, d.id)}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                                  }`}
                              >
                                {d.label}
                              </button>
                            )
                          })}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Hours (24h):</span>
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={win.startHour}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(schedules))
                              updated[schIdx].windows[winIdx].startHour = Number(e.target.value) || 0
                              setSchedules(updated)
                            }}
                            className="h-7 w-16 text-center text-xs font-mono"
                          />
                          <span className="text-muted-foreground font-bold">to</span>
                          <Input
                            type="number"
                            min={1}
                            max={24}
                            value={win.endHour}
                            onChange={(e) => {
                              const updated = JSON.parse(JSON.stringify(schedules))
                              updated[schIdx].windows[winIdx].endHour = Number(e.target.value) || 0
                              setSchedules(updated)
                            }}
                            className="h-7 w-16 text-center text-xs font-mono"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            ({win.startHour}:00 - {win.endHour}:00)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
            <div>
              <Label className="text-xs font-semibold">Enable Rule in Engine</Label>
              <p className="text-[11px] text-muted-foreground">
                Priority order will evaluate this rule against incoming leads.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="font-semibold">
              {isLoading ? 'Saving...' : rule ? 'Save Changes' : 'Create Routing Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
