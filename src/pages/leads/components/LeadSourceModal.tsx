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
  onCreated?: (source: LeadSource) => void
}

export interface SourceOption {
  type: LeadSourceType
  label: string
  icon: string
  desc: string
  isAvailable: boolean
}

export const ACTIVE_SOURCE_TYPES: LeadSourceType[] = ['google_ads', 'whatsapp', 'website']

export const SOURCE_OPTIONS: SourceOption[] = [
  { type: 'zameen', label: 'Zameen.com', icon: 'domain', desc: 'Pakistan #1 portal inquiries', isAvailable: false },
  { type: 'graana', label: 'Graana.com', icon: 'apartment', desc: 'Smart real estate portal leads', isAvailable: false },
  { type: 'olx', label: 'OLX Pakistan', icon: 'storefront', desc: 'Classifieds & buyer chat inquiries', isAvailable: false },
  { type: 'meta_ads', label: 'Meta Ads', icon: 'campaign', desc: 'Facebook & Instagram Instant forms', isAvailable: false },
  { type: 'google_ads', label: 'Google Ads', icon: 'ads_click', desc: 'Lead form extensions & Search ads', isAvailable: true },
  { type: 'whatsapp', label: 'WhatsApp', icon: 'chat', desc: 'Click-to-chat & messaging leads', isAvailable: true },
  { type: 'website', label: 'Website Widget', icon: 'language', desc: 'Embeddable capture form', isAvailable: true },
  { type: 'webhook', label: 'Universal Webhook', icon: 'webhook', desc: 'Generic JSON receiver', isAvailable: false },
  { type: 'manual', label: 'Manual Intake', icon: 'edit_note', desc: 'Direct agent phone or walk-in', isAvailable: false },
]

export const LeadSourceModal: React.FC<LeadSourceModalProps> = ({
  open,
  onOpenChange,
  leadSource,
  onCreated,
}) => {
  const [createSource, { isLoading: isCreating }] = useCreateLeadSourceMutation()
  const [updateSource, { isLoading: isUpdating }] = useUpdateLeadSourceMutation()

  const [name, setName] = useState('')
  const [type, setType] = useState<LeadSourceType>('google_ads')
  const [isActive, setIsActive] = useState(true)
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [fieldMappings, setFieldMappings] = useState<{ sourceKey: string; targetKey: string }[]>([])

  useEffect(() => {
    if (leadSource) {
      setName(leadSource.name)
      setType(leadSource.type)
      setIsActive(leadSource.isActive)
      setAllowedDomains(leadSource.allowedDomains || [])
      setNewDomain('')
      const mappingEntries = leadSource.config?.fieldMapping
        ? Object.entries(leadSource.config.fieldMapping).map(([sourceKey, targetKey]) => ({
            sourceKey,
            targetKey,
          }))
        : []
      setFieldMappings(mappingEntries)
    } else {
      setName('')
      setType('google_ads')
      setIsActive(true)
      setAllowedDomains([])
      setNewDomain('')
      setFieldMappings([])
    }
  }, [leadSource, open])

  const handleAddDomain = () => {
    const trimmed = newDomain.trim().toLowerCase()
    if (!trimmed) return
    if (!allowedDomains.includes(trimmed)) {
      setAllowedDomains([...allowedDomains, trimmed])
    }
    setNewDomain('')
  }

  const handleRemoveDomain = (domainToRemove: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domainToRemove))
  }

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

    const selectedOption = SOURCE_OPTIONS.find((o) => o.type === type)
    if (selectedOption && !selectedOption.isAvailable && (!leadSource || leadSource.type !== type)) {
      toast.error(`${selectedOption.label} is coming soon and cannot be connected.`)
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
            allowedDomains: type === 'website' ? allowedDomains : undefined,
            config: { fieldMapping: mappingObj },
          },
        }).unwrap()
        toast.success(`Source "${name}" updated!`)
      } else {
        const created = await createSource({
          name: name.trim(),
          type,
          isActive,
          allowedDomains: type === 'website' ? allowedDomains : undefined,
          config: { fieldMapping: mappingObj },
        }).unwrap()
        toast.success(`Source "${name}" created!`)
        onOpenChange(false)
        if (onCreated && created) {
          onCreated(created)
        }
        return
      }
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save lead source')
    }
  }

  const isLoading = isCreating || isUpdating
  const selectedOption = SOURCE_OPTIONS.find((o) => o.type === type)
  const isCurrentTypeDisabled = Boolean(
    selectedOption && !selectedOption.isAvailable && (!leadSource || leadSource.type !== type)
  )

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
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-[#273338] dark:text-white">Source Provider</Label>
              <span className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                Google Ads &amp; WhatsApp active • Others coming soon
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SOURCE_OPTIONS.map((opt) => {
                const isSelected = type === opt.type
                const isAvailable = opt.isAvailable

                let borderAndBg = ''
                if (isSelected && isAvailable) {
                  borderAndBg = 'border-[#9CB080] bg-[#9CB080]/15 ring-2 ring-[#9CB080] cursor-pointer shadow-xs'
                } else if (isSelected && !isAvailable) {
                  borderAndBg = 'border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/40 opacity-80 cursor-not-allowed select-none'
                } else if (!isAvailable) {
                  borderAndBg = 'opacity-60 bg-[#EDF2EB]/30 dark:bg-[#1A2E26]/30 border-dashed border-[#D8E2D6] dark:border-[#618764]/30 cursor-not-allowed select-none'
                } else {
                  borderAndBg = 'border-[#D8E2D6] dark:border-[#618764]/40 hover:bg-[#EDF2EB]/50 dark:hover:bg-[#1A2E26] cursor-pointer'
                }

                return (
                  <button
                    type="button"
                    key={opt.type}
                    disabled={!isAvailable}
                    aria-disabled={!isAvailable}
                    tabIndex={isAvailable ? 0 : -1}
                    title={!isAvailable ? `${opt.label} is coming soon and cannot be connected.` : undefined}
                    onClick={() => {
                      if (!isAvailable) return
                      setType(opt.type)
                      if (!name || SOURCE_OPTIONS.some((o) => o.label === name)) {
                        setName(opt.label)
                      }
                    }}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all min-h-[86px] ${borderAndBg}`}
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-1.5 min-w-0 w-full mb-1">
                        <MaterialIcon
                          name={opt.icon}
                          size={16}
                          className={
                            isAvailable
                              ? 'text-[#2B5748] dark:text-[#9CB080] shrink-0'
                              : 'text-[#75887E]/70 dark:text-[#A0B2A6]/60 shrink-0'
                          }
                        />
                        <span
                          className={`font-bold text-xs truncate flex-1 ${
                            isAvailable ? 'text-[#273338] dark:text-white' : 'text-[#75887E] dark:text-[#A0B2A6]'
                          }`}
                          title={opt.label}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] line-clamp-1 block">
                        {opt.desc}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center">
                      {!isAvailable ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                          <MaterialIcon name="schedule" size={11} className="text-amber-600 dark:text-amber-400" />
                          Coming Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Source Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#273338] dark:text-white">Source Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Google Ads Campaign or WhatsApp Sales"
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

          {/* Allowed Domains (Origin Restriction for Website Widget) */}
          {type === 'website' && (
            <div className="space-y-2 pt-1 border-t border-[#D8E2D6] dark:border-[#618764]/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-[#273338] dark:text-white">
                    Allowed Domains
                  </Label>
                  <p className="text-[11px] text-[#75887E] dark:text-[#A0B2A6]">
                    Restrict submissions to trusted websites. Leave empty to allow any website.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddDomain()
                    }
                  }}
                  placeholder="e.g. example.com or *.mysite.com"
                  className="h-8 text-xs bg-white dark:bg-[#1A2E26] border-[#D8E2D6] dark:border-[#618764]/60 text-[#273338] dark:text-white flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDomain}
                  className="h-8 text-xs px-3 border-[#D8E2D6] dark:border-[#618764]/60 cursor-pointer"
                >
                  <MaterialIcon name="add" size={14} className="mr-1" />
                  Add
                </Button>
              </div>

              {allowedDomains.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allowedDomains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-[#9CB080]/15 border border-[#9CB080]/40 text-[#273338] dark:text-[#D8E2D6] font-mono"
                    >
                      <span>{domain}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        className="text-[#75887E] hover:text-red-500 cursor-pointer"
                      >
                        <MaterialIcon name="close" size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <MaterialIcon name="public" size={14} className="shrink-0" />
                  <span>Submissions allowed from any origin (open embed).</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Field Mappings (for webhooks and other integrations) */}
          {type !== 'website' && (
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
          )}

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
              disabled={isLoading || isCurrentTypeDisabled}
              className="bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-bold text-xs h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
