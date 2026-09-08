import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { MaterialIcon } from '@/components/ui/MaterialIcon'
import type { DuplicatePair } from '@/types'

interface MergeContactModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  duplicatePair: DuplicatePair | null
  onConfirmMerge: (payload: {
    id: string
    primaryContactId: string
    secondaryContactId: string
    fieldOverrides?: Record<string, any>
  }) => Promise<void>
  isLoading?: boolean
}

export const MergeContactModal: React.FC<MergeContactModalProps> = ({
  open,
  onOpenChange,
  duplicatePair,
  onConfirmMerge,
  isLoading = false,
}) => {
  if (!duplicatePair) return null

  const { contact1, contact2, matchScore, matchFields } = duplicatePair

  // Default: contact1 is primary (older record)
  const [primaryId, setPrimaryId] = useState(contact1.id)
  const isC1Primary = primaryId === contact1.id

  const primary = isC1Primary ? contact1 : contact2
  const secondary = isC1Primary ? contact2 : contact1

  // Field selection state
  const [selectedFirstName, setSelectedFirstName] = useState(primary.firstName)
  const [selectedLastName, setSelectedLastName] = useState(primary.lastName)
  const [selectedEmail, setSelectedEmail] = useState(primary.email)
  const [selectedPhone, setSelectedPhone] = useState(primary.phone)
  const [selectedAddress, setSelectedAddress] = useState(primary.address || secondary.address || '')
  const [selectedCity, setSelectedCity] = useState(primary.city || secondary.city || '')
  const [selectedState, setSelectedState] = useState(primary.state || secondary.state || '')
  const [selectedZip, setSelectedZip] = useState(primary.zipCode || secondary.zipCode || '')

  // Sync on modal open
  useEffect(() => {
    if (duplicatePair) {
      setPrimaryId(duplicatePair.contact1.id)
      setSelectedFirstName(duplicatePair.contact1.firstName)
      setSelectedLastName(duplicatePair.contact1.lastName)
      setSelectedEmail(duplicatePair.contact1.email)
      setSelectedPhone(duplicatePair.contact1.phone)
      setSelectedAddress(duplicatePair.contact1.address || duplicatePair.contact2.address || '')
      setSelectedCity(duplicatePair.contact1.city || duplicatePair.contact2.city || '')
      setSelectedState(duplicatePair.contact1.state || duplicatePair.contact2.state || '')
      setSelectedZip(duplicatePair.contact1.zipCode || duplicatePair.contact2.zipCode || '')
    }
  }, [duplicatePair, open])

  const totalDeals = ((contact1 as any).dealCount || 0) + ((contact2 as any).dealCount || 0)
  const totalActivities = ((contact1 as any).activityCount || 0) + ((contact2 as any).activityCount || 0)

  const handleMergeSubmit = async () => {
    await onConfirmMerge({
      id: duplicatePair.id,
      primaryContactId: primary.id,
      secondaryContactId: secondary.id,
      fieldOverrides: {
        firstName: selectedFirstName,
        lastName: selectedLastName,
        email: selectedEmail,
        phone: selectedPhone,
        address: selectedAddress,
        city: selectedCity,
        state: selectedState,
        zipCode: selectedZip,
      },
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto border border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#254238] rounded-2xl shadow-xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-[#273338] dark:text-white">
              <MaterialIcon name="call_merge" size={20} className="text-[#2B5748] dark:text-[#9CB080]" />
              <span>Merge Contacts</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-mono font-bold"
            >
              {matchScore}% Match ({matchFields.join(', ')})
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[#75887E] dark:text-[#A0B2A6]">
            Compare records and select which values to keep. Deals and timeline history automatically merge into the primary record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Primary Record Selection Switcher */}
          <div className="p-3 rounded-xl bg-[#F5F7F4] dark:bg-[#1E282D] border border-[#D8E2D6] dark:border-[#618764]/30 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6] block">
              Primary Record (Retained identity)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPrimaryId(contact1.id)
                  setSelectedFirstName(contact1.firstName)
                  setSelectedLastName(contact1.lastName)
                  setSelectedEmail(contact1.email)
                  setSelectedPhone(contact1.phone)
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isC1Primary
                    ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] shadow-xs'
                    : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#254238] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#273338] dark:text-white">Record A</span>
                  {isC1Primary && <MaterialIcon name="check_circle" size={16} className="text-[#2B5748] dark:text-[#9CB080]" />}
                </div>
                <p className="text-[#273338] dark:text-white font-medium">{contact1.firstName} {contact1.lastName}</p>
                <p className="text-[#75887E] dark:text-[#A0B2A6] font-mono text-[11px] truncate">{contact1.phone || contact1.email}</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrimaryId(contact2.id)
                  setSelectedFirstName(contact2.firstName)
                  setSelectedLastName(contact2.lastName)
                  setSelectedEmail(contact2.email)
                  setSelectedPhone(contact2.phone)
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  !isC1Primary
                    ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] shadow-xs'
                    : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#254238] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#273338] dark:text-white">Record B</span>
                  {!isC1Primary && <MaterialIcon name="check_circle" size={16} className="text-[#2B5748] dark:text-[#9CB080]" />}
                </div>
                <p className="text-[#273338] dark:text-white font-medium">{contact2.firstName} {contact2.lastName}</p>
                <p className="text-[#75887E] dark:text-[#A0B2A6] font-mono text-[11px] truncate">{contact2.phone || contact2.email}</p>
              </button>
            </div>
          </div>

          {/* Impacted Assets Summary */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#EDF2EB] dark:bg-[#1A2E26] border border-[#D8E2D6] dark:border-[#618764]/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#254238] text-[#2B5748] dark:text-[#9CB080] flex items-center justify-center border border-[#D8E2D6] dark:border-[#618764]/30">
                <MaterialIcon name="business_center" size={16} />
              </div>
              <div>
                <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block uppercase font-semibold">Active Deals</span>
                <span className="font-bold text-[#273338] dark:text-white font-mono">{totalDeals} Deals</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#254238] text-emerald-600 dark:text-[#9CB080] flex items-center justify-center border border-[#D8E2D6] dark:border-[#618764]/30">
                <MaterialIcon name="schedule" size={16} />
              </div>
              <div>
                <span className="text-[10px] text-[#75887E] dark:text-[#A0B2A6] block uppercase font-semibold">Activities</span>
                <span className="font-bold text-[#273338] dark:text-white font-mono">{totalActivities} Logs</span>
              </div>
            </div>
          </div>

          <Separator className="bg-[#D8E2D6] dark:bg-[#618764]/30" />

          {/* Field-by-Field Comparator & Pickers */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#75887E] dark:text-[#A0B2A6] block">
              Field Resolution (Click winning value)
            </span>

            {/* Name Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Full Name</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFirstName(contact1.firstName)
                    setSelectedLastName(contact1.lastName)
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedFirstName === contact1.firstName && selectedLastName === contact1.lastName
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact1.firstName} {contact1.lastName}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFirstName(contact2.firstName)
                    setSelectedLastName(contact2.lastName)
                  }}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedFirstName === contact2.firstName && selectedLastName === contact2.lastName
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact2.firstName} {contact2.lastName}
                </button>
              </div>
            </div>

            {/* Email Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Email</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEmail(contact1.email)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all cursor-pointer ${
                    selectedEmail === contact1.email
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact1.email || '(Empty)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEmail(contact2.email)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all cursor-pointer ${
                    selectedEmail === contact2.email
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact2.email || '(Empty)'}
                </button>
              </div>
            </div>

            {/* Phone Picker */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Phone</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPhone(contact1.phone)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all cursor-pointer ${
                    selectedPhone === contact1.phone
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact1.phone || '(Empty)'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhone(contact2.phone)}
                  className={`p-2 rounded-lg border text-left text-xs font-mono truncate transition-all cursor-pointer ${
                    selectedPhone === contact2.phone
                      ? 'border-[#2B5748] dark:border-[#9CB080] bg-[#EDF2EB] dark:bg-[#1A2E26] font-semibold text-[#273338] dark:text-white'
                      : 'border-[#D8E2D6] dark:border-[#618764]/30 bg-white dark:bg-[#202B2F] text-[#75887E] dark:text-[#A0B2A6]'
                  }`}
                >
                  {contact2.phone || '(Empty)'}
                </button>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-[#273338] dark:text-white">Address</Label>
              <Input
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                placeholder="Street address..."
                className="h-8 text-xs border-[#D8E2D6] dark:border-[#618764]/40 bg-white dark:bg-[#202B2F]"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#D8E2D6] dark:border-[#618764]/30">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="border-[#D8E2D6] dark:border-[#618764]/40 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={handleMergeSubmit}
            className="gap-1.5 font-bold shadow-xs bg-[#2B5748] hover:bg-[#24463a] text-white text-xs cursor-pointer"
          >
            {isLoading ? (
              <>
                <MaterialIcon name="sync" size={15} className="animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <MaterialIcon name="call_merge" size={15} />
                Confirm Merge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
