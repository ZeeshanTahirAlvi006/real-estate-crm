import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
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
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#254238] shadow-2xl rounded-2xl">
        {/* Header with Theme Badge & Soft Background */}
        <DialogHeader className="p-5 pb-4 border-b border-[#D8E2D6] dark:border-[#618764]/40 bg-[#EDF2EB]/60 dark:bg-[#1A2E26]/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#9CB080]/20 text-[#2B5748] dark:text-[#9CB080] border border-[#9CB080]/30 shadow-xs">
              <MaterialIcon name={initialData?.id ? 'edit_note' : 'add_business'} size={22} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                {initialData?.id ? 'Edit Pipeline Deal' : 'Create New Pipeline Deal'}
              </DialogTitle>
              <p className="text-xs text-[#4A5D54] dark:text-[#A0B2A6] mt-0.5">
                Assign client contact, pipeline stage, and valuation to track deal progression.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body with Theme Form Controls */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Pipeline & Stage Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="account_tree" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Target Pipeline</span>
              </Label>
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
                <SelectTrigger className="w-full h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all">
                  <SelectValue placeholder="Select pipeline">
                    {selectedPipeline ? `${selectedPipeline.name} ${selectedPipeline.isDefault ? '(Default)' : ''}` : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-lg">
                  {pipelines.map((p: Pipeline) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                      <span className="truncate">
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="view_column" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Initial Stage</span>
              </Label>
              <Select value={stageId} onValueChange={(val) => val && setStageId(val)}>
                <SelectTrigger className="w-full h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all">
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
                <SelectContent className="bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-lg">
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
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
            <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
              <MaterialIcon name="person" size={14} className="text-[#618764] dark:text-[#9CB080]" />
              <span>Primary Contact / Client</span>
            </Label>
            <Select value={contactId} onValueChange={(val) => val && setContactId(val)}>
              <SelectTrigger className="w-full h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all">
                <SelectValue placeholder="Select contact from CRM...">
                  {contactsData?.contacts.find((c) => c.id === contactId)
                    ? `${contactsData.contacts.find((c) => c.id === contactId)?.firstName} ${contactsData.contacts.find((c) => c.id === contactId)?.lastName}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-lg max-h-56">
                {contactsData?.contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
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
            <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
              <MaterialIcon name="home_pin" size={14} className="text-[#618764] dark:text-[#9CB080]" />
              <span>Property Address</span>
            </Label>
            <Input
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Austin TX"
              required
              className="h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all"
            />
          </div>

          {/* Deal Value & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="attach_money" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Deal Value ($)</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="650000"
                required
                className="h-9 text-xs font-mono tabular-nums bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
                <MaterialIcon name="flag" size={14} className="text-[#618764] dark:text-[#9CB080]" />
                <span>Priority Level</span>
              </Label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as Deal['priority'])}>
                <SelectTrigger className="w-full h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all">
                  <SelectValue placeholder="Priority">
                    {priority ? (
                      <span className="capitalize font-semibold">{priority}</span>
                    ) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-lg">
                  <SelectItem value="low" className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                    <span className="inline-flex items-center gap-1.5 text-[#75887E] dark:text-[#A0B2A6] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#75887E]" />
                      Low Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="medium" className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                    <span className="inline-flex items-center gap-1.5 text-[#2B5748] dark:text-[#9CB080] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#9CB080]" />
                      Medium Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="high" className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      High Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="urgent" className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                    <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Urgent Priority
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned Agent */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
              <MaterialIcon name="badge" size={14} className="text-[#618764] dark:text-[#9CB080]" />
              <span>Assigned Agent</span>
            </Label>
            <Select
              value={assignedAgentId}
              onValueChange={(val) => val && setAssignedAgentId(val)}
            >
              <SelectTrigger className="w-full h-9 text-xs bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all">
                <SelectValue placeholder="Select available agent...">
                  {availableAgents.find((a) => a.id === assignedAgentId)
                    ? `${availableAgents.find((a) => a.id === assignedAgentId)?.firstName} ${availableAgents.find((a) => a.id === assignedAgentId)?.lastName}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white shadow-lg max-h-56">
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id} className="text-xs focus:bg-[#EDF2EB] dark:focus:bg-[#1A2E26]">
                    <div className="flex items-center justify-between w-full min-w-0 gap-3">
                      <span className="font-semibold text-[#273338] dark:text-white truncate">
                        {agent.firstName} {agent.lastName}
                      </span>
                      <span className="text-[10px] text-[#2B5748] dark:text-[#9CB080] font-bold bg-[#9CB080]/15 border border-[#9CB080]/30 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
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
            <Label className="text-xs font-bold text-[#273338] dark:text-[#E2ECE4] flex items-center gap-1.5">
              <MaterialIcon name="description" size={14} className="text-[#618764] dark:text-[#9CB080]" />
              <span>Deal Notes / Contingencies</span>
            </Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Financing terms, inspection dates, or seller concessions..."
              className="w-full text-xs rounded-lg bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-[#75887E] dark:placeholder-[#A0B2A6] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#9CB080] focus:border-[#9CB080] transition-all duration-200"
            />
          </div>

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[#D8E2D6] dark:border-[#618764] bg-white dark:bg-[#202B2F] text-[#273338] dark:text-white hover:bg-[#EDF2EB] dark:hover:bg-[#1A2E26] font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="gap-1.5 bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold shadow-xs transition-all duration-200 cursor-pointer text-xs"
            >
              <MaterialIcon name={initialData?.id ? 'save' : 'add'} size={16} />
              <span>{initialData?.id ? 'Save Changes' : 'Create Deal'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
