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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useCreateLeadSourceMutation,
  useUpdateLeadSourceMutation,
} from '@/store/api/leadsApi'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import { toast } from 'sonner'
import type { LeadSource, LeadSourceType } from '@/types'

interface LeadSourceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadSource?: LeadSource | null
}

const SOURCE_OPTIONS: { type: LeadSourceType; label: string; icon: string; desc: string }[] = [
  { type: 'zillow', label: 'Zillow', icon: 'home', desc: 'Inbound buyer webhooks' },
  { type: 'realtor', label: 'Realtor.com', icon: 'apartment', desc: 'Listing inquiry payloads' },
  { type: 'meta_ads', label: 'Meta Ads', icon: 'campaign', desc: 'Instant form leads' },
  { type: 'google_ads', label: 'Google Ads', icon: 'ads_click', desc: 'Search ad leads' },
  { type: 'website', label: 'Website Widget', icon: 'language', desc: 'Embeddable capture form' },
  { type: 'webhook', label: 'Universal Webhook', icon: 'webhook', desc: 'Generic JSON receiver' },
  { type: 'manual', label: 'Manual Intake', icon: 'edit_note', desc: 'Direct agent input' },
]

export const LeadSourceModal: React.FC<LeadSourceModalProps> = ({
  open,
  onOpenChange,
  leadSource,
}) => {
  const [createSource, { isLoading: isCreating }] = useCreateLeadSourceMutation()
  const [updateSource, { isLoading: isUpdating }] = useUpdateLeadSourceMutation()

  const [name, setName] = useState('')
  const [type, setType] = useState<LeadSourceType>('zillow')
  const [isActive, setIsActive] = useState(true)
  const [fieldMappings, setFieldMappings] = useState<{ sourceKey: string; targetKey: string }[]>([])

  useEffect(() => {
    if (leadSource) {
      setName(leadSource.name)
      setType(leadSource.type)
      setIsActive(leadSource.isActive)
      const mappingEntries = leadSource.config?.fieldMapping
        ? Object.entries(leadSource.config.fieldMapping).map(([sourceKey, targetKey]) => ({
            sourceKey,
            targetKey,
          }))
        : []
      setFieldMappings(mappingEntries)
    } else {
      setName('')
      setType('zillow')
      setIsActive(true)
      setFieldMappings([])
    }
  }, [leadSource, open])

  const handleAddFieldMapping = () => {
    setFieldMappings([...fieldMappings, { sourceKey: '', targetKey: 'email' }])
  }

  const handleRemoveFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index))
  }

  const handleUpdateMapping = (index: number, field: 'sourceKey' | 'targetKey', val: string) => {
    const updated = [...fieldMappings]
    updated[index][field] = val
    setFieldMappings(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Source name is required')
      return
    }

    const mappingObj: Record<string, string> = {}
    fieldMappings.forEach((m) => {
      if (m.sourceKey.trim() && m.targetKey.trim()) {
        mappingObj[m.sourceKey.trim()] = m.targetKey.trim()
      }
    })

    try {
      if (leadSource) {
        await updateSource({
          id: leadSource.id,
          data: {
            name: name.trim(),
            type,
            isActive,
            config: { fieldMapping: mappingObj },
          },
        }).unwrap()
        toast.success(`Source "${name}" updated!`)
      } else {
        await createSource({
          name: name.trim(),
          type,
          isActive,
          config: { fieldMapping: mappingObj },
        }).unwrap()
        toast.success(`Source "${name}" created!`)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save lead source')
    }
  }

  const isLoading = isCreating || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-[#273338] dark:text-white">
            {leadSource ? 'Edit Lead Source' : 'Connect Lead Source'}
          </DialogTitle>
          <p className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
            Configure webhook credentials and parameter mappings.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Source Provider Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#273338] dark:text-white">Source Provider</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.type}
                  onClick={() => {
                    setType(opt.type)
                    if (!name || SOURCE_OPTIONS.some((o) => o.label === name)) {
                      setName(opt.label)
                    }
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    type === opt.type
                      ? 'border-[#9CB080] bg-[#9CB080]/15 ring-1 ring-[#9CB080]'
                      : 'border-[#D8E2D6] dark:border-[#618764]/40 hover:bg-[#EDF2EB]/50 dark:hover:bg-[#1A2E26]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MaterialIcon name={opt.icon} size={16} className="text-[#2B5748] dark:text-[#9CB080]" />
                    <span className="font-bold text-xs text-[#273338] dark:text-white truncate">{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] mt-0.5 line-clamp-1">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Source Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#273338] dark:text-white">Source Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zillow Premier"
              required
              className="h-9 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF2EB]/50 dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
            <div>
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Active Ingestion</Label>
              <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                Incoming webhook payloads will be processed.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Custom Field Mappings */}
          <div className="space-y-2 pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-[#273338] dark:text-white">Field Mappings</Label>
                <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                  Map payload keys to contact fields.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFieldMapping}
                className="h-7 text-xs gap-1 border-[#D8E2D6] dark:border-[#618764]/60"
              >
                <MaterialIcon name="add" size={14} />
                <span>Add Field</span>
              </Button>
            </div>

            {fieldMappings.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {fieldMappings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={m.sourceKey}
                      onChange={(e) => handleUpdateMapping(idx, 'sourceKey', e.target.value)}
                      placeholder="Payload key (e.g. buyer_email)"
                      className="h-8 text-xs font-mono flex-1 bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white"
                    />
                    <span className="text-[#75887E] dark:text-[#A0B2A6] text-xs font-bold">→</span>
                    <Select
                      value={m.targetKey}
                      onValueChange={(val) => val && handleUpdateMapping(idx, 'targetKey', val)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1 bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white">
                        <SelectValue placeholder="CRM Field" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#202B2F] border-[#D8E2D6] dark:border-[#618764]">
                        <SelectItem value="firstName" className="text-xs">First Name</SelectItem>
                        <SelectItem value="lastName" className="text-xs">Last Name</SelectItem>
                        <SelectItem value="email" className="text-xs">Email</SelectItem>
                        <SelectItem value="phone" className="text-xs">Phone</SelectItem>
                        <SelectItem value="propertyAddress" className="text-xs">Address</SelectItem>
                        <SelectItem value="propertyPrice" className="text-xs">Price</SelectItem>
                        <SelectItem value="zipCode" className="text-xs">ZIP</SelectItem>
                        <SelectItem value="message" className="text-xs">Message</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFieldMapping(idx)}
                      className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 shrink-0"
                    >
                      <MaterialIcon name="delete" size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#EDF2EB]/50 dark:bg-[#1A2E26] border border-dashed border-[#D8E2D6] dark:border-[#618764]/40 text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                <MaterialIcon name="info" size={16} className="text-[#618764] shrink-0" />
                <span>Common fields (name, email, phone, address, price, notes) are auto-parsed.</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-[#D8E2D6] dark:border-[#618764]/40">
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
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4"
            >
              {isLoading ? 'Saving...' : leadSource ? 'Save Changes' : 'Connect Source'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LeadSourceModal
