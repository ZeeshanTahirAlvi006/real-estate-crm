import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import { useGetPipelineQuery } from '@/store/api/pipelineApi'
import { useGetTeamMembersQuery } from '@/store/api/settingsApi'
import { ROLE_LABELS } from '@/constants/roles'
import type { Deal } from '@/types'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (dealData: Partial<Deal>) => Promise<void>
  initialData?: Partial<Deal> | null
  isLoading?: boolean
}

export const DealModal: React.FC<DealModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
}) => {
  const { data: contactsData } = useGetContactsQuery({})
  const { data: pipeline } = useGetPipelineQuery()
  const { data: teamMembers = [] } = useGetTeamMembersQuery()

  // Filter only active available agents & team leads
  const availableAgents = teamMembers.filter((m) => m.status === 'active')

  const [contactId, setContactId] = useState(initialData?.contactId || '')
  const [propertyAddress, setPropertyAddress] = useState(initialData?.propertyAddress || '')
  const [dealValue, setDealValue] = useState(initialData?.dealValue ? String(initialData.dealValue) : '550000')
  const [stageId, setStageId] = useState(initialData?.stageId || 'new_lead')
  const [priority, setPriority] = useState<Deal['priority']>(initialData?.priority || 'medium')
  const [assignedAgentId, setAssignedAgentId] = useState(initialData?.assignedAgentId || '')
  const [notes, setNotes] = useState(initialData?.notes || '')

  // Reset or initialize default agent when opening
  useEffect(() => {
    if (initialData?.assignedAgentId) {
      setAssignedAgentId(initialData.assignedAgentId)
    } else if (availableAgents.length > 0 && !assignedAgentId) {
      setAssignedAgentId(availableAgents[0].id)
    }
  }, [initialData, availableAgents, assignedAgentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedContact = contactsData?.contacts.find((c) => c.id === contactId)
    const selectedAgent = availableAgents.find((a) => a.id === assignedAgentId) || availableAgents[0]

    await onSubmit({
      contactId: selectedContact?.id || contactId || 'contact-001',
      contactName: selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName}` : 'Lead Contact',
      propertyAddress: propertyAddress || '1200 Oak St, Austin TX',
      dealValue: Number(dealValue) || 500000,
      stageId,
      priority,
      assignedAgentId: selectedAgent?.id,
      assignedAgentName: selectedAgent ? `${selectedAgent.firstName} ${selectedAgent.lastName}` : 'Sarah Wilson',
      notes,
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {initialData ? 'Edit Deal' : 'Create New Pipeline Deal'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Contact Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Primary Contact / Client</Label>
            <Select value={contactId} onValueChange={(val) => val && setContactId(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select contact from CRM..." />
              </SelectTrigger>
              <SelectContent>
                {contactsData?.contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.firstName} {c.lastName} ({c.phone})
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

          {/* Deal Value & Stage Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estimated Deal Value ($)</Label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="650000"
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Pipeline Stage</Label>
              <Select value={stageId} onValueChange={(val) => val && setStageId(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {pipeline?.stages.filter((s) => (s.name !== 'Closed Won' && s.name !== 'Closed Lost')).map((s) => (
                    <SelectItem key={s.name} value={s.name} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority & Assigned Agent (Only Available Agents) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(val) => val && setPriority(val as Deal['priority'])}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Agent</Label>
              <Select
                value={assignedAgentId || (availableAgents[0]?.id ?? '')}
                onValueChange={(val) => val && setAssignedAgentId(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select available agent..." />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-medium text-foreground">
                          {agent.firstName} {agent.lastName}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-sm">
                          {ROLE_LABELS[agent.role] || agent.role}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {initialData ? 'Save Changes' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
