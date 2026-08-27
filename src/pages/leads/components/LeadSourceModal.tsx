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
import { toast } from 'sonner'
import { PlusIcon, TrashIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import type { LeadSource, LeadSourceType } from '@/types'

interface LeadSourceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadSource?: LeadSource | null
}

const SOURCE_OPTIONS: { type: LeadSourceType; label: string; icon: string; desc: string }[] = [
  { type: 'zillow', label: 'Zillow Premier Agent', icon: '🔵', desc: 'Inbound buyer & seller webhooks' },
  { type: 'realtor', label: 'Realtor.com Leads', icon: '🔴', desc: 'Listing inquiry payloads' },
  { type: 'meta_ads', label: 'Meta Lead Ads (FB/IG)', icon: '🟣', desc: 'Instant Form submissions' },
  { type: 'google_ads', label: 'Google Ads', icon: '🟢', desc: 'Click-to-lead & form extensions' },
  { type: 'website', label: 'Website Capture Widget', icon: '🌐', desc: 'Public embeddable capture form' },
  { type: 'webhook', label: 'Custom Universal Webhook', icon: '⚡', desc: 'Generic JSON payload receiver' },
  { type: 'manual', label: 'Manual Intake', icon: '📝', desc: 'Direct agent/staff lead input' },
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
      toast.error('Please enter a source name')
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
        toast.success(`Lead source "${name}" updated!`)
      } else {
        await createSource({
          name: name.trim(),
          type,
          isActive,
          config: { fieldMapping: mappingObj },
        }).unwrap()
        toast.success(`Lead source "${name}" created with secure webhook credentials!`)
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save lead source')
    }
  }

  const isLoading = isCreating || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {leadSource ? 'Edit Lead Source' : 'Connect New Lead Source'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Configure integration endpoints, webhook security, and parameter mappings for incoming leads.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Source Provider Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source Provider</Label>
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
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    type === opt.type
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary'
                      : 'border-border/70 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{opt.icon}</span>
                    <span className="font-semibold text-xs text-foreground truncate">{opt.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Source Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Source Label / Identifier</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zillow Austin Premier Ads"
              required
              className="h-9 text-xs"
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
            <div>
              <Label className="text-xs font-semibold">Active & Ingesting</Label>
              <p className="text-[11px] text-muted-foreground">
                When enabled, incoming webhook payloads to this source will be accepted and processed.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Custom Field Mappings */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Custom Field Mappings (Optional)</Label>
                <p className="text-[11px] text-muted-foreground">
                  Map non-standard webhook payload keys to CRM contact fields.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddFieldMapping}
                className="h-7 text-xs gap-1"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Mapping
              </Button>
            </div>

            {fieldMappings.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {fieldMappings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={m.sourceKey}
                      onChange={(e) => handleUpdateMapping(idx, 'sourceKey', e.target.value)}
                      placeholder="Incoming key (e.g. buyer_email)"
                      className="h-8 text-xs font-mono flex-1"
                    />
                    <span className="text-muted-foreground text-xs font-bold">→</span>
                    <Select
                      value={m.targetKey}
                      onValueChange={(val) => val && handleUpdateMapping(idx, 'targetKey', val)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="CRM Field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firstName" className="text-xs">First Name</SelectItem>
                        <SelectItem value="lastName" className="text-xs">Last Name</SelectItem>
                        <SelectItem value="email" className="text-xs">Email Address</SelectItem>
                        <SelectItem value="phone" className="text-xs">Phone Number</SelectItem>
                        <SelectItem value="propertyAddress" className="text-xs">Property Address</SelectItem>
                        <SelectItem value="propertyPrice" className="text-xs">Property Price</SelectItem>
                        <SelectItem value="zipCode" className="text-xs">ZIP Code</SelectItem>
                        <SelectItem value="message" className="text-xs">Inquiry Message</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFieldMapping(idx)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-dashed border-border/70 text-[11px] text-muted-foreground">
                <InformationCircleIcon className="w-4 h-4 shrink-0 text-primary" />
                <span>The universal parser auto-detects common field names (name, email, phone, address, price, notes) automatically.</span>
              </div>
            )}
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
              {isLoading ? 'Saving...' : leadSource ? 'Save Changes' : 'Create Lead Source'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
