import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import { useGetUsersQuery } from '@/store/api/usersApi'
import { ROLE_LABELS } from '@/constants/roles'
import { UserRole } from '@/types/auth'
import type { Deal, Pipeline } from '@/types'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (dealData: {
    pipelineId: string
    stageId: string
    contactId: string
    propertyAddress: string
    dealValue: number
    assignedAgentId: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    notes?: string
  }) => Promise<void>
  initialData?: Partial<Deal> | null
  currentPipelineId?: string
  isLoading?: boolean
}

export const DealModal: React.FC<DealModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  currentPipelineId,
  isLoading = false,
}) => {
  const { data: contactsData } = useGetContactsQuery({})
  const { data: pipelines = [] } = useGetPipelinesQuery()
  const { data: usersData } = useGetUsersQuery()

  // Filter only active agents (role === 'agent')
  const allUsers = usersData?.users || []
  const activeAgents = allUsers.filter((m) => m.isActive && m.role === UserRole.AGENT)
  const currentAssigned = initialData?.assignedAgentId
    ? allUsers.find((u) => u.id === initialData.assignedAgentId)
    : null
  const availableAgents =
    currentAssigned && !activeAgents.some((a) => a.id === currentAssigned.id)
      ? [currentAssigned, ...activeAgents]
      : activeAgents

  const [pipelineId, setPipelineId] = useState(initialData?.pipelineId || currentPipelineId || '')
  const [stageId, setStageId] = useState(initialData?.stageId || '')
  const [contactId, setContactId] = useState(initialData?.contactId || '')
  const [propertyAddress, setPropertyAddress] = useState(initialData?.propertyAddress || '')
  const [dealValue, setDealValue] = useState(initialData?.dealValue ? String(initialData.dealValue) : '550000')
  const [priority, setPriority] = useState<Deal['priority']>(initialData?.priority || 'medium')
  const [assignedAgentId, setAssignedAgentId] = useState(initialData?.assignedAgentId || '')
  const [notes, setNotes] = useState(initialData?.notes || '')

  // Set default pipeline if none selected
  useEffect(() => {
    if (!pipelineId && pipelines.length > 0) {
      const defaultPipe = pipelines.find((p: Pipeline) => p.isDefault) || pipelines[0]
      setPipelineId(defaultPipe.id)
    }
  }, [pipelines, pipelineId])

  // Get stages for current pipeline
  const selectedPipeline = pipelines.find((p: Pipeline) => p.id === pipelineId) || pipelines[0]
  const stages = selectedPipeline?.stages || []

  // Ensure stageId belongs to selected pipeline
  useEffect(() => {
    if (stages.length > 0 && (!stageId || !stages.some((s) => s.id === stageId))) {
      setStageId(stages[0].id)
    }
  }, [stages, stageId])

  // Sync initialData
  useEffect(() => {
    if (initialData) {
      if (initialData.pipelineId) setPipelineId(initialData.pipelineId)
      if (initialData.stageId) setStageId(initialData.stageId)
      if (initialData.contactId) setContactId(initialData.contactId)
      if (initialData.propertyAddress) setPropertyAddress(initialData.propertyAddress)
      if (initialData.dealValue) setDealValue(String(initialData.dealValue))
      if (initialData.priority) setPriority(initialData.priority)
      if (initialData.assignedAgentId) setAssignedAgentId(initialData.assignedAgentId)
      if (initialData.notes !== undefined) setNotes(initialData.notes)
    } else {
      if (currentPipelineId) setPipelineId(currentPipelineId)
    }
  }, [initialData, currentPipelineId, open])

  // Default agent
  useEffect(() => {
    if (!assignedAgentId && availableAgents.length > 0) {
      setAssignedAgentId(availableAgents[0].id)
    }
  }, [availableAgents, assignedAgentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId || !propertyAddress || !pipelineId || !stageId || !assignedAgentId) return

    await onSubmit({
      pipelineId,
      stageId,
      contactId,
      propertyAddress: propertyAddress.trim(),
      dealValue: Number(dealValue) || 0,
      assignedAgentId,
      priority,
      notes: notes.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-border/80 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {initialData?.id ? 'Edit Deal' : 'Create New Pipeline Deal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Pipeline & Stage Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Pipeline</Label>
              <Select
                value={pipelineId}
                onValueChange={(val) => {
                  if (val) {
                    setPipelineId(val)
                    const p = pipelines.find((pipe: Pipeline) => pipe.id === val)
                    if (p && p.stages.length > 0) {
                      setStageId(p.stages[0].id)
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select pipeline">
                    {selectedPipeline ? `${selectedPipeline.name} ${selectedPipeline.isDefault ? '(Default)' : ''}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p: Pipeline) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <span className="truncate">
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Initial Stage</Label>
              <Select value={stageId} onValueChange={(val) => val && setStageId(val)}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Select stage">
                    {stages.find((s) => s.id === stageId) ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: stages.find((s) => s.id === stageId)?.color }}
                        />
                        <span className="truncate">{stages.find((s) => s.id === stageId)?.name}</span>
                      </div>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="truncate">{s.name} ({s.probability}%)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Primary Contact / Client</Label>
            <Select value={contactId} onValueChange={(val) => val && setContactId(val)}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select contact from CRM...">
                  {contactsData?.contacts.find((c) => c.id === contactId)
                    ? `${contactsData.contacts.find((c) => c.id === contactId)?.firstName} ${contactsData.contacts.find((c) => c.id === contactId)?.lastName}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contactsData?.contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    <span className="truncate">
                      {c.firstName} {c.lastName} {c.phone ? `(${c.phone})` : ''}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Property Address */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Property Address</Label>
            <Input
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Austin TX"
              required
              className="h-9 text-xs"
            />
          </div>

          {/* Deal Value & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deal Value ($)</Label>
              <Input
                type="number"
                min="0"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="650000"
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as Deal['priority'])}>
                <SelectTrigger className="w-full h-9 text-xs">
                  <SelectValue placeholder="Priority">
                    {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assigned Agent</Label>
            <Select
              value={assignedAgentId}
              onValueChange={(val) => val && setAssignedAgentId(val)}
            >
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="Select available agent...">
                  {availableAgents.find((a) => a.id === assignedAgentId)
                    ? `${availableAgents.find((a) => a.id === assignedAgentId)?.firstName} ${availableAgents.find((a) => a.id === assignedAgentId)?.lastName}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id} className="text-xs">
                    <div className="flex items-center justify-between w-full min-w-0 gap-3">
                      <span className="font-medium text-foreground truncate">
                        {agent.firstName} {agent.lastName}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm shrink-0 whitespace-nowrap">
                        {ROLE_LABELS[agent.role] || agent.role}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Deal Notes / Contingencies</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Financing terms, inspection dates, or seller concessions..."
              className="w-full text-xs rounded-lg bg-background border border-border p-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="shadow-xs font-semibold">
              {initialData?.id ? 'Save Changes' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
