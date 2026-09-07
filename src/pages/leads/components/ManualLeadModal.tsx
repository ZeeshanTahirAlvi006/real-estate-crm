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
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'

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
      toast.error('First and Last name required')
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
        `Lead created! Score: ${contact.leadScore}/100`
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
      toast.error(err?.data?.message || 'Failed to ingest lead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] text-[#2B5748] dark:text-[#9CB080] border border-[#D8E2D6] dark:border-[#618764]/50">
              <MaterialIcon name="person_add" size={20} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
                Add Lead
              </DialogTitle>
              <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
                Enter lead details for automated routing
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">First Name *</Label>
              <Input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Last Name *</Label>
              <Input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Phone Number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Lead Source</Label>
              <Select value={leadSource} onValueChange={(val) => val && setLeadSource(val)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                  <SelectItem value="manual" className="text-xs">Manual Entry</SelectItem>
                  <SelectItem value="phone_inquiry" className="text-xs">Phone Call</SelectItem>
                  <SelectItem value="open_house" className="text-xs">Open House</SelectItem>
                  <SelectItem value="referral" className="text-xs">Referral</SelectItem>
                  <SelectItem value="walk_in" className="text-xs">Walk In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Assigned Agent</Label>
              <Select value={assignedAgentId} onValueChange={(val) => val && setAssignedAgentId(val)}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                  <SelectItem value="auto" className="text-xs font-semibold text-[#2B5748] dark:text-[#9CB080]">
                    Auto-Route
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
            <Label className="text-xs font-semibold text-[#273338] dark:text-white">Property Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 1504 West Ave #200"
              className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Budget / Price ($)</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="650000"
                className="h-8 font-mono text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">ZIP Code</Label>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="78701"
                className="h-8 font-mono text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-[#273338] dark:text-white">Notes / Message</Label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Inquiry message or notes..."
              className="w-full rounded-lg border border-[#D8E2D6] dark:border-[#618764]/60 bg-white dark:bg-[#1A2E26] p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#9CB080] text-[#273338] dark:text-white leading-relaxed"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 gap-1.5"
            >
              {isLoading ? (
                <>
                  <MaterialIcon name="refresh" size={14} className="animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                'Add Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ManualLeadModal
