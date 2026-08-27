import React, { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetUsersQuery } from '@/store/api/usersApi'
import { useIngestManualLeadMutation } from '@/store/api/leadsApi'
import { toast } from 'sonner'
import { UserPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface ManualLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ManualLeadModal: React.FC<ManualLeadModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: usersData } = useGetUsersQuery()
  const agents = (usersData?.users || []).filter((u) => u.isActive)

  const [ingestManualLead, { isLoading }] = useIngestManualLeadMutation()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [zipCode, setZipCode] = useState('')
  const [leadSource, setLeadSource] = useState('manual')
  const [message, setMessage] = useState('')
  const [assignedAgentId, setAssignedAgentId] = useState<string>('auto')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and Last name are required')
      return
    }

    try {
      const contact = await ingestManualLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        propertyAddress: address.trim() || undefined,
        propertyPrice: price ? Number(price) : undefined,
        zipCode: zipCode.trim() || undefined,
        leadSource,
        message: message.trim() || undefined,
        assignedAgentId: assignedAgentId !== 'auto' ? assignedAgentId : undefined,
      }).unwrap()

      toast.success(
        `Lead for ${contact.firstName} ${contact.lastName} ingested! Score: ${contact.leadScore}/100`
      )
      onOpenChange(false)
      // Reset form
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setPrice('')
      setZipCode('')
      setMessage('')
      setAssignedAgentId('auto')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to ingest manual lead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <UserPlusIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Manual Lead Intake & Engine Ingestion
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Enter lead inquiry details to run the automated scoring and distribution engine.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">First Name *</Label>
              <Input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Last Name *</Label>
              <Input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Lead Source</Label>
              <Select value={leadSource} onValueChange={(val) => val && setLeadSource(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual" className="text-xs">Direct Manual Entry</SelectItem>
                  <SelectItem value="phone_inquiry" className="text-xs">Phone Call / Inbound</SelectItem>
                  <SelectItem value="open_house" className="text-xs">Open House Visitor</SelectItem>
                  <SelectItem value="referral" className="text-xs">Client Referral</SelectItem>
                  <SelectItem value="walk_in" className="text-xs">Office Walk-In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assigned Agent</Label>
              <Select value={assignedAgentId} onValueChange={(val) => val && setAssignedAgentId(val)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs font-semibold text-primary">
                    ⚡ Auto-Route via Active Rules
                  </SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Property Interest / Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 1504 West Ave #200, Austin TX"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Estimated Budget / Price ($)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="650000"
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">ZIP Code</Label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="78701"
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Notes / Inquiry Message (Scored by Engine)</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Include intent keywords like 'pre-approved', 'cash buyer', 'relocating', etc."
              className="w-full rounded-md border border-border p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading} className="font-semibold gap-1.5">
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                  Ingesting Lead...
                </>
              ) : (
                'Ingest Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
